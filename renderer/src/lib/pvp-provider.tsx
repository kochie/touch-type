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
import type { Json, TablesInsert } from "@/types/supabase";
import { toast } from "sonner";

/**
 * Returns true when a Supabase fetch error indicates the PvP tables/views
 * aren't reachable — e.g. the migration hasn't been applied, the view exists
 * but lacks SELECT grants, or PostgREST hasn't reloaded its schema cache.
 *
 * Codes covered:
 *   - 42P01     Postgres: relation does not exist
 *   - 42501     Postgres: insufficient privilege (e.g. missing GRANT on view)
 *   - PGRST205  PostgREST: schema cache miss / table not found
 *   - PGRST106  PostgREST: schema not in expose-schemas
 *   - PGRST301  PostgREST: JWT not yet propagated (transient on first sign-in)
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

export type PvPChallengeStatus =
  | "open"
  | "claimed"
  | "completed"
  | "expired"
  | "cancelled";

/** A row from pvp_challenges, augmented with a few derived/joined fields. */
export interface PvPChallenge {
  id: string;
  invite_code: string;
  status: PvPChallengeStatus;

  keyboard: string;
  level: string;
  language: string;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
  word_set: string[];

  challenger_id: string;
  challenger_cpm: number;
  challenger_correct: number;
  challenger_incorrect: number;
  challenger_time: string;
  challenger_key_presses: unknown | null;
  challenger_completed_at: string;
  challenger_message: string | null;

  opponent_id: string | null;
  opponent_cpm: number | null;
  opponent_correct: number | null;
  opponent_incorrect: number | null;
  opponent_time: string | null;
  opponent_key_presses: unknown | null;
  opponent_claimed_at: string | null;
  opponent_completed_at: string | null;

  winner_id: string | null;

  expires_at: string;
  created_at: string;
  updated_at: string;
}

/** What the challenger submits to create a challenge (after racing). */
export interface ChallengerResult {
  cpm: number;
  correct: number;
  incorrect: number;
  time: string;
  key_presses?: unknown;
  // Settings + word set come from the user's current settings + a freshly
  // generated word_set; createChallenge fills these in.
}

/** What an opponent submits to complete a claimed challenge. */
export interface OpponentResult {
  cpm: number;
  correct: number;
  incorrect: number;
  time: string;
  key_presses?: unknown;
}

interface PvPContextType {
  // Derived state
  myOpenChallenges: PvPChallenge[];
  myActiveChallenges: PvPChallenge[];
  myCompletedChallenges: PvPChallenge[];
  isLoading: boolean;
  error: string | null;

  // Mutations
  createChallenge: (
    result: ChallengerResult,
    settings: ChallengeSettings,
    message?: string,
  ) => Promise<PvPChallenge | null>;
  claimChallenge: (challengeId: string) => Promise<PvPChallenge | null>;
  submitOpponentResult: (
    challengeId: string,
    result: OpponentResult,
  ) => Promise<PvPChallenge | null>;
  cancelChallenge: (challengeId: string) => Promise<boolean>;

  // Lookups
  fetchByInviteCode: (inviteCode: string) => Promise<PvPChallenge | null>;
  fetchById: (id: string) => Promise<PvPChallenge | null>;

  // Refresh
  refreshChallenges: () => Promise<void>;
}

/** Settings + word set captured at creation, locked into the challenge row. */
export interface ChallengeSettings {
  keyboard: string;
  level: string;
  language: string;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
  word_set: string[];
}

const PvPContext = createContext<PvPContextType | undefined>(undefined);

