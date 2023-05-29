"use client";
import {
  Dispatch,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import {
  KeyboardLayout,
  MACOS_US_DVORAK,
  MACOS_US_QWERTY,
} from "./keyboard_layouts";
import { LEVEL_1, LEVEL_2, LEVEL_3 } from "./levels";
import { useMutation } from "@apollo/client";
import { PUT_SETTINGS } from "@/transactions/putSettings";
import { useUser } from "./user_hook";

export enum KeyboardLayouts {
  MACOS_US_QWERTY = "MACOS_US_QWERTY",
  MACOS_US_DVORAK = "MACOS_US_DVORAK",
}

export interface Settings {
  keyboard: KeyboardLayout;
  level: RegExp;
}

export interface SettingsInput {
  keyboard: KeyboardLayouts;
  level: Levels;
}

export enum Levels {
  LEVEL_1 = "1",
  LEVEL_2 = "2",
  LEVEL_3 = "3",
}

export enum ColorScheme {
  DARK = "dark",
  LIGHT = "light",
  SYSTEM = "system"
}

export enum Languages {
  ENGLISH = "en",
  FRENCH = "fr",
  GERMAN = "de",
  SPANISH = "es"
}

const SettingsContext = createContext({
  language: Languages.ENGLISH,
  keyboard: MACOS_US_QWERTY,
  level: LEVEL_1,
  analytics: true,
  levelName: Levels.LEVEL_1,
  keyboardName: KeyboardLayouts.MACOS_US_QWERTY,
  whatsNewOnStartup: true,
  prefersColorScheme: ColorScheme.SYSTEM
});

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_ANALYTICS": {
      return {
        ...state,
        analytics: action.analytics,
      };
    }
    case "SET_WHATS_NEW": {
      return {
        ...state,
        whatsNewOnStartup: action.whatsnew,
      };
    }
    case "CHANGE_COLOR_SCHEME": {
      return {
        ...state,
        prefersColorScheme: action.colorScheme
      }
    }
    case "CHANGE_LANGUAGE": {
      return {
        ...state,
        language: action.language
      }
    }
    case "CHANGE_KEYBOARD":
      switch (action.keyboardName) {
        case KeyboardLayouts.MACOS_US_QWERTY:
          return {
            ...state,
            keyboard: MACOS_US_QWERTY,
            keyboardName: KeyboardLayouts.MACOS_US_QWERTY,
          };
        case KeyboardLayouts.MACOS_US_DVORAK:
          return {
            ...state,
            keyboard: MACOS_US_DVORAK,
            keyboardName: KeyboardLayouts.MACOS_US_DVORAK,
          };
      }
    case "CHANGE_LEVEL":
      // console.log(action);
      switch (action.levelName) {
        case Levels.LEVEL_1:
          return { ...state, level: LEVEL_1, levelName: Levels.LEVEL_1 };
        case Levels.LEVEL_2:
          return { ...state, level: LEVEL_2, levelName: Levels.LEVEL_2 };
        case Levels.LEVEL_3:
          return { ...state, level: LEVEL_3, levelName: Levels.LEVEL_3 };
      }
    default:
      return { ...state };
  }
};

const SettingsDispatchContext = createContext<Dispatch<any>>(() => {});

const defaultSettings = {
  language: Languages.ENGLISH,
  keyboard: MACOS_US_QWERTY,
  keyboardName: KeyboardLayouts.MACOS_US_QWERTY,
  level: LEVEL_1,
  levelName: Levels.LEVEL_1,
  analytics: true,
  whatsNewOnStartup: true,
  prefersColorScheme: ColorScheme.SYSTEM
};

export const SettingsProvider = ({ children }) => {
  const [settings, dispatch] = useReducer(reducer, null, () => {
    if (typeof localStorage === "undefined") return { ...defaultSettings };

    const savedSettings = JSON.parse(localStorage.getItem("settings") || "{}");
    if (savedSettings.level) {
      savedSettings.level = new RegExp(
        savedSettings.level?.pattern,
        savedSettings.level?.flags
      );
    }
    return { ...defaultSettings, ...savedSettings }
  });

  const [mutateFunction] = useMutation(PUT_SETTINGS);
  const [user] = useUser();

  const saveSettings = useCallback((safeSettings) => {
    if (!user) return;

    mutateFunction({
      variables: { userId: user.username, settings: safeSettings },
    });
  }, [user, mutateFunction])

  useEffect(() => {
    // console.log("RUNNING", settings.prefersColorScheme)
    if ( settings.prefersColorScheme === ColorScheme.DARK || (settings.prefersColorScheme === ColorScheme.SYSTEM && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.prefersColorScheme])

  useEffect(() => {
    const safeSettings = {
      ...settings,
      level: { pattern: settings.level.source, flags: settings.level.flags },
    };

    // console.log("USE EFFECT", settings);
    localStorage.setItem("settings", JSON.stringify(safeSettings));

    saveSettings(safeSettings);
  }, [settings, saveSettings]);

  if (!dispatch) {
    console.error("No dispatch");
  }

  return (
    <SettingsContext.Provider value={settings}>
      <SettingsDispatchContext.Provider value={dispatch}>
        {children}
      </SettingsDispatchContext.Provider>
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  return useContext(SettingsContext);
}

export function useSettingsDispatch() {
  return useContext(SettingsDispatchContext);
}
