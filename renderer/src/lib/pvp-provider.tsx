"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import type { Tables } from "@/types/supabase";
import { toast } from "sonner";

// Types
export type PvPChallengeStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'expired' | 'declined';

export interface PvPChallenge {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  challenge_code: string | null;
  status: PvPChallengeStatus;
  keyboard: string;
  level: string;
  language: string;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
  word_set: string[];
  challenger_result_id: string | null;
  opponent_result_id: string | null;
  winner_id: string | null;
  message: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // View fields (from join)
  challenger_username?: string | null;
  challenger_email?: string | null;
  opponent_username?: string | null;
  opponent_email?: string | null;
  challenger_cpm?: number | null;
  challenger_correct?: number | null;
  challenger_incorrect?: number | null;
  opponent_cpm?: number | null;
  opponent_correct?: number | null;
  opponent_incorrect?: number | null;
  winner_username?: string | null;
  invite_code?: string | null;
}

export interface SearchUser {
  id: string;
  username: string;
  displayName: string | null;
  emailHint: string | null;
}

export interface CreateChallengeParams {
  opponentId?: string;
  keyboard: string;
  level: string;
  language: string;
  capital?: boolean;
  punctuation?: boolean;
  numbers?: boolean;
  wordSet: string[];
  message?: string;
  createInviteLink?: boolean;
}

interface PvPContextType {
  // State
  challenges: PvPChallenge[];
  incomingChallenges: PvPChallenge[];
  outgoingChallenges: PvPChallenge[];
  activeChallenges: PvPChallenge[];
  completedChallenges: PvPChallenge[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshChallenges: () => Promise<void>;
  createChallenge: (params: CreateChallengeParams) => Promise<PvPChallenge | null>;
  acceptChallenge: (challengeId: string) => Promise<boolean>;
  acceptChallengeByInvite: (inviteCode: string) => Promise<PvPChallenge | null>;
  declineChallenge: (challengeId: string) => Promise<boolean>;
  cancelChallenge: (challengeId: string) => Promise<boolean>;
  submitResult: (challengeId: string, resultId: string) => Promise<boolean>;
  getChallengeByCode: (code: string) => Promise<PvPChallenge | null>;
  getChallengeById: (id: string) => Promise<PvPChallenge | null>;
  searchUsers: (query: string) => Promise<SearchUser[]>;
}

const PvPContext = createContext<PvPContextType | undefined>(undefined);

export function PvPProvider({ children }: { children: ReactNode }) {
  const [challenges, setChallenges] = useState<PvPChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase, user } = useSupabase();

  // Derived state
  const incomingChallenges = challenges.filter(
    (c) => c.opponent_id === user?.id && c.status === "pending"
  );
  const outgoingChallenges = challenges.filter(
    (c) => c.challenger_id === user?.id
  );
  const activeChallenges = challenges.filter(
    (c) => c.status === "accepted" || c.status === "in_progress"
  );
  const completedChallenges = challenges.filter(
    (c) => c.status === "completed"
  );
  const pendingCount = incomingChallenges.length;

