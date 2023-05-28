"use client";
import {
  Dispatch,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useState,
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

const SettingsContext = createContext({
  keyboard: MACOS_US_QWERTY,
  level: LEVEL_1,
  analytics: true,
  levelName: Levels.LEVEL_1,
  keyboardName: KeyboardLayouts.MACOS_US_QWERTY,
  whatsNewOnStartup: true,
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
  keyboard: MACOS_US_QWERTY,
  keyboardName: KeyboardLayouts.MACOS_US_QWERTY,
  level: LEVEL_1,
  levelName: Levels.LEVEL_1,
  analytics: true,
  whatsNewOnStartup: true,
};

export const SettingsProvider = ({ children }) => {
  // const [initialSettings, setInitalSettings] = useState();

  // useLayoutEffect(() => {
  //   // console.log("USE LAYOUT EFFECT")

  //   setInitalSettings();
  //   console.log("USE LAYOUT EFFECT", { ...initialSettings, ...savedSettings });
  // }, []);

  const [settings, dispatch] = useReducer(reducer, null, () => {
    if (typeof localStorage === 'undefined') return { ...defaultSettings };
    
    const savedSettings = JSON.parse(localStorage.getItem("settings") || "{}");
    if (savedSettings.level) {
      savedSettings.level = new RegExp(
        savedSettings.level.pattern,
        savedSettings.level.flags
      );
      // console.log("GOT FROM LOCAL");
      return { ...defaultSettings, ...savedSettings };
    }
  });

  // console.log("SETTINGS", settings);

  const [mutateFunction] = useMutation(PUT_SETTINGS);
  const [user] = useUser();

  // console.log(user)

  function saveSettings(safeSettings) {
    if (!user) return;

    // console.log(user)
    mutateFunction({
      variables: { userId: user.username, settings: safeSettings },
    });
  }

  useEffect(() => {
    const safeSettings = {
      ...settings,
      level: { pattern: settings.level.source, flags: settings.level.flags },
    };

    console.log("USE EFFECT", settings);
    localStorage.setItem("settings", JSON.stringify(safeSettings));

    saveSettings(safeSettings);
  }, [settings]);

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
