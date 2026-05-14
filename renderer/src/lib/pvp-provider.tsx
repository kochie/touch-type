"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import { metrics } from "./metrics";
import type { Json, TablesInsert } from "@/types/supabase";
import { toast } from "sonner";

/**
 * Returns true when a Supabase fetch error indicates the PvP tables aren't
 * reachable — e.g. the migration hasn't been applied or PostgREST hasn't
 * reloaded its schema cache. Lets refreshGames render an empty state instead
 * of crashing.
 */
function isPvPSchemaUnavailable(err: {
  code?: string;
  message?: string;
}): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  if (
    code === "42P01" ||
    code === "42501" ||
    code === "PGRST205" ||
    code === "PGRST106" ||
    code === "PGRST301"
  ) {
    return true;
  }
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("could not find");
}

// Types ----------------------------------------------------------------------

export type PvPGameStatus = "open" | "completed" | "cancelled" | "expired";

/**
 * A pvp_games row. Both creator and joiner slots have identical shape; either
 * side may race first, both play blind, results revealed when both done.
 */
export interface PvPGame {
  id: string;
  invite_code: string;
  status: PvPGameStatus;

  keyboard: string;
  level: string;
  language: string;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
  word_set: string[];
  message: string | null;

  creator_id: string;
  creator_cpm: number | null;
  creator_correct: number | null;
  creator_incorrect: number | null;
  creator_time: string | null;
  creator_key_presses: unknown | null;
  creator_completed_at: string | null;

  joiner_id: string | null;
  joiner_cpm: number | null;
  joiner_correct: number | null;
  joiner_incorrect: number | null;
  joiner_time: string | null;
  joiner_key_presses: unknown | null;
  joiner_joined_at: string | null;
  joiner_completed_at: string | null;

  winner_id: string | null;

  expires_at: string;
  created_at: string;
  updated_at: string;
}

/** Settings + word_set captured at game creation, locked into the row. */
export interface ChallengeSettings {
  keyboard: string;
  level: string;
  language: string;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
  word_set: string[];
}

/** A finished race the player wants to record against the game's open slot. */
export interface PvPRaceResult {
  cpm: number;
  correct: number;
  incorrect: number;
  time: string;
  key_presses?: unknown;
}

/** Active race state — the home page reads this to enter PvP mode. */
export type PvPRaceMode = { game: PvPGame };

interface PvPContextType {
  // Derived state
  myActiveGames: PvPGame[]; // open games where I haven't raced yet
  myAwaitingGames: PvPGame[]; // open games where I've raced, partner hasn't
  myCompletedGames: PvPGame[]; // terminal: completed/cancelled/expired
  isLoading: boolean;
  error: string | null;

  // Active race
  currentRace: PvPRaceMode | null;
  startRace: (game: PvPGame) => void;
  forfeitRace: () => void;
  /** Submit the current race result; updates the caller's slot and clears state. */
  completeRace: (result: PvPRaceResult) => Promise<PvPGame | null>;

  // Mutations
  createGame: (
    settings: ChallengeSettings,
    message?: string,
  ) => Promise<PvPGame | null>;
  joinGame: (gameId: string) => Promise<PvPGame | null>;
  cancelGame: (gameId: string) => Promise<boolean>;

  // Lookups
  fetchByInviteCode: (inviteCode: string) => Promise<PvPGame | null>;
  fetchById: (id: string) => Promise<PvPGame | null>;

  // Refresh
  refreshGames: () => Promise<void>;
}

const PvPContext = createContext<PvPContextType | undefined>(undefined);

