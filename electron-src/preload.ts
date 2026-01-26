/* eslint-disable @typescript-eslint/no-namespace */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ipcRenderer, IpcRenderer, contextBridge } from "electron";

// Types for notification configuration
export interface NotificationConfig {
  enabled: boolean;
  time: string;
  days: string[];
  message: string;
  duration: number;
}

export interface ScheduleResult {
  success: boolean;
  error?: string;
}

export interface DeepLinkData {
  action: "practice" | "settings" | "stats";
  duration?: number;
  mode?: "timed" | "words" | "endless";
}

// Types for streak data
export interface StreakData {
  currentStreak: number;
  isAtRisk: boolean;
}

declare global {
  namespace NodeJS {
    interface Global {
      ipcRenderer: IpcRenderer;
      getWordSet: () => string[];
      getProducts: () => Electron.Product[];
      isMas: () => boolean;
    }
  }

  // Types for file dialog result
  interface OpenDialogResult {
    canceled: boolean;
    filePaths: string[];
  }

  interface Window {
    electronAPI: {
      getWordSet: (language: string) => Promise<Uint8Array>;
      getProducts: () => Promise<Electron.Product[]>;
      isMas: () => Promise<boolean>;
      // Deep linking
      onDeepLink: (callback: (data: DeepLinkData) => void) => void;
      onNavigate: (callback: (path: string) => void) => void;
      // Notifications
      scheduleNotification: (config: NotificationConfig) => Promise<ScheduleResult>;
      cancelNotification: () => Promise<ScheduleResult>;
      requestNotificationPermission: () => Promise<boolean>;
      getNotificationStatus: () => Promise<boolean>;
      // Streak
      updateStreakData: (data: StreakData) => void;
      // Code mode
      getCodeSnippets: (lang: string) => Promise<Uint8Array>;
      loadUserCodeFile: (filePath: string) => Promise<string | null>;
      showOpenDialog: () => Promise<OpenDialogResult>;
    };
  }
}

// Since we disabled nodeIntegration we can reintroduce
// needed node functionality here
contextBridge.exposeInMainWorld("electronAPI", {
  // Existing APIs
  getWordSet: (language: string) => ipcRenderer.invoke("getWordSet", language),
  getProducts: () => ipcRenderer.invoke("getProducts"),
  isMas: () => ipcRenderer.invoke("isMas"),

  // Deep linking - listen for deep link events from main process
  onDeepLink: (callback: (data: DeepLinkData) => void) => {
    ipcRenderer.on("deep-link", (_, data: DeepLinkData) => callback(data));
  },

  // Navigation - listen for navigation requests from tray menu
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on("navigate", (_, path: string) => callback(path));
  },

  // Notification scheduling
  scheduleNotification: (config: NotificationConfig): Promise<ScheduleResult> =>
    ipcRenderer.invoke("scheduleNotification", config),

  cancelNotification: (): Promise<ScheduleResult> =>
    ipcRenderer.invoke("cancelNotification"),

  requestNotificationPermission: (): Promise<boolean> =>
    ipcRenderer.invoke("requestNotificationPermission"),

  getNotificationStatus: (): Promise<boolean> =>
    ipcRenderer.invoke("getNotificationStatus"),

  // Streak - send streak data to main process for tray display
  updateStreakData: (data: StreakData): void => {
    ipcRenderer.send("updateStreakData", data);
  },

  // Code mode - load code snippets and user files
  getCodeSnippets: (lang: string): Promise<Uint8Array> =>
    ipcRenderer.invoke("getCodeSnippets", lang),

  loadUserCodeFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke("loadUserCodeFile", filePath),

  showOpenDialog: (): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke("showOpenDialog"),
});
