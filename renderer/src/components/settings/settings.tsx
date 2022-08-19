import { useEffect, useReducer } from "react";
import * as Fathom from "fathom-client";

import styles from "./settings.module.css";

const initialState = {
  analytics: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "TOGGLE_ANALYTICS":
      // console.log(state);

      !state.analytics
        ? Fathom.enableTrackingForMe()
        : Fathom.blockTrackingForMe();
      return {
        ...state,
        analytics: !state.analytics,
      };
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

  // console.log(settings);
  return (
    <div className="flex p-9">
      <form>
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
      </form>
    </div>
  );
};

export default Settings;
