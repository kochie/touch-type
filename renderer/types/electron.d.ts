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
  platform: string;
  electronVersion: string;
  nodeVersion: string;
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
  onDeepLink: (callback: (data: DeepLinkData) => void) => void;
  offDeepLink: () => void;
  onNavigate: (callback: (path: string) => void) => void;
  offNavigate: () => void;
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
  // Fired by main process after Stripe freeze checkout completes
  onFreezePurchaseComplete: (callback: () => void) => void;
  // Fired by main process after Stripe subscription checkout completes (3DS fallback)
  onSubscriptionPurchaseComplete: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
