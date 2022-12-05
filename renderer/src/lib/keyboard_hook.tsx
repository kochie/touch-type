import { createContext, useContext, useRef, useState } from "react";
import {
  KeyboardLayout,
  MACOS_US_DVORAK,
  MACOS_US_QWERTY,
} from "./keyboard_layouts";

export enum KeyboardLayouts {
  MACOS_US_QWERTY = "MACOS_US_QWERTY",
  MACOS_US_DVORAK = "MACOS_US_DVORAK",
}

interface KeyboardStateContext {
  setKeyboard: (keyboard: KeyboardLayouts) => void;
  keyboard: KeyboardLayout;
}

const KeyboardContext = createContext<KeyboardStateContext>({
  keyboard: MACOS_US_QWERTY,
  setKeyboard: () => ({}),
});

export const KeyboardProvider = ({ children }) => {
  const [keyboard, _setKeyboard] = useState<KeyboardLayout>(MACOS_US_QWERTY);
  const ref = useRef(keyboard);

  const setKeyboard = (keyboard: KeyboardLayouts): void => {
    console.log(keyboard);
    switch (keyboard) {
      case KeyboardLayouts.MACOS_US_QWERTY:
        _setKeyboard(MACOS_US_QWERTY);
        ref.current = MACOS_US_QWERTY;
        break;
      case KeyboardLayouts.MACOS_US_DVORAK:
        _setKeyboard(MACOS_US_DVORAK);
        ref.current = MACOS_US_DVORAK;
    }
  };

  const value = { keyboard, setKeyboard };

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
};

export const useKeyboard = (): [
  KeyboardLayout,
  (keyboard: KeyboardLayouts) => void
] => {
  const { keyboard, setKeyboard } = useContext(KeyboardContext);
  return [keyboard, setKeyboard];
};