export function PvPProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<PvPGame[]>([]);
  const [currentRace, setCurrentRace] = useState<PvPRaceMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase, user } = useSupabase();

  // Derived state -----------------------------------------------------------
  const mySlotCompletedAt = (g: PvPGame): string | null => {
    if (!user) return null;
    if (g.creator_id === user.id) return g.creator_completed_at;
    if (g.joiner_id === user.id) return g.joiner_completed_at;
    return null;
  };
  const partnerSlotCompletedAt = (g: PvPGame): string | null => {
    if (!user) return null;
    if (g.creator_id === user.id) return g.joiner_completed_at;
    if (g.joiner_id === user.id) return g.creator_completed_at;
    return null;
  };

  const myActiveGames = games.filter(
    (g) => g.status === "open" && mySlotCompletedAt(g) === null,
  );
  const myAwaitingGames = games.filter(
    (g) =>
      g.status === "open" &&
      mySlotCompletedAt(g) !== null &&
      partnerSlotCompletedAt(g) === null,
  );
  const myCompletedGames = games.filter(
    (g) =>
      g.status === "completed" ||
      g.status === "cancelled" ||
      g.status === "expired",
  );

  // Refresh -----------------------------------------------------------------
  const refreshGames = useCallback(async () => {
    if (!user) {
      setGames([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("pvp_matches")
        .select("*")
        .or(`creator_id.eq.${user.id},joiner_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (fetchError) {
        if (isPvPSchemaUnavailable(fetchError)) {
          console.log("PvP tables not available yet");
          setGames([]);
        } else {
          throw fetchError;
        }
      } else {
        setGames((data as unknown as PvPGame[]) ?? []);
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
      console.error("Error fetching games:", detail);
      setError(
        err instanceof Error
          ? err.message
          : (detail as { message?: string })?.message ?? "Failed to fetch games",
      );
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Mutations ---------------------------------------------------------------
  const createGame = useCallback(
    async (
      settings: ChallengeSettings,
      message?: string,
    ): Promise<PvPGame | null> => {
      if (!user) {
        setError("Must be logged in to create games");
        return null;
      }

      try {
        const insertPayload = {
          creator_id: user.id,
          message: message ?? null,
          keyboard: settings.keyboard,
          level: settings.level,
          language: settings.language,
          capital: settings.capital,
          punctuation: settings.punctuation,
          numbers: settings.numbers,
        } as unknown as TablesInsert<"pvp_matches">;

        const { data, error: insertError } = await supabase
          .from("pvp_matches")
          .insert(insertPayload)
          .select()
          .single();

        if (insertError) throw insertError;
        metrics.count("pvp.match_created", 1, {
          language: settings.language,
          level: settings.level,
          keyboard: settings.keyboard,
        });
        await refreshGames();
        return data as unknown as PvPGame;
      } catch (err) {
        return handleMutationError(err, "Failed to create game");
      }
    },
    [user, supabase, refreshGames],
  );

  const joinGame = useCallback(
    async (gameId: string): Promise<PvPGame | null> => {
      if (!user) {
        setError("Must be logged in to join a game");
        return null;
      }

      try {
        // PostgREST re-applies request filters to the RETURNING result, so
        // adding precondition .eq()/.is()/.neq() filters that the UPDATE
        // itself flips ends up filtering out the row we just updated.
        // Race-safety lives in the RLS USING clause on the join policy
        // (status='open' AND joiner_id IS NULL AND auth.uid() != creator_id).
        const { data, error: updateError } = await supabase
          .from("pvp_matches")
          .update({
            joiner_id: user.id,
            joiner_joined_at: new Date().toISOString(),
          })
          .eq("id", gameId)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) {
          toast.error("Couldn't join — game already has a joiner or is closed");
          return null;
        }
        metrics.count("pvp.match_joined");
        await refreshGames();
        return data as unknown as PvPGame;
      } catch (err) {
        return handleMutationError(err, "Failed to join game");
      }
    },
    [user, supabase, refreshGames],
  );

  const cancelGame = useCallback(
    async (gameId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        // RLS "Creator can cancel" gates the UPDATE.
        const { data, error: updateError } = await supabase
          .from("pvp_matches")
          .update({ status: "cancelled" })
          .eq("id", gameId)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) {
          toast.error("Couldn't cancel — game state changed or not yours");
          return false;
        }
        metrics.count("pvp.match_cancelled");
        await refreshGames();
        return true;
      } catch (err) {
        handleMutationError(err, "Failed to cancel game");
        return false;
      }
    },
    [user, supabase, refreshGames],
  );

  // Race state --------------------------------------------------------------
  const startRace = useCallback((game: PvPGame) => {
    setCurrentRace({ game });
  }, []);

  const forfeitRace = useCallback(() => {
    if (currentRace) {
      metrics.count("pvp.match_forfeited", 1, {
        language: currentRace.game.language,
        level: currentRace.game.level,
      });
    }
    setCurrentRace(null);
  }, [currentRace]);

  const completeRace = useCallback(
    async (result: PvPRaceResult): Promise<PvPGame | null> => {
      if (!currentRace || !user) return null;
      const game = currentRace.game;
      const isCreator = game.creator_id === user.id;
      const isJoiner = game.joiner_id === user.id;

      if (!isCreator && !isJoiner) {
        // Shouldn't happen — Tracker only enters race mode for participants.
        setCurrentRace(null);
        return null;
      }

      const slotPrefix: "creator" | "joiner" = isCreator ? "creator" : "joiner";
      const updates = {
        [`${slotPrefix}_cpm`]: result.cpm,
        [`${slotPrefix}_correct`]: result.correct,
        [`${slotPrefix}_incorrect`]: result.incorrect,
        [`${slotPrefix}_time`]: result.time,
        [`${slotPrefix}_key_presses`]: (result.key_presses ?? null) as Json | null,
        [`${slotPrefix}_completed_at`]: new Date().toISOString(),
      };

      try {
        // RLS submit policies gate this — the slot's completed_at NULL check
        // is in the USING clause, so we don't repeat it here (would filter
        // the RETURNING row out after the update flipped it non-null).
        // Round results live in pvp_games (child rows); game.id is the match id.
        const { data, error: updateError } = await supabase
          .from("pvp_games")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(updates as any)
          .eq("match_id", game.id)
          .eq("round_number", 1)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        setCurrentRace(null);
        if (!data) {
          toast.error("Couldn't submit — game state changed");
          return null;
        }
        const totalPresses = result.correct + result.incorrect;
        const accuracy = totalPresses > 0 ? (result.correct / totalPresses) * 100 : 100;
        metrics.count("pvp.round_completed", 1, {
          language: game.language,
          level: game.level,
          role: isCreator ? "creator" : "joiner",
        });
        metrics.distribution("pvp.wpm", result.cpm / 5, "none", { language: game.language });
        metrics.distribution("pvp.accuracy", accuracy, "percent");
        await refreshGames();
        return data as unknown as PvPGame;
      } catch (err) {
        setCurrentRace(null);
        return handleMutationError(err, "Failed to submit result");
      }
    },
    [currentRace, user, supabase, refreshGames],
  );

  // Lookups -----------------------------------------------------------------
  const fetchByInviteCode = useCallback(
    async (inviteCode: string): Promise<PvPGame | null> => {
      try {
        const { data, error: rpcError } = await supabase
          .rpc("get_match_by_invite_code", { _code: inviteCode.toUpperCase() })
          .maybeSingle();

        if (rpcError) {
          console.error("Error fetching game by invite code:", rpcError);
          return null;
        }
        return (data as unknown as PvPGame | null) ?? null;
      } catch (err) {
        console.error("Error fetching game by invite code:", err);
        return null;
      }
    },
    [supabase],
  );

  const fetchById = useCallback(
    async (id: string): Promise<PvPGame | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("pvp_matches")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching game by id:", fetchError);
          return null;
        }
        return (data as unknown as PvPGame | null) ?? null;
      } catch (err) {
        console.error("Error fetching game by id:", err);
        return null;
      }
    },
    [supabase],
  );

  // Shared error handler ----------------------------------------------------
  function handleMutationError(err: unknown, fallback: string): null {
    if (
      isPvPSchemaUnavailable(err as { code?: string; message?: string })
    ) {
      const msg =
        "PvP isn't available yet — apply the latest migrations to your Supabase before using PvP.";
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
  }

  // Initial fetch + auth-change reload --------------------------------------
  useEffect(() => {
    refreshGames();
  }, [refreshGames]);

  // Realtime: refresh on any change to my games -----------------------------
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`pvp-games-${user.id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "pvp_matches",
          filter: `creator_id=eq.${user.id}`,
        },
        () => refreshGames(),
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
        () => refreshGames(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshGames]);

  const value: PvPContextType = {
    myActiveGames,
    myAwaitingGames,
    myCompletedGames,
    isLoading,
    error,
    currentRace,
    startRace,
    forfeitRace,
    completeRace,
    createGame,
    joinGame,
    cancelGame,
    fetchByInviteCode,
    fetchById,
    refreshGames,
  };

  return <PvPContext.Provider value={value}>{children}</PvPContext.Provider>;
}

export function usePvP(): PvPContextType {
  const ctx = useContext(PvPContext);
  if (!ctx) throw new Error("usePvP must be used within a PvPProvider");
  return ctx;
}
