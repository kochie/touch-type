"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import { metrics } from "./metrics";
import type { Json, Tables } from "@/types/supabase";
import { toast } from "sonner";

// Schema-missing codes only — RLS denial (42501) is a code bug, not a deploy
// bug, and must NOT be conflated with "apply migrations" here. The v4 design
// gates writes behind SECURITY DEFINER RPCs so direct INSERT/UPDATE on
// pvp_matches/pvp_games returns 42501 by design; flag it loudly as a code
// path that's still on the old schema rather than asking the user to migrate.
function isPvPSchemaUnavailable(err: {
  code?: string;
  message?: string;
}): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  if (code === "42P01" || code === "PGRST205") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("could not find");
}

// Types ----------------------------------------------------------------------

export type PvPStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

export type BestOf = 1 | 3 | 5 | 7;

export type PvPMatchRow = Tables<"pvp_matches">;
export type PvPRoundRow = Tables<"pvp_games">;

/** A pvp_matches row hydrated with its pvp_games rounds, sorted ascending. */
export interface PvPMatch extends PvPMatchRow {
  rounds: PvPRoundRow[];
}

/** Captured at create-time, locked into the match + rounds. */
export interface ChallengeSettings {
  keyboard: string;
  level: string;
  language: string;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
  best_of: BestOf;
  /** Exactly best_of arrays — one word_set per round. */
  word_sets: string[][];
}

/** Result of a single race round. */
export interface PvPRaceResult {
  cpm: number;
  correct: number;
  incorrect: number;
  time: string;
  key_presses?: unknown;
}

/** Active-race state — match + the specific round currently being raced. */
export interface PvPCurrentRace {
  match: PvPMatch;
  round: PvPRoundRow;
}

interface PvPContextType {
  // Derived state — categorised by what the current user can do next
  myActiveMatches: PvPMatch[];
  myAwaitingMatches: PvPMatch[];
  myCompletedMatches: PvPMatch[];
  isLoading: boolean;
  error: string | null;

  // Active race
  currentRace: PvPCurrentRace | null;
  /** Pick the next un-raced round for this user and enter race mode. */
  startRace: (match: PvPMatch) => void;
  /** Local-only exit from the race UI; does NOT forfeit the match. */
  exitRace: () => void;
  /** Submit the current round; advances to the next round if any remain. */
  completeRound: (result: PvPRaceResult) => Promise<PvPMatch | null>;

  // Mutations (RPC-backed)
  createMatch: (
    settings: ChallengeSettings,
    message?: string,
  ) => Promise<PvPMatch | null>;
  joinMatchByCode: (inviteCode: string) => Promise<PvPMatch | null>;
  cancelMatch: (matchId: string) => Promise<boolean>;
  forfeitMatch: (matchId: string) => Promise<PvPMatch | null>;

  // Lookups
  fetchByInviteCode: (inviteCode: string) => Promise<PvPMatch | null>;
  fetchById: (id: string) => Promise<PvPMatch | null>;

  refresh: () => Promise<void>;
}

const PvPContext = createContext<PvPContextType | undefined>(undefined);

// Helpers --------------------------------------------------------------------

function sortRounds(rounds: PvPRoundRow[]): PvPRoundRow[] {
  return [...rounds].sort((a, b) => a.round_number - b.round_number);
}

function isTerminal(status: string | null | undefined): boolean {
  return status === "completed" || status === "cancelled" || status === "expired";
}

function mySlotCompletedAt(
  round: PvPRoundRow,
  match: PvPMatchRow,
  userId: string,
): string | null {
  if (match.creator_id === userId) return round.creator_completed_at;
  if (match.joiner_id === userId) return round.joiner_completed_at;
  return null;
}

/** Returns the lowest-numbered round this user hasn't raced yet, or null. */
function nextUnracedRound(
  match: PvPMatch,
  userId: string,
): PvPRoundRow | null {
  if (isTerminal(match.status)) return null;
  for (const r of match.rounds) {
    if (mySlotCompletedAt(r, match, userId) === null) return r;
  }
  return null;
}

