"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import type { Database, Json } from "@/types/supabase";
import { getSupabaseClient } from "@/lib/supabase-client";
import { generateRoundWordSets } from "@/lib/generate-round-word-sets";

// Types ----------------------------------------------------------------------

export type PvPMatchStatus = "open" | "in_progress" | "completed" | "cancelled" | "expired";

export type PvPMatch = Database["public"]["Tables"]["pvp_matches"]["Row"];
export type PvPRound = Database["public"]["Tables"]["pvp_games"]["Row"];

export interface MatchSettings {
  keyboard: string;
  level: string;
  language: string;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
}

export interface CreateMatchInput {
  bestOf: 1 | 3 | 5 | 7;
  settings: MatchSettings;
  message?: string;
}

export interface PvPRoundResultInput {
  matchId: string;
  roundNumber: number;
  cpm: number;
  correct: number;
  incorrect: number;
  time: string;
  keyPresses: Json;
}

export interface PvPRivalRow {
  rival_id: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  last_played_at: string;
  last_match_id: string;
}

export type PvPRaceMode = {
  match: PvPMatch;
  round: PvPRound;
};

export interface PvPContextType {
  myMatches: PvPMatch[];
  isLoading: boolean;
  createMatch: (input: CreateMatchInput) => Promise<PvPMatch | null>;
  joinMatchByInvite: (code: string) => Promise<PvPMatch | null>;
  submitRoundResult: (input: PvPRoundResultInput) => Promise<PvPRound | null>;
  forfeitMatch: (matchId: string) => Promise<boolean>;
  cancelMatch: (matchId: string) => Promise<boolean>;
  fetchById: (id: string) => Promise<PvPMatch | null>;
  fetchByInviteCode: (code: string) => Promise<PvPMatch | null>;
  fetchRoundsForMatch: (matchId: string) => Promise<PvPRound[]>;
  listRivals: () => Promise<PvPRivalRow[]>;
  startRace: (match: PvPMatch, round: PvPRound) => void;
  cancelRace: () => void;
  currentRace: PvPRaceMode | null;
}

const PvPContext = createContext<PvPContextType | undefined>(undefined);

export function PvPProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [myMatches] = useState<PvPMatch[]>([]);
  const [isLoading] = useState(true);
  const [currentRace, setCurrentRace] = useState<PvPRaceMode | null>(null);

  const createMatch: PvPContextType["createMatch"] = async (input) => {
    const wordSets = await generateRoundWordSets(input.bestOf, input.settings);
    const { data, error } = await supabase.rpc("create_match", {
      _keyboard: input.settings.keyboard,
      _level: input.settings.level,
      _language: input.settings.language,
      _capital: input.settings.capital,
      _punctuation: input.settings.punctuation,
      _numbers: input.settings.numbers,
      _best_of: input.bestOf,
      _word_sets: wordSets as unknown as Json,
      _message: input.message,
    });
    if (error) {
      console.error("Error creating match:", error);
      return null;
    }
    return data;
  };

  const joinMatchByInvite: PvPContextType["joinMatchByInvite"] = async (code) => {
    const { data, error } = await supabase.rpc("join_match_by_invite", {
      _code: code,
    });
    if (error) {
      console.error("Error joining match:", error);
      return null;
    }
    return data;
  };

  const submitRoundResult: PvPContextType["submitRoundResult"] = async (input) => {
    const { data, error } = await supabase.rpc("submit_round_result", {
      _match_id: input.matchId,
      _round_number: input.roundNumber,
      _cpm: input.cpm,
      _correct: input.correct,
      _incorrect: input.incorrect,
      _time: input.time,
      _key_presses: input.keyPresses,
    });
    if (error) {
      console.error("Error submitting round result:", error);
      return null;
    }
    setCurrentRace((prev) =>
      prev && prev.round.id === data?.id ? null : prev,
    );
    return data;
  };

  const forfeitMatch: PvPContextType["forfeitMatch"] = async (matchId) => {
    const { error } = await supabase.rpc("forfeit_match", { _match_id: matchId });
    if (error) {
      console.error("Error forfeiting match:", error);
      return false;
    }
    setCurrentRace(null);
    return true;
  };

  const cancelMatch: PvPContextType["cancelMatch"] = async (matchId) => {
    const { error } = await supabase.rpc("cancel_match", { _match_id: matchId });
    if (error) {
      console.error("Error cancelling match:", error);
      return false;
    }
    return true;
  };

  const fetchByInviteCode: PvPContextType["fetchByInviteCode"] = async (code) => {
    const { data, error } = await supabase.rpc("get_match_by_invite_code", {
      _code: code,
    });
    if (error) {
      console.error("Error fetching match by invite:", error);
      return null;
    }
    return Array.isArray(data) ? (data[0] ?? null) : data;
  };

  const fetchById: PvPContextType["fetchById"] = async (id) => {
    const { data, error } = await supabase
      .from("pvp_matches")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("Error fetching match:", error);
      return null;
    }
    return data;
  };

  const fetchRoundsForMatch: PvPContextType["fetchRoundsForMatch"] = async (matchId) => {
    const { data, error } = await supabase
      .from("pvp_games")
      .select("*")
      .eq("match_id", matchId)
      .order("round_number", { ascending: true });
    if (error) {
      console.error("Error fetching rounds:", error);
      return [];
    }
    return data ?? [];
  };

  const listRivals: PvPContextType["listRivals"] = async () => {
    const { data, error } = await supabase.rpc("list_my_rivals");
    if (error) {
      console.error("Error listing rivals:", error);
      return [];
    }
    return data ?? [];
  };

  const startRace: PvPContextType["startRace"] = (match, round) => {
    setCurrentRace({ match, round });
  };

  const cancelRace: PvPContextType["cancelRace"] = () => {
    setCurrentRace(null);
  };

  const value: PvPContextType = {
    myMatches,
    isLoading,
    createMatch,
    joinMatchByInvite,
    submitRoundResult,
    forfeitMatch,
    cancelMatch,
    fetchById,
    fetchByInviteCode,
    fetchRoundsForMatch,
    listRivals,
    startRace,
    cancelRace,
    currentRace,
  };

  return <PvPContext.Provider value={value}>{children}</PvPContext.Provider>;
}

export function usePvP(): PvPContextType {
  const ctx = useContext(PvPContext);
  if (!ctx) throw new Error("usePvP must be used within a PvPProvider");
  return ctx;
}
