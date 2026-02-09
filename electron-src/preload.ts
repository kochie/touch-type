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
  pushToken?: string;
  channelUri?: string;
  platform?: string;
}

export interface PushRegistrationResult {
  success: boolean;
  platform: "macos" | "windows" | "linux";
  token?: string;
  channelUri?: string;
  error?: string;
}

export interface PushTokenData {
  platform: "macos" | "windows" | "linux";
  token?: string;
  channelUri?: string;
}

export interface PushNotificationPayload {
  action?: string;
  duration?: number;
  title?: string;
  body?: string;
}

export interface LoginItemSettings {
  openAtLogin: boolean;
  openAsHidden: boolean;
  startMinimized: boolean;
}

export interface StartupResult {
  success: boolean;
  error?: string;
}

export interface DebugInfo {
  isDev: boolean;
  platform: NodeJS.Platform;
  electronVersion: string;
  nodeVersion: string;
}

export interface DeepLinkData {
  action: "practice" | "settings" | "stats" | "auth-callback";
  duration?: number;
  mode?: "timed" | "words" | "endless";
  access_token?: string;
  refresh_token?: string;
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

  interface Window {
    electronAPI: {
      getWordSet: (language: string) => Promise<Uint8Array>;
      getProducts: () => Promise<Electron.Product[]>;
      isMas: () => Promise<boolean>;
      // Deep linking
      onDeepLink: (callback: (data: DeepLinkData) => void) => void;
      onNavigate: (callback: (path: string) => void) => void;
      // Push notifications
      registerPushNotifications: () => Promise<PushRegistrationResult>;
      unregisterPushNotifications: () => Promise<ScheduleResult>;
      onPushNotification: (callback: (payload: PushNotificationPayload) => void) => void;
      isPushSupported: () => Promise<boolean>;
      getPushPlatform: () => Promise<PushTokenData>;
      // Notifications (legacy + Linux fallback)
      scheduleNotification: (config: NotificationConfig) => Promise<ScheduleResult>;
      cancelNotification: () => Promise<ScheduleResult>;
      requestNotificationPermission: () => Promise<boolean>;
      getNotificationStatus: () => Promise<boolean>;
      // Startup settings
      getLoginItemSettings: () => Promise<LoginItemSettings>;
      setLaunchAtStartup: (enabled: boolean) => Promise<StartupResult>;
      setStartMinimized: (enabled: boolean) => Promise<StartupResult>;
      getStartMinimized: () => Promise<boolean>;
      // Debug/Dev mode
      getDebugInfo: () => Promise<DebugInfo>;
      // Tray streak display
      updateStreakData: (data: { currentStreak: number; isAtRisk: boolean }) => void;
    };
  }
}

// Since we disabled nodeIntegration we can reintroduce
// needed node functionality here
contextBridge.exposeInMainWorld("electronAPI", {
  // Existing APIs
  getWordSet: (language: string) => ipcRenderer.invoke("getWordSet", language),
  getProducts: () => ipcRenderer.invoke("getProducts"),
  purchaseProduct: (productId: string, quantity?: number) =>
    ipcRenderer.invoke("purchaseProduct", productId, quantity ?? 1),
  onIAPPurchaseComplete: (callback: (transactionId: string, productId?: string) => void) => {
    ipcRenderer.on("iap-purchase-complete", (_, transactionId: string, productId?: string) =>
      callback(transactionId, productId)
    );
  },
  isMas: () => ipcRenderer.invoke("isMas"),

  // Deep linking - listen for deep link events from main process
  onDeepLink: (callback: (data: DeepLinkData) => void) => {
    ipcRenderer.on("deep-link", (_, data: DeepLinkData) => callback(data));
  },

  // Navigation - listen for navigation requests from tray menu
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on("navigate", (_, path: string) => callback(path));
  },

  // Push notifications (APNS/WNS)
  registerPushNotifications: (): Promise<PushRegistrationResult> =>
    ipcRenderer.invoke("registerPushNotifications"),

  unregisterPushNotifications: (): Promise<ScheduleResult> =>
    ipcRenderer.invoke("unregisterPushNotifications"),

  onPushNotification: (callback: (payload: PushNotificationPayload) => void) => {
    ipcRenderer.on("push-notification", (_, payload: PushNotificationPayload) => callback(payload));
  },

  isPushSupported: (): Promise<boolean> =>
    ipcRenderer.invoke("isPushSupported"),

  getPushPlatform: (): Promise<PushTokenData> =>
    ipcRenderer.invoke("getPushPlatform"),

  // Notification scheduling (Linux fallback)
  scheduleNotification: (config: NotificationConfig): Promise<ScheduleResult> =>
    ipcRenderer.invoke("scheduleNotification", config),

  cancelNotification: (): Promise<ScheduleResult> =>
    ipcRenderer.invoke("cancelNotification"),

  requestNotificationPermission: (): Promise<boolean> =>
    ipcRenderer.invoke("requestNotificationPermission"),

  getNotificationStatus: (): Promise<boolean> =>
    ipcRenderer.invoke("getNotificationStatus"),

  // Startup settings
  getLoginItemSettings: (): Promise<LoginItemSettings> =>
    ipcRenderer.invoke("getLoginItemSettings"),

  setLaunchAtStartup: (enabled: boolean): Promise<StartupResult> =>
    ipcRenderer.invoke("setLaunchAtStartup", enabled),

  setStartMinimized: (enabled: boolean): Promise<StartupResult> =>
    ipcRenderer.invoke("setStartMinimized", enabled),

  getStartMinimized: (): Promise<boolean> =>
    ipcRenderer.invoke("getStartMinimized"),

  // Debug/Dev mode
  getDebugInfo: (): Promise<DebugInfo> =>
    ipcRenderer.invoke("getDebugInfo"),

  // Tray streak display
  updateStreakData: (data: { currentStreak: number; isAtRisk: boolean }) => {
    ipcRenderer.send("updateStreakData", data);
  },
});
