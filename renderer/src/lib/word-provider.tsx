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
    [Levels.LEVEL_6]: regexp.LEVEL_6_QWERTY,
  },
  [KeyboardLayoutNames.MACOS_US_DVORAK]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_DVORAK,
    [Levels.LEVEL_2]: regexp.LEVEL_2_DVORAK,
    [Levels.LEVEL_3]: regexp.LEVEL_3_DVORAK,
    [Levels.LEVEL_4]: regexp.LEVEL_4_DVORAK,
    [Levels.LEVEL_5]: regexp.LEVEL_5_DVORAK,
    [Levels.LEVEL_6]: regexp.LEVEL_6_DVORAK,
  },
  [KeyboardLayoutNames.MACOS_US_COLEMAK]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_COLEMAK,
    [Levels.LEVEL_2]: regexp.LEVEL_2_COLEMAK,
    [Levels.LEVEL_3]: regexp.LEVEL_3_COLEMAK,
    [Levels.LEVEL_4]: regexp.LEVEL_4_COLEMAK,
    [Levels.LEVEL_5]: regexp.LEVEL_5_COLEMAK,
    [Levels.LEVEL_6]: regexp.LEVEL_6_COLEMAK,
  },
  [KeyboardLayoutNames.MACOS_US_COLEMAK_DH]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_COLEMAK_DH,
    [Levels.LEVEL_2]: regexp.LEVEL_2_COLEMAK_DH,
    [Levels.LEVEL_3]: regexp.LEVEL_3_COLEMAK_DH,
    [Levels.LEVEL_4]: regexp.LEVEL_4_COLEMAK_DH,
    [Levels.LEVEL_5]: regexp.LEVEL_5_COLEMAK_DH,
    [Levels.LEVEL_6]: regexp.LEVEL_6_COLEMAK_DH,
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
    [Levels.LEVEL_4]: regexp.LEVEL_4_QWERTY_MI,
    [Levels.LEVEL_5]: regexp.LEVEL_5_QWERTY_MI,
    [Levels.LEVEL_6]: regexp.LEVEL_6_QWERTY_MI,
  },
  [KeyboardLayoutNames.MACOS_DE_QWERTZ]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_QWERTZ,
    [Levels.LEVEL_2]: regexp.LEVEL_2_QWERTZ,
    [Levels.LEVEL_3]: regexp.LEVEL_3_QWERTZ,
    [Levels.LEVEL_4]: regexp.LEVEL_4_QWERTZ,
    [Levels.LEVEL_5]: regexp.LEVEL_5_QWERTZ,
    [Levels.LEVEL_6]: regexp.LEVEL_6_QWERTZ,
  },
  [KeyboardLayoutNames.MACOS_ES_QWERTY]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_QWERTY,
    [Levels.LEVEL_2]: regexp.LEVEL_2_QWERTY,
    [Levels.LEVEL_3]: regexp.LEVEL_3_QWERTY,
    [Levels.LEVEL_4]: regexp.LEVEL_4_QWERTY,
    [Levels.LEVEL_5]: regexp.LEVEL_5_QWERTY,
    [Levels.LEVEL_6]: regexp.LEVEL_6_QWERTY,
  },
  [KeyboardLayoutNames.MACOS_GB_QWERTY]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_GB_QWERTY,
    [Levels.LEVEL_2]: regexp.LEVEL_2_GB_QWERTY,
    [Levels.LEVEL_3]: regexp.LEVEL_3_GB_QWERTY,
    [Levels.LEVEL_4]: regexp.LEVEL_4_GB_QWERTY,
    [Levels.LEVEL_5]: regexp.LEVEL_5_GB_QWERTY,
    [Levels.LEVEL_6]: regexp.LEVEL_6_GB_QWERTY,
  },
  [KeyboardLayoutNames.MACOS_SE_NORDIC]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_NORDIC,
    [Levels.LEVEL_2]: regexp.LEVEL_2_NORDIC,
    [Levels.LEVEL_3]: regexp.LEVEL_3_NORDIC,
    [Levels.LEVEL_4]: regexp.LEVEL_4_NORDIC,
    [Levels.LEVEL_5]: regexp.LEVEL_5_NORDIC,
    [Levels.LEVEL_6]: regexp.LEVEL_6_NORDIC,
  },
  [KeyboardLayoutNames.MACOS_BR_ABNT2]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_ABNT2,
    [Levels.LEVEL_2]: regexp.LEVEL_2_ABNT2,
    [Levels.LEVEL_3]: regexp.LEVEL_3_ABNT2,
    [Levels.LEVEL_4]: regexp.LEVEL_4_ABNT2,
    [Levels.LEVEL_5]: regexp.LEVEL_5_ABNT2,
    [Levels.LEVEL_6]: regexp.LEVEL_6_ABNT2,
  },
  [KeyboardLayoutNames.MACOS_IT_QWERTY]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_IT_QWERTY,
    [Levels.LEVEL_2]: regexp.LEVEL_2_IT_QWERTY,
    [Levels.LEVEL_3]: regexp.LEVEL_3_IT_QWERTY,
    [Levels.LEVEL_4]: regexp.LEVEL_4_IT_QWERTY,
    [Levels.LEVEL_5]: regexp.LEVEL_5_IT_QWERTY,
    [Levels.LEVEL_6]: regexp.LEVEL_6_IT_QWERTY,
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
    if (typeof window === "undefined" || !window.electronAPI?.getWordSet) {
      // Renderer is running outside Electron (e.g. `pnpm dev:next`) or the
      // preload bridge isn't ready yet during HMR. Render an empty list
      // rather than crashing the provider tree with an unhandled rejection.
      console.warn("electronAPI.getWordSet is not available — skipping word load.");
      setWordList([""]);
      return;
    }

    const buffer = (await window.electronAPI.getWordSet(
      settings.language,
    )) as Uint8Array;

    const words = new TextDecoder("utf-8")
      .decode(buffer)
      .replaceAll("\r", "")
      .split("\n");

    let filtered = words
      .filter((word) =>
        word.match(getRegExp(settings.levelName, settings.keyboardName)),
      )
      .filter((word) => !naughty.en.includes(word));

    if (settings.capital) {
      filtered = filtered.map((word) => word[0].toUpperCase()+word.slice(1));
    }

    if (settings.numbers) {
      filtered = filtered.map((word) => word + Math.floor(Math.random() * 100));
    }

    if (settings.punctuation) {
      filtered = filtered.map((word) => {
        const punc = regexp.PUNCTUATION
        return word + punc[Math.floor(Math.random() * punc.length)];
      });
    }

    setWordList(filtered);
  }, [settings.levelName, settings.language, settings.keyboardName, settings.capital, settings.numbers, settings.punctuation]);

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
