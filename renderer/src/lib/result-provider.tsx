"use client";

import { LetterStat } from "@/components/Tracker/reducers";
import { PUT_RESULT } from "@/transactions/putResult";
import { useMutation } from "@apollo/client";
import { openDB } from "idb";

import { createContext, useContext, useEffect, useState } from "react";
import { Languages, Levels } from "./settings_hook";
import { KeyboardLayoutNames } from "@/keyboards";


export interface Result {
  correct: number;
  incorrect: number;
  keyPresses: LetterStat[],
  time: string,
  datetime: string,
  level: Levels,
  keyboard: KeyboardLayoutNames,
  language: Languages,
  capital: boolean,
  punctuation: boolean,
  numbers: boolean,
}


const ResultsContext = createContext({
    results: [] as Result[],
    putResult: (result: Result) => {},
});

export function ResultsProvider({ children }) {
  const [results, _setResults] = useState<Result[]>([]);
  const [uploadResult] = useMutation(PUT_RESULT);

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
            store.put({datetime: new Date().toISOString(), ...result});
          }
          localStorage.removeItem("results");
        }
      },
    });
    const tx = db.transaction("results", "readonly");
    const store = tx.objectStore("results");
    const results_store = await store.getAll();
    _setResults(results_store.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()));
  }

  useEffect(() => {
    initializeDB();
  }, []);

  async function updateDB() {
    const db = await openDB("touch-type-db", 1);
    const tx = db.transaction("results", "readwrite");
    const store = tx.objectStore("results");
    for (const result of results) {
      await store.put(result);
    }
  }

  const putResult = (result: Result) => {
    _setResults((prev) => [...prev, result]);
    updateDB();

    uploadResult({ variables: { result: result } });
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
