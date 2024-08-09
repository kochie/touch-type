"use client";

import {
  Dispatch,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
} from "react";
import { KeyboardLayout, KeyboardLayoutNames } from "@/keyboards";
import { useMutation } from "@apollo/client";
import { UPDATE_SETTINGS } from "@/transactions/putSettings";
import { useUser } from "./user_hook";
import { InputSettings } from "@/generated/graphql";

export interface Settings {
  keyboard: KeyboardLayout;
  level: RegExp;
}

export interface SettingsInput {
  keyboard: KeyboardLayoutNames;
  level: Levels;
}

export enum Levels {
  LEVEL_1 = "1",
  LEVEL_2 = "2",
  LEVEL_3 = "3",
  LEVEL_4 = "4",
  LEVEL_5 = "5",
  LEVEL_6 = "6",
}

export enum ColorScheme {
  DARK = "dark",
  LIGHT = "light",
  SYSTEM = "system",
}

export enum Languages {
  ENGLISH = "en",
  FRENCH = "fr",
  GERMAN = "de",
  SPANISH = "es",
  MAORI = "mi",
}

const SettingsContext = createContext({
  language: Languages.ENGLISH,
  analytics: true,
  levelName: Levels.LEVEL_1,
  keyboardName: KeyboardLayoutNames.MACOS_US_QWERTY,
  whatsNewOnStartup: true,
  theme: ColorScheme.SYSTEM,
  publishToLeaderboard: true,
  blinker: true,
  punctuation: false,
  numbers: false,
  capital: false,
});

export const defaultSettings = {
  language: Languages.ENGLISH,
  keyboardName: KeyboardLayoutNames.MACOS_US_QWERTY,
  levelName: Levels.LEVEL_1,
  analytics: true,
  whatsNewOnStartup: true,
  theme: ColorScheme.SYSTEM,
  publishToLeaderboard: true,
  blinker: true,
  punctuation: false,
  numbers: false,
  capital: false,
};

type ChangeSettingsAction =
  | {
      type: "LOAD_SETTINGS";
      settings: typeof defaultSettings;
    }
  | {
      type: "SET_ANALYTICS";
      analytics: boolean;
    }
  | {
      type: "SET_PUBLISH_TO_LEADERBOARD";
      publishToLeaderboard: boolean;
    }
  | {
      type: "SET_WHATS_NEW";
      whatsnew: boolean;
    }
  | {
      type: "CHANGE_COLOR_SCHEME";
      colorScheme: ColorScheme;
    }
  | {
      type: "CHANGE_LANGUAGE";
      language: Languages;
    }
  | {
      type: "CHANGE_KEYBOARD";
      keyboardName: KeyboardLayoutNames;
    }
  | {
      type: "CHANGE_LEVEL";
      levelName: Levels;
    }
  | {
      type: "SET_BLINKER";
      blinker: boolean;
    }
  | {
      type: "SET_PUNCTUATION";
      punctuation: boolean;
    }
  | {
      type: "SET_NUMBERS";
      numbers: boolean;
    }
  | {
      type: "SET_CAPITAL";
      capital: boolean;
    };
  

const reducer = (
  state: typeof defaultSettings,
  action: ChangeSettingsAction,
) => {
  if (process.env.NODE_ENV === "development") {
    console.log("Settings reducer", action);
  }

  switch (action.type) {
    case "LOAD_SETTINGS": {
      return {
        ...state,
        ...action.settings,
      };
    }
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
        theme: action.colorScheme,
      };
    }
    case "CHANGE_LANGUAGE": {
      return {
        ...state,
        language: action.language,
      };
    }

    case "CHANGE_KEYBOARD":
      return {
        ...state,
        keyboardName: action.keyboardName,
      };

    case "CHANGE_LEVEL":
      return {
        ...state,
        levelName: action.levelName,
      };

    case "SET_PUBLISH_TO_LEADERBOARD":
      return {
        ...state,
        publishToLeaderboard: action.publishToLeaderboard,
      };

    case "SET_BLINKER":
      return {
        ...state,
        blinker: action.blinker,
      };
    
    case "SET_PUNCTUATION":
      return {
        ...state,
        punctuation: action.punctuation,
      };
    
    case "SET_NUMBERS":
      return {
        ...state,
        numbers: action.numbers,
      };

    case "SET_CAPITAL":
      return {
        ...state,
        capital: action.capital,
      };

    default:
      return { ...state };
  }
};

const SettingsDispatchContext = createContext<Dispatch<ChangeSettingsAction>>(
  () => {},
);

export const SettingsProvider = ({ children }) => {
  const [settings, dispatch] = useReducer(reducer, null, () => {
    if (typeof localStorage === "undefined") return { ...defaultSettings };

    const savedSettings = JSON.parse(localStorage.getItem("settings") || "{}");

    return { ...defaultSettings, ...savedSettings };
  });

  useLayoutEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem("settings") || "{}");
    
    dispatch({type: "LOAD_SETTINGS", settings: savedSettings });
  }, [])

  const [mutateFunction] = useMutation(UPDATE_SETTINGS);
  const user = useUser();

  const saveSettings = useCallback(
    (safeSettings: InputSettings) => {
      if (!user) return;

      mutateFunction({
        variables: { settings: safeSettings },
      });
    },
    [user, mutateFunction],
  );

  useLayoutEffect(() => {
    if (
      settings.theme === ColorScheme.DARK ||
      (settings.theme === ColorScheme.SYSTEM &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.theme]);

  useEffect(() => {
    const safeSettings = {
      ...settings,
    };

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
  const settings = useContext(SettingsContext);
  return settings;
}

export function useSettingsDispatch() {
  return useContext(SettingsDispatchContext);
}
