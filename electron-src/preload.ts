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
  /**
   * True if this is a Mac App Development-signed build (electron-builder
   * --mac mas-dev) — i.e. a signed-and-sandboxed build with get-task-allow,
   * NOT a production MAS upload. Used in the renderer to surface developer-
   * only tooling (debug panel, etc.) in dev builds even when isDev=false
   * (which is always false for packaged builds).
   */
  isMasDev: boolean;
  platform: NodeJS.Platform;
  electronVersion: string;
  nodeVersion: string;
}

export interface DeepLinkData {
  action: "practice" | "settings" | "stats";
  duration?: number;
  mode?: "timed" | "words" | "endless";
}

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
      onDeepLink: (callback: (data: DeepLinkData) => void) => (...args: unknown[]) => void;
      offDeepLink: (wrapper: (...args: unknown[]) => void) => void;
      onNavigate: (callback: (path: string) => void) => (...args: unknown[]) => void;
      offNavigate: (wrapper: (...args: unknown[]) => void) => void;
      // True iff the app was launched with a touchtyper:// URL in argv —
      // renderer uses this to skip startup modals so they don't obscure
      // the deep-link destination page on cold start.
      launchedWithDeepLink: () => Promise<boolean>;
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
      // Streak data — renderer pushes the latest streak so the tray menu can
      // surface it without holding a Supabase session itself.
      updateStreakData: (data: StreakData) => void;
      // Code mode
      getCodeSnippets: (lang: string) => Promise<Uint8Array>;
      loadUserCodeFile: (filePath: string) => Promise<string | null>;
      showOpenDialog: () => Promise<OpenDialogResult>;
      // MAS streak freeze in-app purchase
      purchaseStreakFreeze: (productId: string) => Promise<{ queued: boolean; error?: string }>;
      // MAS premium subscription in-app purchase
      purchaseSubscription: (productId: string) => Promise<{ queued: boolean; error?: string }>;
      // MAS Restore Purchases (required by App Store review)
      restorePurchases: () => Promise<{ restored: boolean; error?: string }>;
      // Renderer subscribes to forwarded StoreKit `purchased`/`restored`
      // events. After registering the transaction server-side via
      // map-transaction, the renderer must call finishIapTransaction with
      // the same transactionDate to take it off the StoreKit queue.
      onIapTransactionPurchased: (
        callback: (payload: {
          transactionId: string;
          originalTransactionId: string;
          productId: string;
          transactionDate: string;
          state: 'purchased' | 'restored';
        }) => void,
      ) => (...args: unknown[]) => void;
      offIapTransactionPurchased: (wrapper: (...args: unknown[]) => void) => void;
      finishIapTransaction: (transactionDate: string) => Promise<{ finished: boolean }>;
      // Notified by main process after Stripe freeze checkout completes.
      // Returns the wrapper so the caller can remove it via the matching off.
      onFreezePurchaseComplete: (callback: () => void) => (...args: unknown[]) => void;
      offFreezePurchaseComplete: (wrapper: (...args: unknown[]) => void) => void;
      // Notified by main process after Stripe subscription checkout completes (3DS fallback).
      onSubscriptionPurchaseComplete: (callback: () => void) => (...args: unknown[]) => void;
      offSubscriptionPurchaseComplete: (wrapper: (...args: unknown[]) => void) => void;
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
    const wrapper = (_event: Electron.IpcRendererEvent, data: DeepLinkData) => callback(data);
    ipcRenderer.on("deep-link", wrapper);
    return wrapper;
  },
  offDeepLink: (wrapper: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener("deep-link", wrapper);
  },
  launchedWithDeepLink: () => ipcRenderer.invoke("launchedWithDeepLink"),

  // Navigation - listen for navigation requests from tray menu
  onNavigate: (callback: (path: string) => void) => {
    const wrapper = (_event: Electron.IpcRendererEvent, path: string) => callback(path);
    ipcRenderer.on("navigate", wrapper);
    return wrapper;
  },
  offNavigate: (wrapper: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener("navigate", wrapper);
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

  // System locale
  getSystemLocale: (): Promise<string> =>
    ipcRenderer.invoke("getSystemLocale"),

  // Streak — fire-and-forget; the tray module listens on this channel.
  updateStreakData: (data: StreakData): void => {
    ipcRenderer.send("updateStreakData", data);
  },

  // Theme — drives native chrome (titlebar, vibrancy, mica) to match the
  // renderer's selected theme.
  setThemeSource: (source: "system" | "light" | "dark"): Promise<void> =>
    ipcRenderer.invoke("setThemeSource", source),

  setWindowHeight: (height: number): Promise<void> =>
    ipcRenderer.invoke("setWindowHeight", height),

  // Code mode - load code snippets and user files
  getCodeSnippets: (lang: string): Promise<Uint8Array> =>
    ipcRenderer.invoke("getCodeSnippets", lang),

  loadUserCodeFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke("loadUserCodeFile", filePath),

  showOpenDialog: (): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke("showOpenDialog"),

  purchaseStreakFreeze: (productId: string): Promise<{ queued: boolean; error?: string }> =>
    ipcRenderer.invoke("purchaseStreakFreeze", productId),

  purchaseSubscription: (productId: string): Promise<{ queued: boolean; error?: string }> =>
    ipcRenderer.invoke("purchaseSubscription", productId),

  restorePurchases: (): Promise<{ restored: boolean; error?: string }> =>
    ipcRenderer.invoke("restorePurchases"),

  onIapTransactionPurchased: (
    callback: (payload: {
      transactionId: string;
      originalTransactionId: string;
      productId: string;
      transactionDate: string;
      state: 'purchased' | 'restored';
    }) => void,
  ) => {
    const wrapper = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof callback>[0]) => callback(payload);
    ipcRenderer.on("iap-transaction-purchased", wrapper);
    return wrapper;
  },
  offIapTransactionPurchased: (wrapper: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener("iap-transaction-purchased", wrapper);
  },

  finishIapTransaction: (transactionDate: string): Promise<{ finished: boolean }> =>
    ipcRenderer.invoke("finishIapTransaction", transactionDate),

  onFreezePurchaseComplete: (callback: () => void) => {
    // Return the wrapper so the caller can remove this exact listener on
    // unmount via offFreezePurchaseComplete. Without that, every mount of
    // the modal stacks another listener on the same channel and the Nth
    // mount fires the callback N times.
    const wrapper = () => callback();
    ipcRenderer.on("freeze-purchase-complete", wrapper);
    return wrapper;
  },
  offFreezePurchaseComplete: (wrapper: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener("freeze-purchase-complete", wrapper);
  },

  onSubscriptionPurchaseComplete: (callback: () => void) => {
    const wrapper = () => callback();
    ipcRenderer.on("subscription-purchase-complete", wrapper);
    return wrapper;
  },
  offSubscriptionPurchaseComplete: (wrapper: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener("subscription-purchase-complete", wrapper);
  },

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("openExternal", url),
});
