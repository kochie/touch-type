"use client"

import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSettings } from "./settings_hook";

type UserContextProps = [string[]];

const WordContext = createContext<UserContextProps>([[""]]);

export const WordProvider = ({ children }) => {
  const settings = useSettings()
  const [wordList, setWordList] = useState([""]);
  
  const getWordList = useCallback(async () => {
    const buffer = (await window.electronAPI.getWordSet(
      settings.language
    )) as Uint8Array;

    const words = new TextDecoder("utf-8")
      .decode(buffer)
      .replaceAll("\r", "")
      .split("\n");
    const filtered = words.filter((word) => word.match(settings.level));
    setWordList(filtered);
  }, [settings.level, settings.language]);

  useEffect(() => {
    getWordList()
  }, [getWordList]);

  return (
    <WordContext.Provider value={[wordList]}>
      {children}
    </WordContext.Provider>
  );
};

export function useWords() {
  return useContext(WordContext);
}