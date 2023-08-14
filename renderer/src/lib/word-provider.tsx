"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Levels, useSettings } from "./settings_hook";
import { LEVEL_1_QWERTY, LEVEL_2_QWERTY, LEVEL_3_QWERTY } from "./levels";
import { KeyboardLayoutNames } from "@/keyboards";
import naughty from "naughty-words";

type UserContextProps = [string[]];

const WordContext = createContext<UserContextProps>([[""]]);

function getRegExp(levelName: Levels, keyboardName: KeyboardLayoutNames) {
  switch (keyboardName) {
    case KeyboardLayoutNames.MACOS_US_COLEMAK:
      switch (levelName) {
        case Levels.LEVEL_1:
          return LEVEL_1_QWERTY;
        case Levels.LEVEL_2:
          return LEVEL_2_QWERTY;
        case Levels.LEVEL_3:
          return LEVEL_3_QWERTY;
        default:
          return /^[a-z]{1,6}$/;
      }
    case KeyboardLayoutNames.MACOS_US_DVORAK:
      switch (levelName) {
        case Levels.LEVEL_1:
          return LEVEL_1_QWERTY;
        case Levels.LEVEL_2:
          return LEVEL_2_QWERTY;
        case Levels.LEVEL_3:
          return LEVEL_3_QWERTY;
        default:
          return /^[a-z]{1,6}$/;
      }
    case KeyboardLayoutNames.MACOS_US_QWERTY:
      switch (levelName) {
        case Levels.LEVEL_1:
          return LEVEL_1_QWERTY;
        case Levels.LEVEL_2:
          return LEVEL_2_QWERTY;
        case Levels.LEVEL_3:
          return LEVEL_3_QWERTY;
        default:
          return /^[a-z]{1,6}$/;
      }
    default:
      return /^[a-z]{1,6}$/;
  }
}

export const WordProvider = ({ children }) => {
  const settings = useSettings();
  const [wordList, setWordList] = useState([""]);

  const getWordList = useCallback(async () => {
    // @ts-expect-error
    const buffer = (await window.electronAPI.getWordSet(
      settings.language
    )) as Uint8Array;

    const words = new TextDecoder("utf-8")
      .decode(buffer)
      .replaceAll("\r", "")
      .split("\n");

    const filtered = words
      .filter((word) =>
        word.match(getRegExp(settings.levelName, settings.keyboardName))
      )
      .filter((word) => !naughty.en.includes(word));

    setWordList(filtered);
  }, [settings.levelName, settings.language, settings.keyboardName]);

  useEffect(() => {
    getWordList();
  }, [getWordList]);

  return (
    <WordContext.Provider value={[wordList]}>{children}</WordContext.Provider>
  );
};

export function useWords() {
  return useContext(WordContext);
}