export function PvPProvider({ children }: { children: ReactNode }) {
  const [challenges, setChallenges] = useState<PvPChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase, user } = useSupabase();

  const myOpenChallenges = challenges.filter(
    (c) => c.status === "open" && c.challenger_id === user?.id,
  );
  const myActiveChallenges = challenges.filter(
    (c) => c.status === "claimed",
  );
  const myCompletedChallenges = challenges.filter(
    (c) =>
      c.status === "completed" ||
      c.status === "cancelled" ||
      c.status === "expired",
  );

  const refreshChallenges = useCallback(async () => {
    if (!user) {
      setChallenges([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("pvp_challenges")
        .select("*")
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (fetchError) {
        if (isPvPSchemaUnavailable(fetchError)) {
          console.log("PvP tables not available yet");
          setChallenges([]);
        } else {
          throw fetchError;
        }
      } else {
        setChallenges((data as PvPChallenge[]) ?? []);
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
      console.error("Error fetching challenges:", detail);
      setError(
        err instanceof Error
          ? err.message
          : (detail as { message?: string })?.message ?? "Failed to fetch challenges",
      );
      setChallenges([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  const createChallenge = useCallback(
    async (
      result: ChallengerResult,
      settings: ChallengeSettings,
      message?: string,
    ): Promise<PvPChallenge | null> => {
      if (!user) {
        setError("Must be logged in to create challenges");
        return null;
      }

      try {
        // invite_code is filled in by the set_pvp_invite_code BEFORE INSERT
        // trigger; expires_at and challenger_completed_at have DB-side defaults.
        // The generated Insert type still marks invite_code required, so cast.
        const insertPayload = {
          challenger_id: user.id,
          challenger_cpm: result.cpm,
          challenger_correct: result.correct,
          challenger_incorrect: result.incorrect,
          challenger_time: result.time,
          challenger_key_presses: (result.key_presses ?? null) as Json | null,
          challenger_message: message ?? null,
          keyboard: settings.keyboard,
          level: settings.level,
          language: settings.language,
          capital: settings.capital,
          punctuation: settings.punctuation,
          numbers: settings.numbers,
          word_set: settings.word_set,
        } as unknown as TablesInsert<"pvp_challenges">;

        const { data, error: insertError } = await supabase
          .from("pvp_challenges")
          .insert(insertPayload)
          .select()
          .single();

        if (insertError) throw insertError;
        await refreshChallenges();
        return data as PvPChallenge;
      } catch (err) {
        return handleMutationError(err, "Failed to create challenge");
      }
    },
    [user, supabase, refreshChallenges],
  );

  const claimChallenge = useCallback(
    async (challengeId: string): Promise<PvPChallenge | null> => {
      if (!user) {
        setError("Must be logged in to claim challenges");
        return null;
      }

      try {
        // The status='open' / challenger_id != self preconditions are enforced
        // by the RLS USING clause on the "Anyone can claim an open challenge"
        // policy. Don't add them as PostgREST query filters, because PostgREST
        // re-applies its filters to the returned row — and after the UPDATE
        // status='claimed', a status=eq.open filter would exclude it, leaving
        // .select() empty even on success.
        const { data, error: updateError } = await supabase
          .from("pvp_challenges")
          .update({
            opponent_id: user.id,
            opponent_claimed_at: new Date().toISOString(),
            status: "claimed",
          })
          .eq("id", challengeId)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) {
          // 0 rows updated — RLS rejected (already claimed, own challenge, etc).
          toast.error("Challenge already claimed or unavailable");
          return null;
        }
        await refreshChallenges();
        return data as PvPChallenge;
      } catch (err) {
        return handleMutationError(err, "Failed to claim challenge");
      }
    },
    [user, supabase, refreshChallenges],
  );

  const submitOpponentResult = useCallback(
    async (
      challengeId: string,
      result: OpponentResult,
    ): Promise<PvPChallenge | null> => {
      if (!user) {
        setError("Must be logged in to submit a result");
        return null;
      }

      try {
        // RLS USING (status='claimed' AND opponent_id=auth.uid()) on the
        // "Opponent can submit their result" policy enforces preconditions —
        // don't repeat them as PostgREST filters or the .select() will come
        // back empty after the UPDATE flips status to 'completed'.
        const { data, error: updateError } = await supabase
          .from("pvp_challenges")
          .update({
            opponent_cpm: result.cpm,
            opponent_correct: result.correct,
            opponent_incorrect: result.incorrect,
            opponent_time: result.time,
            opponent_key_presses: (result.key_presses ?? null) as Json | null,
            opponent_completed_at: new Date().toISOString(),
            status: "completed",
          })
          .eq("id", challengeId)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) {
          toast.error("Couldn't submit — challenge state changed or you're not the claimer");
          return null;
        }
        await refreshChallenges();
        return data as PvPChallenge;
      } catch (err) {
        return handleMutationError(err, "Failed to submit result");
      }
    },
    [user, supabase, refreshChallenges],
  );

  const cancelChallenge = useCallback(
    async (challengeId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        // RLS USING (challenger_id=auth.uid() AND status='open') enforces the
        // preconditions — don't repeat them as PostgREST filters; the .select()
        // would otherwise return empty after the UPDATE flips status.
        const { data, error: updateError } = await supabase
          .from("pvp_challenges")
          .update({ status: "cancelled" })
          .eq("id", challengeId)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) {
          toast.error("Couldn't cancel — challenge already claimed or not yours");
          return false;
        }
        await refreshChallenges();
        return true;
      } catch (err) {
        handleMutationError(err, "Failed to cancel challenge");
        return false;
      }
    },
    [user, supabase, refreshChallenges],
  );

  // Shared error handler for mutations.
  function handleMutationError(
    err: unknown,
    fallback: string,
  ): null {
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

  const fetchByInviteCode = useCallback(
    async (inviteCode: string): Promise<PvPChallenge | null> => {
      try {
        const { data, error: rpcError } = await supabase
          .rpc("get_challenge_by_invite_code", { _code: inviteCode.toUpperCase() })
          .maybeSingle();

        if (rpcError) {
          console.error("Error fetching challenge by invite code:", rpcError);
          return null;
        }
        return (data as PvPChallenge | null) ?? null;
      } catch (err) {
        console.error("Error fetching challenge by invite code:", err);
        return null;
      }
    },
    [supabase],
  );

  const fetchById = useCallback(
    async (id: string): Promise<PvPChallenge | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("pvp_challenges")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching challenge by id:", fetchError);
          return null;
        }
        return (data as PvPChallenge | null) ?? null;
      } catch (err) {
        console.error("Error fetching challenge by id:", err);
        return null;
      }
    },
    [supabase],
  );

  // Initial fetch
  useEffect(() => {
    refreshChallenges();
  }, [refreshChallenges]);

  // Real-time subscription for challenge updates
  useEffect(() => {
    if (!user) return;

    const handleChallengeUpdate = async (payload: any) => {
      const eventType = payload.eventType;
      const newData = payload.new as any;
      const oldData = payload.old as any;

      // Refresh challenges first
      await refreshChallenges();

      // Notify the challenger when an opponent claims their open challenge.
      if (
        eventType === "UPDATE" &&
        newData?.challenger_id === user.id &&
        oldData?.status === "open" &&
        newData?.status === "claimed"
      ) {
        toast.info("Your challenge was claimed!", {
          description: "An opponent has accepted your PvP challenge.",
          action: {
            label: "View",
            onClick: () => {
              window.location.href = `/pvp/challenge?id=${newData.id}`;
            },
          },
        });
      }

      // Notify when the challenge completes.
      if (
        eventType === "UPDATE" &&
        oldData?.status !== "completed" &&
        newData?.status === "completed"
      ) {
        const isWinner = newData.winner_id === user.id;
        if (isWinner) {
          toast.success("You Won!", {
            description: "Congratulations! You won the PvP challenge!",
            action: {
              label: "View Results",
              onClick: () => {
                window.location.href = `/pvp/challenge?id=${newData.id}`;
              },
            },
          });
        } else {
          toast.info("Challenge Complete", {
            description: "The PvP challenge has been completed.",
            action: {
              label: "View Results",
              onClick: () => {
                window.location.href = `/pvp/challenge?id=${newData.id}`;
              },
            },
          });
        }
      }
    };

    const channel = supabase
      .channel(`pvp-challenges-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pvp_challenges",
          filter: `challenger_id=eq.${user.id}`,
        },
        handleChallengeUpdate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pvp_challenges",
          filter: `opponent_id=eq.${user.id}`,
        },
        handleChallengeUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, refreshChallenges]);

  const value: PvPContextType = {
    myOpenChallenges,
    myActiveChallenges,
    myCompletedChallenges,
    isLoading,
    error,
    createChallenge,
    claimChallenge,
    submitOpponentResult,
    cancelChallenge,
    fetchByInviteCode,
    fetchById,
    refreshChallenges,
  };

  return (
    <PvPContext.Provider value={value}>{children}</PvPContext.Provider>
  );
}

export function usePvP(): PvPContextType {
  const context = useContext(PvPContext);
  if (context === undefined) {
    throw new Error("usePvP must be used within a PvPProvider");
  }
  return context;
}

// Helper function to check if a user has completed their part of a challenge.
// v2: completion is recorded on the row itself via *_completed_at timestamps.
export function hasUserCompleted(
  challenge: PvPChallenge,
  userId: string,
): boolean {
  if (challenge.challenger_id === userId) {
    return challenge.challenger_completed_at !== null;
  }
  if (challenge.opponent_id === userId) {
    return challenge.opponent_completed_at !== null;
  }
  return false;
}

// Helper function to check if it's the user's turn to race.
// v2: a challenge is in-flight while it is "claimed" (opponent has taken it
// but not yet submitted their result).
export function isUsersTurn(challenge: PvPChallenge, userId: string): boolean {
  if (challenge.status !== "claimed") {
    return false;
  }
  return !hasUserCompleted(challenge, userId);
}