function categoriseMatch(
  match: PvPMatch,
  userId: string,
): "active" | "awaiting" | "completed" {
  if (isTerminal(match.status)) return "completed";
  return nextUnracedRound(match, userId) ? "active" : "awaiting";
}

// Match + rounds is the canonical select shape — keep the join syntax in
// one place so every fetch path returns the same hydrated PvPMatch.
const MATCH_WITH_ROUNDS_SELECT = "*, rounds:pvp_games(*)";

interface RawMatchWithRounds extends PvPMatchRow {
  rounds: PvPRoundRow[] | null;
}

function hydrate(row: RawMatchWithRounds): PvPMatch {
  return { ...row, rounds: sortRounds(row.rounds ?? []) };
}

// Provider -------------------------------------------------------------------

export function PvPProvider({ children }: { children: ReactNode }) {
  const { supabase, user } = useSupabase();
  const [matches, setMatches] = useState<PvPMatch[]>([]);
  const [currentRace, setCurrentRace] = useState<PvPCurrentRace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state -----------------------------------------------------------
  const { myActiveMatches, myAwaitingMatches, myCompletedMatches } = useMemo(() => {
    if (!user) {
      return { myActiveMatches: [], myAwaitingMatches: [], myCompletedMatches: [] };
    }
    const active: PvPMatch[] = [];
    const awaiting: PvPMatch[] = [];
    const completed: PvPMatch[] = [];
    for (const m of matches) {
      switch (categoriseMatch(m, user.id)) {
        case "active":
          active.push(m);
          break;
        case "awaiting":
          awaiting.push(m);
          break;
        case "completed":
          completed.push(m);
          break;
      }
    }
    return {
      myActiveMatches: active,
      myAwaitingMatches: awaiting,
      myCompletedMatches: completed,
    };
  }, [matches, user]);

  // Refresh -----------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("pvp_matches")
        .select(MATCH_WITH_ROUNDS_SELECT)
        .or(`creator_id.eq.${user.id},joiner_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (fetchError) {
        if (isPvPSchemaUnavailable(fetchError)) {
          console.log("PvP tables not available yet");
          setMatches([]);
        } else {
          throw fetchError;
        }
      } else {
        setMatches((data ?? []).map((row) => hydrate(row as RawMatchWithRounds)));
      }
    } catch (err) {
      const detail =
        err && typeof err === "object"
          ? {
              code: (err as { code?: string }).code,
              message: (err as { message?: string }).message,
              details: (err as { details?: string }).details,
              hint: (err as { hint?: string }).hint,
            }
          : err;
      console.error("Error fetching matches:", detail);
      setError(
        err instanceof Error
          ? err.message
          : (detail as { message?: string })?.message ?? "Failed to fetch matches",
      );
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Shared error handler ----------------------------------------------------
  const handleMutationError = useCallback(
    (err: unknown, fallback: string): null => {
      if (
        isPvPSchemaUnavailable(err as { code?: string; message?: string })
      ) {
        const msg =
          "PvP tables aren't available yet — try again in a moment, or contact support if this persists.";
        console.warn(msg, err);
        toast.error(msg);
        setError(msg);
        return null;
      }
      const detail =
        err && typeof err === "object"
          ? {
              code: (err as { code?: string }).code,
              message: (err as { message?: string }).message,
              details: (err as { details?: string }).details,
              hint: (err as { hint?: string }).hint,
            }
          : err;
      console.error("PvP mutation error:", detail);
      const message =
        err instanceof Error
          ? err.message
          : (detail as { message?: string })?.message ?? fallback;
      toast.error(message);
      setError(message);
      return null;
    },
    [],
  );

  // Initial fetch + auth-change reload --------------------------------------
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: refetch on any change to a match where I'm a participant.
  // The DB-side triggers (advance_pvp_match on round submit) update
  // pvp_matches.updated_at, which fires this event — that's how the inactive
  // side learns the opponent finished their round.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`pvp-matches-${user.id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "pvp_matches",
          filter: `creator_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "pvp_matches",
          filter: `joiner_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refresh]);

  // Mutations ---------------------------------------------------------------
  const createMatch = useCallback(
    async (
      settings: ChallengeSettings,
      message?: string,
    ): Promise<PvPMatch | null> => {
      if (!user) {
        setError("Must be logged in to create a match");
        return null;
      }
      if (settings.word_sets.length !== settings.best_of) {
        return handleMutationError(
          new Error(
            `Expected ${settings.best_of} word sets, got ${settings.word_sets.length}`,
          ),
          "Failed to create match",
        );
      }

      try {
        const { data, error: rpcError } = await supabase.rpc("create_match", {
          _keyboard: settings.keyboard,
          _level: settings.level,
          _language: settings.language,
          _capital: settings.capital,
          _punctuation: settings.punctuation,
          _numbers: settings.numbers,
          _best_of: settings.best_of,
          _word_sets: settings.word_sets as unknown as Json,
          ...(message ? { _message: message } : {}),
        });
        if (rpcError) throw rpcError;
        const matchRow = data as PvPMatchRow | null;
        if (!matchRow) return null;

        metrics.count("pvp.match_created", 1, {
          language: settings.language,
          level: settings.level,
          keyboard: settings.keyboard,
          best_of: String(settings.best_of),
        });

        // RPC returns only the match row; pull the rounds it created so
        // callers get a fully-hydrated PvPMatch back.
        const hydrated = await fetchById(matchRow.id);
        await refresh();
        return hydrated;
      } catch (err) {
        return handleMutationError(err, "Failed to create match");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, supabase, refresh, handleMutationError],
  );

  const joinMatchByCode = useCallback(
    async (inviteCode: string): Promise<PvPMatch | null> => {
      if (!user) {
        setError("Must be logged in to join a match");
        return null;
      }
      try {
        const { data, error: rpcError } = await supabase.rpc(
          "join_match_by_invite",
          { _code: inviteCode },
        );
        if (rpcError) throw rpcError;
        const matchRow = data as PvPMatchRow | null;
        if (!matchRow) return null;
        metrics.count("pvp.match_joined");
        const hydrated = await fetchById(matchRow.id);
        await refresh();
        return hydrated;
      } catch (err) {
        return handleMutationError(err, "Failed to join match");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, supabase, refresh, handleMutationError],
  );

  const cancelMatch = useCallback(
    async (matchId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const { error: rpcError } = await supabase.rpc("cancel_match", {
          _match_id: matchId,
        });
        if (rpcError) throw rpcError;
        metrics.count("pvp.match_cancelled");
        await refresh();
        return true;
      } catch (err) {
        handleMutationError(err, "Failed to cancel match");
        return false;
      }
    },
    [user, supabase, refresh, handleMutationError],
  );

  const forfeitMatch = useCallback(
    async (matchId: string): Promise<PvPMatch | null> => {
      if (!user) return null;
      try {
        const { data, error: rpcError } = await supabase.rpc("forfeit_match", {
          _match_id: matchId,
        });
        if (rpcError) throw rpcError;
        const matchRow = data as PvPMatchRow | null;
        if (!matchRow) return null;
        metrics.count("pvp.match_forfeited");
        const hydrated = await fetchById(matchRow.id);
        await refresh();
        return hydrated;
      } catch (err) {
        return handleMutationError(err, "Failed to forfeit match");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, supabase, refresh, handleMutationError],
  );

  // Race lifecycle ----------------------------------------------------------
  const startRace = useCallback(
    (match: PvPMatch) => {
      if (!user) return;
      const round = nextUnracedRound(match, user.id);
      if (!round) {
        toast.error("No rounds left to race in this match");
        return;
      }
      setCurrentRace({ match, round });
    },
    [user],
  );

  const exitRace = useCallback(() => {
    setCurrentRace(null);
  }, []);

  const completeRound = useCallback(
    async (result: PvPRaceResult): Promise<PvPMatch | null> => {
      if (!user || !currentRace) return null;

      const { match, round } = currentRace;
      try {
        const { error: rpcError } = await supabase.rpc("submit_round_result", {
          _match_id: match.id,
          _round_number: round.round_number,
          _cpm: result.cpm,
          _correct: result.correct,
          _incorrect: result.incorrect,
          _time: result.time,
          _key_presses: (result.key_presses ?? null) as unknown as Json,
        });
        if (rpcError) throw rpcError;
        metrics.count("pvp.round_submitted", 1, {
          round: String(round.round_number),
          best_of: String(match.best_of),
        });

        const updated = await fetchById(match.id);
        await refresh();

        // Auto-advance to the next un-raced round if the match isn't done
        // yet AND there's a round we can race now. Otherwise drop out of
        // race mode so the consumer can navigate to the results page.
        if (updated && !isTerminal(updated.status)) {
          const next = nextUnracedRound(updated, user.id);
          if (next) {
            setCurrentRace({ match: updated, round: next });
            return updated;
          }
        }
        setCurrentRace(null);
        return updated;
      } catch (err) {
        return handleMutationError(err, "Failed to submit round result");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, supabase, currentRace, refresh, handleMutationError],
  );

  // Lookups -----------------------------------------------------------------
  const fetchByInviteCode = useCallback(
    async (inviteCode: string): Promise<PvPMatch | null> => {
      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_match_by_invite_code",
          { _code: inviteCode },
        );
        if (rpcError) {
          console.error("Error fetching match by invite code:", rpcError);
          return null;
        }
        const rows = (data ?? []) as PvPMatchRow[];
        const matchRow = rows[0] ?? null;
        if (!matchRow) return null;

        // get_match_by_invite_code returns the match row only. Fetch rounds
        // via direct SELECT — round_select RLS lets non-participants read
        // them as long as the match is still open + unjoined, which is the
        // exact state any code-shared invitee sees.
        const { data: roundsData, error: roundsError } = await supabase
          .from("pvp_games")
          .select("*")
          .eq("match_id", matchRow.id);
        if (roundsError) {
          console.error("Error fetching rounds:", roundsError);
          return { ...matchRow, rounds: [] };
        }
        return { ...matchRow, rounds: sortRounds(roundsData ?? []) };
      } catch (err) {
        console.error("Error fetching match by invite code:", err);
        return null;
      }
    },
    [supabase],
  );

  const fetchById = useCallback(
    async (id: string): Promise<PvPMatch | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("pvp_matches")
          .select(MATCH_WITH_ROUNDS_SELECT)
          .eq("id", id)
          .maybeSingle();
        if (fetchError) {
          console.error("Error fetching match by id:", fetchError);
          return null;
        }
        if (!data) return null;
        return hydrate(data as RawMatchWithRounds);
      } catch (err) {
        console.error("Error fetching match by id:", err);
        return null;
      }
    },
    [supabase],
  );

  const value: PvPContextType = {
    myActiveMatches,
    myAwaitingMatches,
    myCompletedMatches,
    isLoading,
    error,
    currentRace,
    startRace,
    exitRace,
    completeRound,
    createMatch,
    joinMatchByCode,
    cancelMatch,
    forfeitMatch,
    fetchByInviteCode,
    fetchById,
    refresh,
  };

  return (
    <PvPContext.Provider value={value}>{children}</PvPContext.Provider>
  );
}

export function usePvP(): PvPContextType {
  const ctx = useContext(PvPContext);
  if (!ctx) throw new Error("usePvP must be used within a PvPProvider");
  return ctx;
}

// Stat helpers consumers can lean on so per-round CPM/winner aggregation
// doesn't get re-implemented in three different places.

/** This user's best per-round CPM across the match, or null if untyped. */
export function myBestCpmInMatch(
  match: PvPMatch,
  userId: string,
): number | null {
  const isCreator = match.creator_id === userId;
  let best: number | null = null;
  for (const r of match.rounds) {
    const cpm = isCreator ? r.creator_cpm : r.joiner_cpm;
    if (cpm == null) continue;
    if (best === null || cpm > best) best = cpm;
  }
  return best;
}

/** True if the given user is the one this round is waiting on. */
export function isMyTurnForRound(
  round: PvPRoundRow,
  match: PvPMatchRow,
  userId: string,
): boolean {
  return mySlotCompletedAt(round, match, userId) === null;
}

