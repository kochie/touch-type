"use client";

import { LetterStat } from "@/components/Tracker/reducers";
import { PUT_RESULT } from "@/transactions/putResult";
import { useMutation } from "@apollo/client";
import { openDB } from "idb";

import { createContext, useContext, useEffect, useState } from "react";
import { Languages, Levels } from "./settings_hook";
import { KeyboardLayoutNames } from "@/keyboards";
import { Duration } from "luxon";
import { GET_RESULTS } from "@/transactions/getResults";
import { makeClient } from "./apollo-provider";
import {getCurrentUser} from "aws-amplify/auth"
import { useUser } from "./user_hook";

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
  const [uploadResult] = useMutation(PUT_RESULT);
  const user = useUser()

  async function syncResults() {
    try {
      await getCurrentUser()
    } catch (err) {
      // console.error("No user found", err)
      console.log("No user found - not syncing")
      return
    }


    const apollo = makeClient();
    const lastSync = localStorage.getItem("lastSync");
    const limit = 100;
    let nextToken: null | string = null;

    const results: Result[] = [];

    do {
      const result = await apollo.query<{
        results: {
          items: Result[];
          nextToken?: string;
        };
      }>({
        query: GET_RESULTS,
        variables: { since: lastSync, limit: limit, nextToken },
      });

      console.log("RESULT", result);
      results.push(...result.data.results.items);
      nextToken = result.data.results.nextToken;
    } while (nextToken);

    await updateBulkDB(results);
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
  }, []);

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

  const putResult = (result: Result) => {
    _setResults((prev) => [...prev, result]);
    updateDB(result);

    if (user) {
      uploadResult({ variables: { result: result } });
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