  // Fetch all challenges for the current user
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
        .from("pvp_challenges_view")
        .select("*")
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (fetchError) {
        // Table might not exist yet
        if (fetchError.code === "42P01" || fetchError.message?.includes("does not exist")) {
          console.log("PvP tables not available yet");
          setChallenges([]);
        } else {
          throw fetchError;
        }
      } else {
        setChallenges((data as PvPChallenge[]) || []);
      }
    } catch (err) {
      console.error("Error fetching challenges:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch challenges");
      setChallenges([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  // Create a new challenge
  const createChallenge = useCallback(
    async (params: CreateChallengeParams): Promise<PvPChallenge | null> => {
      if (!user) {
        setError("Must be logged in to create challenges");
        return null;
      }

      try {
        const { data, error: createError } = await supabase
          .from("pvp_challenges")
          .insert({
            challenger_id: user.id,
            opponent_id: params.opponentId || null,
            keyboard: params.keyboard,
            level: params.level,
            language: params.language,
            capital: params.capital || false,
            punctuation: params.punctuation || false,
            numbers: params.numbers || false,
            word_set: params.wordSet,
            message: params.message || null,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Create invite link if requested
        let inviteCode: string | null = null;
        if (params.createInviteLink && data) {
          const code = crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
          const { data: invite, error: inviteError } = await supabase
            .from("pvp_challenge_invites")
            .insert({
              challenge_id: data.id,
              invite_code: code,
            })
            .select()
            .single();

          if (!inviteError && invite) {
            inviteCode = invite.invite_code;
          }
        }

        // Refresh to get the full view data
        await refreshChallenges();

        return { ...data, invite_code: inviteCode } as PvPChallenge;
      } catch (err) {
        console.error("Error creating challenge:", err);
        setError(err instanceof Error ? err.message : "Failed to create challenge");
        return null;
      }
    },
    [user, supabase, refreshChallenges]
  );

  // Accept a challenge
  const acceptChallenge = useCallback(
    async (challengeId: string): Promise<boolean> => {
      if (!user) {
        setError("Must be logged in to accept challenges");
        return false;
      }

      try {
        const { error: updateError } = await supabase
          .from("pvp_challenges")
          .update({
            opponent_id: user.id,
            status: "accepted",
          })
          .eq("id", challengeId);

        if (updateError) throw updateError;

        await refreshChallenges();
        return true;
      } catch (err) {
        console.error("Error accepting challenge:", err);
        setError(err instanceof Error ? err.message : "Failed to accept challenge");
        return false;
      }
    },
    [user, supabase, refreshChallenges]
  );

  // Accept challenge by invite code
  const acceptChallengeByInvite = useCallback(
    async (inviteCode: string): Promise<PvPChallenge | null> => {
      if (!user) {
        setError("Must be logged in to accept challenges");
        return null;
      }

      try {
        // Find the invite
        const { data: invite, error: inviteError } = await supabase
          .from("pvp_challenge_invites")
          .select("challenge_id, used, expires_at")
          .eq("invite_code", inviteCode.toUpperCase())
          .single();

        if (inviteError || !invite) {
          setError("Invalid invite code");
          return null;
        }

        if (invite.used) {
          setError("Invite has already been used");
          return null;
        }

        if (new Date(invite.expires_at) < new Date()) {
          setError("Invite has expired");
          return null;
        }

        // Get the challenge
        const { data: challenge, error: challengeError } = await supabase
          .from("pvp_challenges")
          .select("*")
          .eq("id", invite.challenge_id)
          .single();

        if (challengeError || !challenge) {
          setError("Challenge not found");
          return null;
        }

        if (challenge.challenger_id === user.id) {
          setError("Cannot accept your own challenge");
          return null;
        }

        // Mark invite as used
        await supabase
          .from("pvp_challenge_invites")
          .update({ used: true, used_by: user.id })
          .eq("invite_code", inviteCode.toUpperCase());

        // Accept the challenge
        const { data: updatedChallenge, error: updateError } = await supabase
          .from("pvp_challenges")
          .update({
            opponent_id: user.id,
            status: "accepted",
          })
          .eq("id", invite.challenge_id)
          .select()
          .single();

        if (updateError) throw updateError;

        await refreshChallenges();
        return updatedChallenge as PvPChallenge;
      } catch (err) {
        console.error("Error accepting challenge by invite:", err);
        setError(err instanceof Error ? err.message : "Failed to accept challenge");
        return null;
      }
    },
    [user, supabase, refreshChallenges]
  );

  // Decline a challenge
  const declineChallenge = useCallback(
    async (challengeId: string): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from("pvp_challenges")
          .update({ status: "declined" })
          .eq("id", challengeId);

        if (updateError) throw updateError;

        await refreshChallenges();
        return true;
      } catch (err) {
        console.error("Error declining challenge:", err);
        setError(err instanceof Error ? err.message : "Failed to decline challenge");
        return false;
      }
    },
    [supabase, refreshChallenges]
  );

  // Cancel a challenge (only challenger can do this)
  const cancelChallenge = useCallback(
    async (challengeId: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from("pvp_challenges")
          .delete()
          .eq("id", challengeId)
          .eq("challenger_id", user?.id);

        if (deleteError) throw deleteError;

        await refreshChallenges();
        return true;
      } catch (err) {
        console.error("Error cancelling challenge:", err);
        setError(err instanceof Error ? err.message : "Failed to cancel challenge");
        return false;
      }
    },
    [user, supabase, refreshChallenges]
  );

  // Submit a result for a challenge
  const submitResult = useCallback(
    async (challengeId: string, resultId: string): Promise<boolean> => {
      if (!user) {
        setError("Must be logged in to submit results");
        return false;
      }

      try {
        // Get the challenge to determine if user is challenger or opponent
        const { data: challenge, error: getError } = await supabase
          .from("pvp_challenges")
          .select("*")
          .eq("id", challengeId)
          .single();

        if (getError || !challenge) {
          setError("Challenge not found");
          return false;
        }

        const isChallenger = challenge.challenger_id === user.id;
        const updateData: Record<string, string> = {};

        if (isChallenger) {
          updateData.challenger_result_id = resultId;
        } else {
          updateData.opponent_result_id = resultId;
        }

        // Update status if this is the first result
        if (challenge.status === "accepted") {
          updateData.status = "in_progress";
        }

        const { error: updateError } = await supabase
          .from("pvp_challenges")
          .update(updateData)
          .eq("id", challengeId);

        if (updateError) throw updateError;

        await refreshChallenges();
        return true;
      } catch (err) {
        console.error("Error submitting result:", err);
        setError(err instanceof Error ? err.message : "Failed to submit result");
        return false;
      }
    },
    [user, supabase, refreshChallenges]
  );

  // Get challenge by code
  const getChallengeByCode = useCallback(
    async (code: string): Promise<PvPChallenge | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("pvp_challenges_view")
          .select("*")
          .eq("challenge_code", code.toUpperCase())
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            return null; // Not found
          }
          throw fetchError;
        }

        return data as PvPChallenge;
      } catch (err) {
        console.error("Error fetching challenge by code:", err);
        return null;
      }
    },
    [supabase]
  );

  // Get challenge by ID
  const getChallengeById = useCallback(
    async (id: string): Promise<PvPChallenge | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from("pvp_challenges_view")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            return null; // Not found
          }
          throw fetchError;
        }

        return data as PvPChallenge;
      } catch (err) {
        console.error("Error fetching challenge by ID:", err);
        return null;
      }
    },
    [supabase]
  );

  // Search for users to challenge
  const searchUsers = useCallback(
    async (query: string): Promise<SearchUser[]> => {
      if (!user || query.length < 2) {
        return [];
      }

      try {
        const { data, error: searchError } = await supabase
          .from("profiles")
          .select("id, preferred_username, email, name")
          .or(`preferred_username.ilike.%${query}%,email.ilike.%${query}%,name.ilike.%${query}%`)
          .neq("id", user.id)
          .limit(10);

        if (searchError) throw searchError;

        return (
          data?.map((u) => ({
            id: u.id,
            username: u.preferred_username || u.name || u.email?.split("@")[0] || "Unknown",
            displayName: u.name || u.preferred_username || null,
            emailHint: u.email
              ? `${u.email.substring(0, 3)}...@${u.email.split("@")[1]}`
              : null,
          })) || []
        );
      } catch (err) {
        console.error("Error searching users:", err);
        return [];
      }
    },
    [user, supabase]
  );

  // Initial fetch
  useEffect(() => {
    refreshChallenges();
  }, [refreshChallenges]);

  // Track previous challenge IDs to detect new ones
  const previousChallengeIds = useRef<Set<string>>(new Set());

  // Real-time subscription for challenge updates
  useEffect(() => {
    if (!user) return;

    const handleChallengeUpdate = async (payload: any) => {
      const eventType = payload.eventType;
      const newData = payload.new as any;
      const oldData = payload.old as any;

      // Refresh challenges first
      await refreshChallenges();

      // Show notifications for new incoming challenges
      if (eventType === "INSERT" && newData.opponent_id === user.id) {
        // New challenge received
        toast.info("New PvP Challenge!", {
          description: "Someone has challenged you to a typing battle!",
          action: {
            label: "View",
            onClick: () => {
              window.location.href = "/pvp";
            },
          },
        });
      }

      // Notify when opponent accepts your challenge
      if (
        eventType === "UPDATE" &&
        newData.challenger_id === user.id &&
        oldData?.status === "pending" &&
        newData.status === "accepted"
      ) {
        toast.success("Challenge Accepted!", {
          description: "Your opponent accepted the challenge. Let the battle begin!",
          action: {
            label: "Play",
            onClick: () => {
              window.location.href = `/pvp/${newData.id}`;
            },
          },
        });
      }

      // Notify when challenge is completed
      if (
        eventType === "UPDATE" &&
        oldData?.status !== "completed" &&
        newData.status === "completed"
      ) {
        const isWinner = newData.winner_id === user.id;
        if (isWinner) {
          toast.success("You Won!", {
            description: "Congratulations! You won the PvP challenge!",
            action: {
              label: "View Results",
              onClick: () => {
                window.location.href = `/pvp/${newData.id}`;
              },
            },
          });
        } else {
          toast.info("Challenge Complete", {
            description: "The PvP challenge has been completed.",
            action: {
              label: "View Results",
              onClick: () => {
                window.location.href = `/pvp/${newData.id}`;
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

  const contextValue: PvPContextType = {
    challenges,
    incomingChallenges,
    outgoingChallenges,
    activeChallenges,
    completedChallenges,
    pendingCount,
    isLoading,
    error,
    refreshChallenges,
    createChallenge,
    acceptChallenge,
    acceptChallengeByInvite,
    declineChallenge,
    cancelChallenge,
    submitResult,
    getChallengeByCode,
    getChallengeById,
    searchUsers,
  };

  return (
    <PvPContext.Provider value={contextValue}>{children}</PvPContext.Provider>
  );
}

export function usePvP(): PvPContextType {
  const context = useContext(PvPContext);
  if (context === undefined) {
    throw new Error("usePvP must be used within a PvPProvider");
  }
  return context;
}

// Helper function to get display name for a challenge participant
export function getChallengeDisplayName(
  challenge: PvPChallenge,
  role: "challenger" | "opponent"
): string {
  if (role === "challenger") {
    return challenge.challenger_username || "Unknown";
  }
  return challenge.opponent_username || "Waiting for opponent...";
}

// Helper function to check if a user has completed their part
export function hasUserCompleted(
  challenge: PvPChallenge,
  userId: string
): boolean {
  if (challenge.challenger_id === userId) {
    return challenge.challenger_result_id !== null;
  }
  if (challenge.opponent_id === userId) {
    return challenge.opponent_result_id !== null;
  }
  return false;
}

// Helper function to check if it's the user's turn
export function isUsersTurn(challenge: PvPChallenge, userId: string): boolean {
  if (challenge.status !== "accepted" && challenge.status !== "in_progress") {
    return false;
  }
  return !hasUserCompleted(challenge, userId);
}
