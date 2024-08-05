"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Levels, useSettings } from "./settings_hook";
import * as regexp from "./levels";
import { KeyboardLayoutNames } from "@/keyboards";
import naughty from "naughty-words";

type UserContextProps = [string[]];

const WordContext = createContext<UserContextProps>([[""]]);

const regExpMap = {
  [KeyboardLayoutNames.MACOS_US_QWERTY]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_QWERTY,
    [Levels.LEVEL_2]: regexp.LEVEL_2_QWERTY,
    [Levels.LEVEL_3]: regexp.LEVEL_3_QWERTY,
    [Levels.LEVEL_4]: regexp.LEVEL_4_QWERTY,
    [Levels.LEVEL_5]: regexp.LEVEL_5_QWERTY,
  },
  [KeyboardLayoutNames.MACOS_US_DVORAK]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_DVORAK,
    [Levels.LEVEL_2]: regexp.LEVEL_2_DVORAK,
    [Levels.LEVEL_3]: regexp.LEVEL_3_DVORAK,
    [Levels.LEVEL_4]: regexp.LEVEL_4_DVORAK,
    [Levels.LEVEL_5]: regexp.LEVEL_5_DVORAK,
  },
  [KeyboardLayoutNames.MACOS_US_COLEMAK]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_COLEMAK,
    [Levels.LEVEL_2]: regexp.LEVEL_2_COLEMAK,
    [Levels.LEVEL_3]: regexp.LEVEL_3_COLEMAK,
    [Levels.LEVEL_4]: regexp.LEVEL_4_COLEMAK,
    [Levels.LEVEL_5]: regexp.LEVEL_5_COLEMAK
  },
  [KeyboardLayoutNames.MACOS_FR_AZERTY]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_AZERTY,
    [Levels.LEVEL_2]: regexp.LEVEL_2_AZERTY,
    [Levels.LEVEL_3]: regexp.LEVEL_3_AZERTY,
    [Levels.LEVEL_4]: regexp.LEVEL_4_AZERTY,
    [Levels.LEVEL_5]: regexp.LEVEL_5_AZERTY,
  },
  [KeyboardLayoutNames.MACOS_NZ_QWERTY]: {
    [Levels.LEVEL_1]:regexp.LEVEL_1_QWERTY_MI,
    [Levels.LEVEL_2]: regexp.LEVEL_2_QWERTY_MI,
    [Levels.LEVEL_3]: regexp.LEVEL_3_QWERTY_MI,
  },
};

function getRegExp(levelName: Levels, keyboardName: KeyboardLayoutNames) {
  const defaultRegExp = /^[a-z]{1,6}$/;
  return regExpMap[keyboardName]?.[levelName] || defaultRegExp;
}

export const WordProvider = ({ children }) => {
  const settings = useSettings();
  const [wordList, setWordList] = useState([""]);

  const getWordList = useCallback(async () => {
    // @ts-expect-error
    const buffer = (await window.electronAPI.getWordSet(
      settings.language,
    )) as Uint8Array;

    const words = new TextDecoder("utf-8")
      .decode(buffer)
      .replaceAll("\r", "")
      .split("\n");

    console.log(`found ${words.length} words`);

    const filtered = words
      .filter((word) =>
        word.match(getRegExp(settings.levelName, settings.keyboardName)),
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
