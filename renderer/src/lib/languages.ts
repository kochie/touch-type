import { KeyboardLayoutNames } from "@/keyboards";
import { Languages } from "@/lib/settings_hook";

export interface LanguageEntry {
  value: Languages;
  label: string;
  preferredKeyboards: KeyboardLayoutNames[];
}

export const LANGUAGES: LanguageEntry[] = [
  {
    value: Languages.ENGLISH,
    label: "English",
    preferredKeyboards: [
      KeyboardLayoutNames.MACOS_US_QWERTY,
      KeyboardLayoutNames.MACOS_GB_QWERTY,
      KeyboardLayoutNames.MACOS_US_COLEMAK,
      KeyboardLayoutNames.MACOS_US_COLEMAK_DH,
      KeyboardLayoutNames.MACOS_US_DVORAK,
    ],
  },
  {
    value: Languages.FRENCH,
    label: "French",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_FR_AZERTY],
  },
  {
    value: Languages.GERMAN,
    label: "German",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_DE_QWERTZ],
  },
  {
    value: Languages.SPANISH,
    label: "Spanish",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_ES_QWERTY],
  },
  {
    value: Languages.MAORI,
    label: "Māori",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_NZ_QWERTY],
  },
  {
    value: Languages.ITALIAN,
    label: "Italian",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_IT_QWERTY],
  },
  {
    value: Languages.PORTUGUESE_BR,
    label: "Portuguese (Brazil)",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_BR_ABNT2],
  },
  {
    value: Languages.DUTCH,
    label: "Dutch",
    preferredKeyboards: [
      KeyboardLayoutNames.MACOS_US_QWERTY,
      KeyboardLayoutNames.MACOS_GB_QWERTY,
    ],
  },
];
