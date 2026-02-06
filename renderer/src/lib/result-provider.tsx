"use client";

import { LetterStat } from "@/components/Tracker/reducers";
import { openDB } from "idb";

import { createContext, useContext, useEffect, useState } from "react";
import { Languages, Levels } from "./settings_hook";
import { KeyboardLayoutNames } from "@/keyboards";
import { Duration } from "luxon";
import { useSupabase } from "./supabase-provider";
/**
 * Converts a JSON value from Supabase to a LetterStat array.
 * Validates the structure and provides defaults for missing optional fields.
 */
function convertToLetterStats(json: unknown): LetterStat[] {
  if (!json || !Array.isArray(json)) {
    return [];
  }

  return json
    .filter((item): item is Record<string, unknown> => 
      typeof item === "object" && item !== null && !Array.isArray(item)
    )
    .map((item) => ({
      key: typeof item.key === "string" ? item.key : "",
      correct: typeof item.correct === "boolean" ? item.correct : false,
      pressedKey: typeof item.pressedKey === "string" ? item.pressedKey : undefined,
      timestamp: typeof item.timestamp === "number" ? item.timestamp : undefined,
    }));
}

/**
 * Converts LetterStat array to a JSON-compatible format for Supabase.
 */
function letterStatsToJson(stats: LetterStat[]): { [key: string]: string | number | boolean | undefined }[] {
  return stats.map((stat) => ({
    key: stat.key,
    correct: stat.correct,
    pressedKey: stat.pressedKey,
    timestamp: stat.timestamp,
  }));
}

export interface Result {
  correct: number;
  incorrect: number;
  keyPresses: LetterStat[];
  time: string;
  datetime: string;
  level: Levels;
  keyboard: KeyboardLayoutNames;
  language: Languages;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
  cpm: number;
}

const ResultsContext = createContext({
  results: [] as Result[],
  putResult: (result: Result) => {},
});

export function ResultsProvider({ children }) {
  const [results, _setResults] = useState<Result[]>([]);
  const { supabase, user } = useSupabase();

  async function syncResults() {
    if (!user) {
      console.log("No user found - not syncing");
      return;
    }

    const lastSync = localStorage.getItem("lastSync");
    const limit = 100;
    let hasMore = true;
    let offset = 0;

    const allResults: Result[] = [];

    while (hasMore) {
      let query = supabase
        .from('results')
        .select('*')
        .eq('user_id', user.id)
        .order('datetime', { ascending: false })
        .range(offset, offset + limit - 1);

      if (lastSync) {
        query = query.gt('datetime', lastSync);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching results:', error);
        break;
      }

      if (data && data.length > 0) {
        // Convert from DB format to app format
        const convertedResults = data.map(r => ({
          correct: r.correct,
          incorrect: r.incorrect,
          keyPresses: convertToLetterStats(r.key_presses),
          time: r.time,
          datetime: r.datetime,
          level: r.level as Levels,
          keyboard: r.keyboard as KeyboardLayoutNames,
          language: r.language as Languages,
          capital: !!r.capital,
          punctuation: !!r.punctuation,
          numbers: !!r.numbers,
          cpm: r.cpm,
        }));
        allResults.push(...convertedResults);
        offset += limit;
        hasMore = data.length === limit;
      } else {
        hasMore = false;
      }
    }

    if (allResults.length > 0) {
      await updateBulkDB(allResults);
      localStorage.setItem("lastSync", new Date().toISOString());
    }
  }

  async function initializeDB() {
    const db = await openDB("touch-type-db", 1, {
      upgrade(db, oldVersion, newVersion, tx) {
        if (!db.objectStoreNames.contains("results")) {
          const os = db.createObjectStore("results", {
            keyPath: "id",
            autoIncrement: true,
          });
          os.createIndex("datetime", "datetime", { unique: true });
        }

        const oldResults = localStorage.getItem("results");
        if (oldResults) {
          const results = JSON.parse(oldResults);
          const store = tx.objectStore("results");
          for (const result of results) {
            const time = Duration.fromISO(result.time) ?? Duration.fromMillis(1_000_000);
            store.put({
              datetime: new Date().toISOString(),
              time: time.toISO(),
              cpm:
                (result.correct + result.incorrect) /
                (time.toMillis() / 1000 / 60),
              ...result,
            });
          }
          localStorage.removeItem("results");
        }
      },
    });
    const tx = db.transaction("results", "readonly");
    const store = tx.objectStore("results");
    const results_store = await store.getAll();
    _setResults(
      results_store.sort(
        (a, b) =>
          new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
      ),
    );
  }

  useEffect(() => {
    initializeDB().then(syncResults);
  }, [user]);

  async function updateDB(result: Result) {
    const db = await openDB("touch-type-db", 1);
    const tx = db.transaction("results", "readwrite");
    const store = tx.objectStore("results");

    await store.put(result);
  }

  async function updateBulkDB(results: Result[]) {
    const db = await openDB("touch-type-db", 1);
    const tx = db.transaction("results", "readwrite");
    const store = tx.objectStore("results");

    for (const result of results) {
      await store.put(result);
    }

    const stored_results = await store.getAll();
    _setResults(
      stored_results.sort(
        (a, b) =>
          new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
      ),
    );
  }

  const putResult = async (result: Result) => {
    _setResults((prev) => [result, ...prev]);
    updateDB(result);

    if (user) {
      // Upload to Supabase
      const { error } = await supabase.from('results').insert({
        user_id: user.id,
        correct: result.correct,
        incorrect: result.incorrect,
        time: result.time,
        datetime: result.datetime,
        level: result.level,
        keyboard: result.keyboard,
        language: result.language,
        capital: result.capital,
        punctuation: result.punctuation,
        numbers: result.numbers,
        cpm: result.cpm,
        key_presses: letterStatsToJson(result.keyPresses),
      });

      if (error) {
        console.error('Error uploading result:', error);
      }
    }
  };

  return (
    <ResultsContext.Provider value={{ results, putResult }}>
      {children}
    </ResultsContext.Provider>
  );
}

export const useResults = () => {
  return useContext(ResultsContext);
};

async function runTempUpdates() {
  const db = await openDB("touch-type-db", 1);
  const tx = db.transaction("results", "readwrite");
  const store = tx.objectStore("results");

  const results = await store.getAll();
  await store.clear();

  for (const result of results) {
    if (result.datetime) {
      await store.put({
        ...result,
        datetime: new Date(result.datetime).toISOString(),
        cpm:
          (result.correct + result.incorrect) /
          (Duration.fromISO(result.time).toMillis() / 1000 / 60),
      });
    }
  }
}
