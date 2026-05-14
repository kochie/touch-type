"use client";

import { LetterStat } from "@/components/Tracker/reducers";
import { openDB } from "idb";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CodeLanguages, Languages, Levels } from "./settings_hook";
import { KeyboardLayoutNames } from "@/keyboards";
import { useSupabase } from "./supabase-provider";
import { metrics } from "./metrics";
import { toast } from "sonner";
import { durationToMs, parseDuration } from "./duration";

const DB_NAME = "touch-type-db";
// v2 drops the unique constraint on the `datetime` index. The constraint
// caused ConstraintError on any sync that re-fetched a locally-written
// result (datetime collision between putResult and syncResults).
const DB_VERSION = 2;

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

function letterStatsToJson(stats: LetterStat[]): { [key: string]: string | number | boolean | undefined }[] {
  return stats.map((stat) => ({
    key: stat.key,
    correct: stat.correct,
    pressedKey: stat.pressedKey,
    timestamp: stat.timestamp,
  }));
}

export interface Result {
  /** IndexedDB auto-generated key — not sent to Supabase. */
  id?: number;
  /**
   * Client-generated idempotency key. UNIQUE on public.results — any retry
   * with the same uuid is a server-side no-op via upsert(onConflict). Always
   * set before any IDB write so re-flushes don't duplicate.
   */
  client_uuid?: string;
  /**
   * Auth user who created the row. Stored at write time, checked at flush
   * time so a cached row queued under user A doesn't post under user B
   * after a sign-out + sign-in.
   */
  userId?: string;
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
  // Code mode fields (optional for backwards compatibility)
  codeMode?: boolean;
  codeLang?: CodeLanguages;
  /**
   * Upload status: false = saved locally but not yet in Supabase (offline or
   * failed insert); true = confirmed in Supabase; undefined = pre-existing
   * record from before this feature was added (assumed synced).
   */
  synced?: boolean;
}

const ResultsContext = createContext({
  results: [] as Result[],
  putResult: async (_result: Result): Promise<{ id: string } | null> => null,
});

