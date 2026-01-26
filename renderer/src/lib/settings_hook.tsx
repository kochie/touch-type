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
import { useSupabase } from "./supabase-provider";

export interface Settings {
  keyboard: KeyboardLayout;
  level: RegExp;
}

export interface SettingsInput {
  keyboard: KeyboardLayoutNames;
  level: Levels;
}

export enum Levels {
  LEVEL_0 = "0",
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

export enum CodeLanguages {
  C = "c",
  PYTHON = "python",
  JAVASCRIPT = "javascript",
}

export enum SnippetSource {
  BUNDLED = "bundled",
  GENERATED = "generated",
  FILE = "file",
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
  // Notification settings
  notificationsEnabled: false,
  notificationTime: "09:00",
  notificationDays: ["mon", "tue", "wed", "thu", "fri"] as string[],
  notificationMessage: "Time to practice your typing!",
  practiceDuration: 5,
  scheduleEnabled: false,
  // Code mode settings
  codeMode: false,
  codeLang: CodeLanguages.C,
  codeSnippetSource: SnippetSource.BUNDLED,
  customCodePath: "",
  tabWidth: 4,
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
  // Notification settings
  notificationsEnabled: false,
  notificationTime: "09:00",
  notificationDays: ["mon", "tue", "wed", "thu", "fri"] as string[],
  notificationMessage: "Time to practice your typing!",
  practiceDuration: 5,
  scheduleEnabled: false,
  // Code mode settings
  codeMode: false,
  codeLang: CodeLanguages.C,
  codeSnippetSource: SnippetSource.BUNDLED,
  customCodePath: "",
  tabWidth: 4,
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
    }
  | {
      type: "SET_NOTIFICATIONS_ENABLED";
      enabled: boolean;
    }
  | {
      type: "SET_NOTIFICATION_TIME";
      time: string;
    }
  | {
      type: "SET_NOTIFICATION_DAYS";
      days: string[];
    }
  | {
      type: "SET_NOTIFICATION_MESSAGE";
      message: string;
    }
  | {
      type: "SET_PRACTICE_DURATION";
      duration: number;
    }
  | {
      type: "SET_SCHEDULE_ENABLED";
      enabled: boolean;
    }
  | {
      type: "SET_CODE_MODE";
      enabled: boolean;
    }
  | {
      type: "SET_CODE_LANG";
      codeLang: CodeLanguages;
    }
  | {
      type: "SET_CODE_SNIPPET_SOURCE";
      source: SnippetSource;
    }
  | {
      type: "SET_CUSTOM_CODE_PATH";
      path: string;
    }
  | {
      type: "SET_TAB_WIDTH";
      width: number;
    };


const reducer = (
  state: typeof defaultSettings,
  action: ChangeSettingsAction,
) => {
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

    case "SET_NOTIFICATIONS_ENABLED":
      return {
        ...state,
        notificationsEnabled: action.enabled,
      };

    case "SET_NOTIFICATION_TIME":
      return {
        ...state,
        notificationTime: action.time,
      };

    case "SET_NOTIFICATION_DAYS":
      return {
        ...state,
        notificationDays: action.days,
      };

    case "SET_NOTIFICATION_MESSAGE":
      return {
        ...state,
        notificationMessage: action.message,
      };

    case "SET_PRACTICE_DURATION":
      return {
        ...state,
        practiceDuration: action.duration,
      };

    case "SET_SCHEDULE_ENABLED":
      return {
        ...state,
        scheduleEnabled: action.enabled,
      };

    case "SET_CODE_MODE":
      return {
        ...state,
        codeMode: action.enabled,
      };

    case "SET_CODE_LANG":
      return {
        ...state,
        codeLang: action.codeLang,
      };

    case "SET_CODE_SNIPPET_SOURCE":
      return {
        ...state,
        codeSnippetSource: action.source,
      };

    case "SET_CUSTOM_CODE_PATH":
      return {
        ...state,
        customCodePath: action.path,
      };

    case "SET_TAB_WIDTH":
      return {
        ...state,
        tabWidth: action.width,
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

  const { supabase, user } = useSupabase();

  useLayoutEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem("settings") || "{}");
    
    dispatch({type: "LOAD_SETTINGS", settings: savedSettings });
  }, [])

  // Sync settings from Supabase when user logs in
  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        // Convert snake_case from DB to camelCase
        const dbSettings = {
          analytics: data.analytics,
          blinker: data.blinker,
          capital: data.capital,
          keyboardName: data.keyboard_name as KeyboardLayoutNames,
          language: data.language as Languages,
          levelName: data.level_name as Levels,
          numbers: data.numbers,
          publishToLeaderboard: data.publish_to_leaderboard,
          punctuation: data.punctuation,
          theme: data.theme as ColorScheme,
          whatsNewOnStartup: data.whats_new_on_startup,
          // Notification settings
          notificationsEnabled: data.notifications_enabled ?? false,
          notificationTime: data.notification_time ?? "09:00",
          notificationDays: data.notification_days ?? ["mon", "tue", "wed", "thu", "fri"],
          notificationMessage: data.notification_message ?? "Time to practice your typing!",
          practiceDuration: data.practice_duration ?? 5,
          scheduleEnabled: data.schedule_enabled ?? false,
          // Code mode settings
          codeMode: data.code_mode ?? false,
          codeLang: (data.code_lang as CodeLanguages) ?? CodeLanguages.C,
          codeSnippetSource: (data.code_snippet_source as SnippetSource) ?? SnippetSource.BUNDLED,
          customCodePath: data.custom_code_path ?? "",
          tabWidth: data.tab_width ?? 4,
        };
        dispatch({ type: "LOAD_SETTINGS", settings: dbSettings });
      }
    };

    fetchSettings();
  }, [user, supabase]);

  const saveSettings = useCallback(
    async (safeSettings: typeof defaultSettings) => {
      if (!user) return;

      // Convert camelCase to snake_case for DB
      const dbSettings = {
        user_id: user.id,
        analytics: safeSettings.analytics,
        blinker: safeSettings.blinker,
        capital: safeSettings.capital,
        keyboard_name: safeSettings.keyboardName,
        language: safeSettings.language,
        level_name: safeSettings.levelName,
        numbers: safeSettings.numbers,
        publish_to_leaderboard: safeSettings.publishToLeaderboard,
        punctuation: safeSettings.punctuation,
        theme: safeSettings.theme,
        whats_new_on_startup: safeSettings.whatsNewOnStartup,
        // Notification settings
        notifications_enabled: safeSettings.notificationsEnabled,
        notification_time: safeSettings.notificationTime,
        notification_days: safeSettings.notificationDays,
        notification_message: safeSettings.notificationMessage,
        practice_duration: safeSettings.practiceDuration,
        schedule_enabled: safeSettings.scheduleEnabled,
        // Code mode settings
        code_mode: safeSettings.codeMode,
        code_lang: safeSettings.codeLang,
        code_snippet_source: safeSettings.codeSnippetSource,
        custom_code_path: safeSettings.customCodePath,
        tab_width: safeSettings.tabWidth,
      };

      const { error } = await supabase
        .from('settings')
        .upsert(dbSettings, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving settings:', error);
      }
    },
    [user, supabase],
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
