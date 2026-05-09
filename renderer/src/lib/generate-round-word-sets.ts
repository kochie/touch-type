import type { MatchSettings } from "@/lib/pvp-provider";
import * as regexp from "@/lib/levels";
import { Levels } from "@/lib/settings_hook";
import { KeyboardLayoutNames } from "@/keyboards";
import naughty from "naughty-words";

const WORD_COUNT = 15;

const regExpMap: Partial<
  Record<KeyboardLayoutNames, Partial<Record<Levels, RegExp>>>
> = {
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
  [KeyboardLayoutNames.MACOS_FR_AZERTY]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_AZERTY,
    [Levels.LEVEL_2]: regexp.LEVEL_2_AZERTY,
    [Levels.LEVEL_3]: regexp.LEVEL_3_AZERTY,
    [Levels.LEVEL_4]: regexp.LEVEL_4_AZERTY,
    [Levels.LEVEL_5]: regexp.LEVEL_5_AZERTY,
    [Levels.LEVEL_6]: regexp.LEVEL_6_AZERTY,
  },
  [KeyboardLayoutNames.MACOS_NZ_QWERTY]: {
    [Levels.LEVEL_1]: regexp.LEVEL_1_QWERTY_MI,
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
};

function getRegExp(level: string, keyboard: string): RegExp {
  const defaultRegExp = /^[a-z]{1,6}$/;
  return (
    regExpMap[keyboard as KeyboardLayoutNames]?.[level as Levels] ??
    defaultRegExp
  );
}

function pickWords(wordList: string[], count: number): string[] {
  const shuffled = [...wordList].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generates `bestOf` independent word sets for a PvP match.
 * Async because it uses the Electron IPC bridge to load the raw word file.
 * Falls back to an empty word list if electronAPI is not available
 * (e.g. renderer-only dev mode).
 */
export async function generateRoundWordSets(
  bestOf: number,
  settings: MatchSettings,
): Promise<string[][]> {
  let wordList: string[] = [];

  if (typeof window !== "undefined" && window.electronAPI?.getWordSet) {
    const buffer = (await window.electronAPI.getWordSet(
      settings.language,
    )) as Uint8Array;

    const words = new TextDecoder("utf-8")
      .decode(buffer)
      .replaceAll("\r", "")
      .split("\n");

    const pattern = getRegExp(settings.level, settings.keyboard);

    let filtered = words
      .filter((word) => word.match(pattern))
      .filter((word) => !naughty.en.includes(word));

    if (settings.capital) {
      filtered = filtered.map((word) => word[0].toUpperCase() + word.slice(1));
    }

    if (settings.numbers) {
      filtered = filtered.map(
        (word) => word + Math.floor(Math.random() * 100),
      );
    }

    if (settings.punctuation) {
      filtered = filtered.map((word) => {
        const punc = regexp.PUNCTUATION;
        return word + punc[Math.floor(Math.random() * punc.length)];
      });
    }

    wordList = filtered;
  }

  const out: string[][] = [];
  for (let i = 0; i < bestOf; i++) {
    out.push(pickWords(wordList, WORD_COUNT));
  }
  return out;
}
