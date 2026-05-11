import { Key } from "@/keyboards/key";
import { MACOS_US_QWERTY } from "./EN_QWERTY";
import { MACOS_US_COLEMAK } from "./COLEMAK";
import { MACOS_US_COLEMAK_DH } from "./COLEMAK_DH";
import { MACOS_US_DVORAK } from "./DVORAK";
import { MACOS_US_AZERTY } from "./AZERTY";
import { MACOS_DE_QWERTZ } from "./QWERTZ";
import { MACOS_ES_QWERTY } from "./ES_QWERTY";
import { MACOS_NZ_QWERTY } from "./NZ_QWERTY";
import { MACOS_GB_QWERTY } from "./GB_QWERTY";
import { MACOS_SE_NORDIC } from "./SE_NORDIC";
import { MACOS_BR_ABNT2 } from "./BR_ABNT2";
import { MACOS_IT_QWERTY } from "./IT_QWERTY";
import { MACOS_NO_NORDIC } from "./NO_NORDIC";
import { MACOS_DA_NORDIC } from "./DA_NORDIC";
import { MACOS_FI_NORDIC } from "./FI_NORDIC";
import { MACOS_CA_QWERTY } from "./CA_QWERTY";
import { MACOS_NL_QWERTY } from "./NL_QWERTY";
import { MACOS_PT_QWERTY } from "./PT_QWERTY";
import { MACOS_PL_QWERTY } from "./PL_QWERTY";
import { MACOS_TR_QWERTY } from "./TR_QWERTY";

export enum KeyboardLayoutNames {
  MACOS_US_QWERTY = "MACOS_US_QWERTY",
  MACOS_US_DVORAK = "MACOS_US_DVORAK",
  MACOS_US_COLEMAK = "MACOS_US_COLEMAK",
  MACOS_US_COLEMAK_DH = "MACOS_US_COLEMAK_DH",
  MACOS_FR_AZERTY = "MACOS_FR_AZERTY",
  MACOS_DE_QWERTZ = "MACOS_DE_QWERTZ",
  MACOS_ES_QWERTY = "MACOS_ES_QWERTY",
  MACOS_NZ_QWERTY = "MACOS_NZ_QWERTY",
  MACOS_GB_QWERTY = "MACOS_GB_QWERTY",
  MACOS_SE_NORDIC = "MACOS_SE_NORDIC",
  MACOS_BR_ABNT2 = "MACOS_BR_ABNT2",
  MACOS_IT_QWERTY = "MACOS_IT_QWERTY",
  MACOS_NO_NORDIC = "MACOS_NO_NORDIC",
  MACOS_DA_NORDIC = "MACOS_DA_NORDIC",
  MACOS_FI_NORDIC = "MACOS_FI_NORDIC",
  MACOS_CA_QWERTY = "MACOS_CA_QWERTY",
  MACOS_NL_QWERTY = "MACOS_NL_QWERTY",
  MACOS_PT_QWERTY = "MACOS_PT_QWERTY",
  MACOS_PL_QWERTY = "MACOS_PL_QWERTY",
  MACOS_TR_QWERTY = "MACOS_TR_QWERTY",
}

export type KeyboardLayout = (Key | Key[])[][];

export {
  MACOS_US_DVORAK,
  MACOS_US_QWERTY,
  MACOS_US_COLEMAK,
  MACOS_US_COLEMAK_DH,
  MACOS_US_AZERTY,
  MACOS_DE_QWERTZ,
  MACOS_ES_QWERTY,
  MACOS_NZ_QWERTY,
  MACOS_GB_QWERTY,
  MACOS_SE_NORDIC,
  MACOS_BR_ABNT2,
  MACOS_IT_QWERTY,
  MACOS_NO_NORDIC,
  MACOS_DA_NORDIC,
  MACOS_FI_NORDIC,
  MACOS_CA_QWERTY,
  MACOS_NL_QWERTY,
  MACOS_PT_QWERTY,
  MACOS_PL_QWERTY,
  MACOS_TR_QWERTY,
};

export type { Key, Shape } from "./key";

export function lookupKeyboard(keyboardName: KeyboardLayoutNames) {
  switch (keyboardName) {
    case KeyboardLayoutNames.MACOS_US_COLEMAK:
      return MACOS_US_COLEMAK;
    case KeyboardLayoutNames.MACOS_US_COLEMAK_DH:
      return MACOS_US_COLEMAK_DH;
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
    case KeyboardLayoutNames.MACOS_NZ_QWERTY:
      return MACOS_NZ_QWERTY;
    case KeyboardLayoutNames.MACOS_GB_QWERTY:
      return MACOS_GB_QWERTY;
    case KeyboardLayoutNames.MACOS_SE_NORDIC:
      return MACOS_SE_NORDIC;
    case KeyboardLayoutNames.MACOS_BR_ABNT2:
      return MACOS_BR_ABNT2;
    case KeyboardLayoutNames.MACOS_IT_QWERTY:
      return MACOS_IT_QWERTY;
    case KeyboardLayoutNames.MACOS_NO_NORDIC:
      return MACOS_NO_NORDIC;
    case KeyboardLayoutNames.MACOS_DA_NORDIC:
      return MACOS_DA_NORDIC;
    case KeyboardLayoutNames.MACOS_FI_NORDIC:
      return MACOS_FI_NORDIC;
    case KeyboardLayoutNames.MACOS_CA_QWERTY:
      return MACOS_CA_QWERTY;
    case KeyboardLayoutNames.MACOS_NL_QWERTY:
      return MACOS_NL_QWERTY;
    case KeyboardLayoutNames.MACOS_PT_QWERTY:
      return MACOS_PT_QWERTY;
    case KeyboardLayoutNames.MACOS_PL_QWERTY:
      return MACOS_PL_QWERTY;
    case KeyboardLayoutNames.MACOS_TR_QWERTY:
      return MACOS_TR_QWERTY;
    default:
      return MACOS_US_QWERTY;
  }
}