export function ResultsProvider({ children }) {
  const [results, _setResults] = useState<Result[]>([]);
  const { supabase, user } = useSupabase();

  // Concurrency guard for syncPending. Two `online` events firing back-to-back
  // (or mount + reconnect overlap) used to double-read the pending set and
  // double-post each row; with no UNIQUE on results that produced duplicate
  // rows. Now: any caller while a flush is in-flight gets short-circuited.
  const syncingRef = useRef(false);
  // Tracks the latest user id we've started a paged read for, so when the
  // user changes (sign-out/in) the previous read self-cancels and we don't
  // overwrite lastSync with a stale cursor.
  const syncResultsAbortRef = useRef<AbortController | null>(null);

  async function syncResults(signal: AbortSignal) {
    if (!user) {
      console.log("No user found - not syncing");
      return;
    }

    const lastSync = localStorage.getItem("lastSync");
    const limit = 100;
    let hasMore = true;
    let offset = 0;
    let errored = false;

    const allResults: Result[] = [];

    while (hasMore) {
      if (signal.aborted) return;

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
        errored = true;
        break;
      }

      if (data && data.length > 0) {
        const convertedResults: Result[] = data.map(r => ({
          client_uuid: r.client_uuid,
          userId: user.id,
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
          codeMode: r.code_mode ?? undefined,
          codeLang: r.code_lang as CodeLanguages,
          synced: true,
        }));
        allResults.push(...convertedResults);
        offset += limit;
        hasMore = data.length === limit;
      } else {
        hasMore = false;
      }
    }

    if (signal.aborted) return;

    if (allResults.length > 0) {
      await updateBulkDB(allResults);
    }
    // Only advance the cursor on a clean read — otherwise the next sync would
    // skip the rows that errored, creating a silent data hole.
    if (!errored) {
      localStorage.setItem("lastSync", Temporal.Now.instant().toString());
    }
  }

  async function initializeDB() {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const os = db.createObjectStore("results", {
            keyPath: "id",
            autoIncrement: true,
          });
          os.createIndex("datetime", "datetime", { unique: false });

          const oldResults = localStorage.getItem("results");
          if (oldResults) {
            try {
              const results = JSON.parse(oldResults);
              const store = tx.objectStore("results");
              for (const result of results) {
                const time = parseDuration(result.time);
                store.put({
                  datetime: new Date().toISOString(),
                  time: time.toString(),
                  cpm:
                    (result.correct + result.incorrect) /
                    (time.total("milliseconds") / 1000 / 60),
                  ...result,
                });
              }
            } catch (err) {
              // Corrupt legacy blob → drop it rather than abort the upgrade
              // transaction (which would leave the DB half-migrated and the
              // user staring at zero results forever).
              console.warn("Discarding corrupt legacy results from localStorage:", err);
            }
          }
          // Always clear — corrupt blob shouldn't re-trigger every load.
          localStorage.removeItem("results");
        }

        if (oldVersion < 2) {
          const store = tx.objectStore("results");
          if (store.indexNames.contains("datetime")) {
            store.deleteIndex("datetime");
          }
          store.createIndex("datetime", "datetime", { unique: false });
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

  /** Persist a result to IndexedDB and return the auto-assigned key. */
  async function updateDB(result: Result): Promise<number> {
    const db = await openDB(DB_NAME, DB_VERSION);
    return db.put("results", result) as Promise<number>;
  }

  async function updateBulkDB(results: Result[]) {
    const db = await openDB(DB_NAME, DB_VERSION);
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

  /**
   * Upload all locally-cached results that haven't reached Supabase yet.
   * Inserts in chronological order so the DB streak trigger processes days
   * in the correct sequence.
   *
   * Idempotency: every row has a client-generated client_uuid; we upsert
   * with onConflict so partial-network-failure retries are safe.
   *
   * User binding: only flushes rows whose userId matches the current session
   * — a row queued offline under user A is held until A signs back in.
   */
  async function syncPending() {
    if (!user) return;
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const db = await openDB(DB_NAME, DB_VERSION);
      const allStored: Result[] = await db.getAll("results");
      const pending = allStored
        .filter(r => r.synced === false)
        .filter(r => {
          // Block cross-account flush. Legacy rows without userId fall back
          // to the current user — same as the prior buggy behavior, just
          // explicit. Going forward all new rows get userId at write time.
          if (r.userId === undefined) return true;
          return r.userId === user.id;
        })
        .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

      if (pending.length === 0) return;

      console.log(`Syncing ${pending.length} pending result(s) to Supabase...`);

      for (const result of pending) {
        try {
          // Legacy rows pre-migration may have no client_uuid. Mint one now
          // so the upsert has a stable key for any future retry.
          const clientUuid = result.client_uuid ?? crypto.randomUUID();

          const { error } = await supabase
            .from('results')
            .upsert({
              user_id: user.id,
              client_uuid: clientUuid,
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
              code_mode: result.codeMode,
              code_lang: result.codeLang,
            }, { onConflict: 'client_uuid' });

          if (!error && result.id !== undefined) {
            await db.put("results", { ...result, client_uuid: clientUuid, synced: true });

            // Fire-and-forget leaderboard upsert. Includes datetime so the
            // backend can preserve the original-run timestamp when a stale
            // cached high score wins on replay (otherwise the "when" column
            // shifts to the replay time).
            if (!result.codeMode) {
              const timeMs = durationToMs(result.time);
              if (Number.isFinite(timeMs) && timeMs > 0) {
                supabase.functions.invoke('leaderboards', {
                  body: {
                    correct: result.correct,
                    incorrect: result.incorrect,
                    cpm: result.cpm,
                    keyboard: result.keyboard,
                    level: result.level,
                    language: result.language ?? 'en',
                    capital: result.capital,
                    punctuation: result.punctuation,
                    numbers: result.numbers,
                    time: Math.round(timeMs),
                    datetime: result.datetime,
                  },
                }).then(({ error: lbErr }) => {
                  if (lbErr) console.warn('Leaderboard submission failed:', lbErr);
                }).catch((err) => console.warn('Leaderboard submission error:', err));
              }
            }
          }
        } catch (err) {
          console.error('Failed to sync pending result:', err);
        }
      }

      // Refresh state to reflect updated synced flags.
      const updated: Result[] = await db.getAll("results");
      _setResults(
        updated.sort(
          (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
        ),
      );
    } finally {
      syncingRef.current = false;
    }
  }

  useEffect(() => {
    // Cancel any in-flight paged read from a prior user. Without this, a
    // sign-out → sign-in flip forks two concurrent paged reads that both
    // write lastSync, racing to overwrite the cursor.
    syncResultsAbortRef.current?.abort();
    const controller = new AbortController();
    syncResultsAbortRef.current = controller;

    initializeDB()
      .then(() => syncResults(controller.signal))
      .then(syncPending)
      .catch((err) => {
        console.error("Failed to initialize/sync results:", err);
      });

    return () => controller.abort();
  }, [user]);

  // Upload pending results as soon as the network comes back.
  useEffect(() => {
    const handleOnline = () => { syncPending(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user]);

  const putResult = async (
    result: Result,
  ): Promise<{ id: string } | null> => {
    // Mint the idempotency key + bind the row to its owner BEFORE any IDB
    // write or network call. This is the foundation that makes every
    // downstream retry safe.
    const clientUuid = result.client_uuid ?? crypto.randomUUID();
    const pending: Result = {
      ...result,
      client_uuid: clientUuid,
      userId: user?.id,
      synced: false,
    };
    _setResults((prev) => [pending, ...prev]);

    let idbKey: number | undefined;
    try {
      idbKey = await updateDB(pending);
    } catch (err) {
      console.error("Failed to persist result to IndexedDB:", err);
    }

    if (user) {
      const { data, error } = await supabase
        .from('results')
        .upsert({
          user_id: user.id,
          client_uuid: clientUuid,
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
          code_mode: result.codeMode,
          code_lang: result.codeLang,
        }, { onConflict: 'client_uuid' })
        .select('id')
        .single();

      if (error) {
        console.error('Error uploading result:', error);
        toast.error("Result saved locally but couldn't sync to the cloud. It will retry when you're back online.");
        // synced: false remains — syncPending will retry on next online event,
        // safe because the upsert is keyed on client_uuid.
        return null;
      }

      const totalKeyPresses = result.correct + result.incorrect;
      const accuracy = totalKeyPresses > 0 ? (result.correct / totalKeyPresses) * 100 : 100;
      const wpm = result.cpm / 5;
      const mode = result.codeMode ? "code" : "words";

      metrics.count("test.completed", 1, { mode, language: result.language ?? "en", level: result.level });
      metrics.distribution("test.wpm", wpm, "none", { mode, language: result.language ?? "en" });
      metrics.distribution("test.accuracy", accuracy, "percent", { mode });

      // Mark synced in IDB. If this fails, syncPending will re-flush; the
      // server upsert is keyed on client_uuid so the duplicate is collapsed
      // to a no-op rather than a phantom row.
      if (idbKey !== undefined) {
        updateDB({ ...pending, id: idbKey, synced: true }).catch(
          err => console.error("Failed to mark result as synced in IDB:", err)
        );
      }

      if (!result.codeMode) {
        const timeMs = durationToMs(result.time);
        if (Number.isFinite(timeMs) && timeMs > 0) {
          // Round because Temporal.Duration.total('milliseconds') returns a
          // float for durations with hour/minute components; the time
          // column is integer.
          metrics.distribution("test.duration", timeMs, "millisecond", { level: result.level });
          supabase.functions.invoke('leaderboards', {
            body: {
              correct:     result.correct,
              incorrect:   result.incorrect,
              cpm:         result.cpm,
              keyboard:    result.keyboard,
              level:       result.level,
              language:    result.language ?? 'en',
              capital:     result.capital,
              punctuation: result.punctuation,
              numbers:     result.numbers,
              time:        Math.round(timeMs),
              datetime:    result.datetime,
            },
          }).then(({ error: lbErr }) => {
                if (lbErr) {
                  console.warn('Leaderboard submission failed:', lbErr);
                  toast.error("Score saved but couldn't reach the leaderboard. Check your connection.");
                  metrics.count("leaderboard.submission", 1, { success: "false" });
                } else {
                  metrics.count("leaderboard.submission", 1, { success: "true" });
                }
              }).catch((err) => {
                console.warn('Leaderboard submission error:', err);
                toast.error("Score saved but couldn't reach the leaderboard. Check your connection.");
                metrics.count("leaderboard.submission", 1, { success: "false" });
              });
        }
      }

      return data;
    }
    return null;
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
