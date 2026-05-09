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

  // TODO(pvp-v4): Task 16 — implement submitRoundResult via submit_round_result RPC
  const submitRoundResult = async (
    _input: PvPRoundResultInput,
  ): Promise<PvPRound | null> => {
    return null;
  };

  // TODO(pvp-v4): Task 17 — implement forfeitMatch via forfeit_match RPC
  const forfeitMatch = async (_matchId: string): Promise<boolean> => {
    return false;
  };

  // TODO(pvp-v4): Task 17 — implement cancelMatch via cancel_match RPC
  const cancelMatch = async (_matchId: string): Promise<boolean> => {
    return false;
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

  // TODO(pvp-v4): Task 17 — implement listRivals via list_my_rivals RPC
  const listRivals = async (): Promise<PvPRivalRow[]> => {
    return [];
  };

  // TODO(pvp-v4): Task 16 — wire startRace into Tracker component
  const startRace = (match: PvPMatch, round: PvPRound) => {
    setCurrentRace({ match, round });
  };

  const cancelRace = () => {
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
