import { createContext, useContext, useReducer, useState } from "react";
import {
  KeyboardLayout,
  MACOS_US_DVORAK,
  MACOS_US_QWERTY,
} from "./keyboard_layouts";
import { LEVEL_1, LEVEL_2, LEVEL_3 } from "./levels";

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
});

const SettingsDispatchContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case "CHANGE_KEYBOARD":
      switch (action.keyboard) {
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
      console.log(action);
      switch (action.level) {
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

export const SettingsProvider = ({ children }) => {
  const [settings, dispatch] = useReducer(reducer, {
    keyboard: MACOS_US_QWERTY,
    keyboardName: KeyboardLayouts.MACOS_US_QWERTY,
    level: LEVEL_1,
    levelName: Levels.LEVEL_1,
    analytics: true,
  });

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
