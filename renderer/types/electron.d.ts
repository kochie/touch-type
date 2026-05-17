// Type declarations for Electron API exposed via preload script

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

export interface DeepLinkData {
  action: "practice" | "settings" | "stats";
  duration?: number;
  mode?: "timed" | "words" | "endless";
}

export interface StreakData {
  currentStreak: number;
  isAtRisk: boolean;
}

export interface DebugInfo {
  isDev: boolean;
  /**
   * True if this is a Mac App Development-signed build (electron-builder
   * --mac mas-dev) — a signed sandboxed build with get-task-allow=true.
   * Used to surface developer-only tooling in dev builds (where isDev is
   * always false because the bundle is packaged).
   */
  isMasDev: boolean;
  platform: string;
  electronVersion: string;
  nodeVersion: string;
  appVersion: string;
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

export interface ElectronAPI {
  getWordSet: (language: string) => Promise<Uint8Array>;
  getProducts: () => Promise<Electron.Product[]>;
  isMas: () => Promise<boolean>;
  getDebugInfo: () => Promise<DebugInfo>;
  getSystemLocale: () => Promise<string>;
  // Deep linking
  onDeepLink: (callback: (data: DeepLinkData) => void) => (...args: unknown[]) => void;
  offDeepLink: (wrapper: (...args: unknown[]) => void) => void;
  onNavigate: (callback: (path: string) => void) => (...args: unknown[]) => void;
  offNavigate: (wrapper: (...args: unknown[]) => void) => void;
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
  // Streak
  updateStreakData: (data: StreakData) => void;
  // Theme
  setThemeSource: (source: "system" | "light" | "dark") => Promise<void>;
  setWindowHeight: (height: number) => Promise<void>;
  // Code mode
  getCodeSnippets: (lang: string) => Promise<Uint8Array | null>;
  loadUserCodeFile: (filePath: string) => Promise<string | null>;
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  // MAS streak freeze consumable purchase
  purchaseStreakFreeze: (productId: string) => Promise<{ queued: boolean; error?: string }>;
  // MAS premium subscription purchase (auto-renewable)
  purchaseSubscription: (productId: string) => Promise<{ queued: boolean; error?: string }>;
  // MAS Restore Purchases — required by App Store review
  restorePurchases: () => Promise<{ restored: boolean; error?: string }>;
  // StoreKit transaction forwarded from main proc; the renderer must
  // register it via map-transaction and then call finishIapTransaction.
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
  // Fired by main process after Stripe freeze checkout completes.
  // Returns the wrapper so the caller can remove it via the matching off.
  onFreezePurchaseComplete: (callback: () => void) => (...args: unknown[]) => void;
  offFreezePurchaseComplete: (wrapper: (...args: unknown[]) => void) => void;
  // Fired by main process after Stripe subscription checkout completes (3DS fallback).
  onSubscriptionPurchaseComplete: (callback: () => void) => (...args: unknown[]) => void;
  offSubscriptionPurchaseComplete: (wrapper: (...args: unknown[]) => void) => void;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
