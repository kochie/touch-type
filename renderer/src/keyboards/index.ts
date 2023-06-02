import { Key } from "@/keyboards/key";
import { MACOS_US_QWERTY } from "./EN_QWERTY";
import { MACOS_US_COLEMAK } from "./COLEMAK";
import { MACOS_US_DVORAK } from "./DVORAK";
import { MACOS_US_AZERTY } from "./AZERTY";
import { MACOS_DE_QWERTZ } from "./QWERTZ";
import { MACOS_ES_QWERTY } from "./ES_QWERTY";

export enum KeyboardLayoutNames {
  MACOS_US_QWERTY = "MACOS_US_QWERTY",
  MACOS_US_DVORAK = "MACOS_US_DVORAK",
  MACOS_US_COLEMAK = "MACOS_US_COLEMAK",
  MACOS_FR_AZERTY = "MACOS_FR_AZERTY",
  MACOS_DE_QWERTZ = "MACOS_DE_QWERTZ",
  MACOS_ES_QWERTY = "MACOS_ES_QWERTY",
}

export type KeyboardLayout = (Key | Key[])[][];

export {
  MACOS_US_DVORAK,
  MACOS_US_QWERTY,
  MACOS_US_COLEMAK,
  MACOS_US_AZERTY,
  MACOS_DE_QWERTZ,
  MACOS_ES_QWERTY,
};

export type { Key, Shape } from "./key";

export function lookupKeyboard(keyboardName: KeyboardLayoutNames) {
  switch (keyboardName) {
    case KeyboardLayoutNames.MACOS_US_COLEMAK:
      return MACOS_US_COLEMAK;
    case KeyboardLayoutNames.MACOS_US_DVORAK:
      return MACOS_US_DVORAK;
    case KeyboardLayoutNames.MACOS_US_QWERTY:
      return MACOS_US_QWERTY;
    case KeyboardLayoutNames.MACOS_FR_AZERTY:
      return MACOS_US_AZERTY;
    case KeyboardLayoutNames.MACOS_DE_QWERTZ:
      return MACOS_DE_QWERTZ;
    case KeyboardLayoutNames.MACOS_ES_QWERTY:
      return MACOS_ES_QWERTY;
    default:
      return MACOS_US_QWERTY;
  }
}
