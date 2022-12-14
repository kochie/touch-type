import { useEffect, useReducer } from "react";
import * as Fathom from "fathom-client";

import styles from "./settings.module.css";
import {
  KeyboardLayouts,
  Levels,
  useSettings,
  useSettingsDispatch,
} from "../../lib/settings_hook";

const initialState = {
  analytics: true,
  keyboard: KeyboardLayouts.MACOS_US_QWERTY,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "TOGGLE_ANALYTICS":
      !state.analytics
        ? Fathom.enableTrackingForMe()
        : Fathom.blockTrackingForMe();
      return {
        ...state,
        analytics: !state.analytics,
      };
    case "CHANGE_KEYBOARD": {
      return {
        ...state,
        keyboard: action.keyboard,
      };
    }
    case "CHANGE_LEVEL": {
      return {
        ...state,
        level: action.level,
      };
    }
    case "SYNC":
      return {
        ...state,
        ...action.payload,
      };
    default:
      return { ...state };
  }
};

const Settings = () => {
  const [settings, dispatch] = useReducer(reducer, initialState);
  const dispatchSettings = useSettingsDispatch();

  useEffect(() => {
    const storedSettings = localStorage.getItem("settings");
    dispatch({
      type: "SYNC",
      payload: storedSettings ? JSON.parse(storedSettings) : initialState,
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="flex p-9">
      <form className="flex flex-col gap-6">
        <label className={styles.switch}>
          Send Analytics
          <input
            className=""
            type="checkbox"
            checked={settings.analytics}
            onChange={() => dispatch({ type: "TOGGLE_ANALYTICS" })}
          />
          <span className={`${styles.slider} ${styles.round} `}></span>
        </label>

        <label>
          Keyboard
          <select
            className="text-black ml-5"
            value={settings.keyboard}
            onChange={(e) => {
              dispatch({ type: "CHANGE_KEYBOARD", keyboard: e.target.value });
              dispatchSettings({
                type: "CHANGE_KEYBOARD",
                keyboard: e.target.value,
              });
            }}
          >
            <option value={KeyboardLayouts.MACOS_US_DVORAK}>
              MAC US DVORAK
            </option>
            <option value={KeyboardLayouts.MACOS_US_QWERTY}>
              MAC US QWERTY
            </option>
          </select>
        </label>

        <label>
          Level
          <select
            className="text-black ml-5"
            value={settings.level}
            onChange={(e) => {
              dispatch({ type: "CHANGE_LEVEL", level: e.target.value });
              dispatchSettings({
                type: "CHANGE_LEVEL",
                level: e.target.value,
              });
            }}
          >
            <option value={Levels.LEVEL_1}>Level 1</option>
            <option value={Levels.LEVEL_2}>Level 2</option>
            <option value={Levels.LEVEL_3}>Level 3</option>
          </select>
        </label>
      </form>
    </div>
  );
};

export default Settings;
