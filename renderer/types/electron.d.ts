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
  purchaseProduct: (productId: string, quantity?: number) => Promise<boolean>;
  onIAPPurchaseComplete: (callback: (transactionId: string, productId?: string) => void) => void;
  isMas: () => Promise<boolean>;
  getDebugInfo: () => Promise<DebugInfo>;
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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
