/**
 * Notification Scheduler
 * 
 * Handles push notification registration and scheduling:
 * - macOS: APNS (Apple Push Notification Service)
 * - Windows: WNS (Windows Notification Service)
 * - Linux: Local cron scheduler (fallback)
 */

import { Notification, ipcMain, BrowserWindow, app } from "electron";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import log from "electron-log";
import {
  registerForPushNotifications,
  unregisterFromPushNotifications,
  setPushNotificationHandler,
  isPushSupported,
  getPushPlatform,
  PushRegistrationResult,
  PushNotificationPayload,
} from "./push-registration";
import { isWindowVisible, showWindowFromTray } from "./tray";

const execAsync = promisify(exec);

export interface NotificationConfig {
  enabled: boolean;
  time: string; // "HH:MM" format
  days: string[]; // ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  message: string;
  duration: number; // Practice duration in minutes
}

export interface ScheduleResult {
  success: boolean;
  error?: string;
  pushToken?: string;
  channelUri?: string;
  platform?: string;
}

export interface PushTokenData {
  platform: 'macos' | 'windows' | 'linux';
  token?: string;
  channelUri?: string;
}

// Store the main window reference for deep linking
let mainWindow: BrowserWindow | null = null;

// Linux fallback scheduler constants
const LAUNCH_AGENT_LABEL = "io.kochie.touch-typer-reminder";
const getLaunchAgentPath = () =>
  join(
    app.getPath("home"),
    "Library/LaunchAgents",
    `${LAUNCH_AGENT_LABEL}.plist`
  );

/**
 * Setup notification scheduler IPC handlers
 */
export function setupNotificationScheduler(window: BrowserWindow): void {
  mainWindow = window;

  // Set up push notification handler
  setPushNotificationHandler(handlePushNotification);

  // Register for push notifications (get device token)
  ipcMain.handle("registerPushNotifications", async (): Promise<PushRegistrationResult> => {
    try {
      const result = await registerForPushNotifications();
      log.info("Push registration result:", result);
      return result;
    } catch (error) {
      log.error("Push registration error:", error);
      return {
        success: false,
        platform: getPushPlatform(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Unregister from push notifications
  ipcMain.handle("unregisterPushNotifications", async (): Promise<ScheduleResult> => {
    try {
      await unregisterFromPushNotifications();
      return { success: true };
    } catch (error) {
      log.error("Push unregistration error:", error);
      return { success: false, error: String(error) };
    }
  });

  // Schedule notification (for Linux fallback or future use)
  ipcMain.handle(
    "scheduleNotification",
    async (_, config: NotificationConfig): Promise<ScheduleResult> => {
      try {
        const platform = process.platform;

        // For macOS and Windows, push notifications are handled server-side
        // We only need to ensure the device token is registered
        if (platform === "darwin" || platform === "win32") {
          if (config.enabled) {
            const result = await registerForPushNotifications();
            return {
              success: result.success,
              error: result.error,
              pushToken: result.token,
              channelUri: result.channelUri,
              platform: result.platform,
            };
          } else {
            await unregisterFromPushNotifications();
            return { success: true };
          }
        }

        // Linux uses local scheduler
        if (platform === "linux") {
          if (config.enabled) {
            await installLinuxScheduler(config);
          } else {
            await removeLinuxScheduler();
          }
          return { success: true, platform: "linux" };
        }

        return { success: false, error: "Unsupported platform" };
      } catch (error) {
        log.error("Failed to schedule notification:", error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Cancel notification
  ipcMain.handle("cancelNotification", async (): Promise<ScheduleResult> => {
    try {
      await unregisterFromPushNotifications();
      
      // Also remove Linux scheduler if present
      if (process.platform === "linux") {
        await removeLinuxScheduler();
      }
      
      return { success: true };
    } catch (error) {
      log.error("Failed to cancel notification:", error);
      return { success: false, error: String(error) };
    }
  });

  // Check notification permission/support
  ipcMain.handle("requestNotificationPermission", async (): Promise<boolean> => {
    return Notification.isSupported();
  });

  // Get notification status
  ipcMain.handle("getNotificationStatus", async (): Promise<boolean> => {
    try {
      const platform = process.platform;
      
      if (platform === "linux") {
        return await isLinuxSchedulerInstalled();
      }
      
      // For macOS/Windows, check if push is supported
      return isPushSupported();
    } catch {
      return false;
    }
  });

  // Get push platform info
  ipcMain.handle("getPushPlatform", async (): Promise<PushTokenData> => {
    return {
      platform: getPushPlatform(),
    };
  });

  // Check if push is supported
  ipcMain.handle("isPushSupported", async (): Promise<boolean> => {
    return isPushSupported();
  });
}

/**
 * Handle incoming push notification
 * Shows a system notification - only brings app to front when user clicks it
 */
function handlePushNotification(payload: PushNotificationPayload): void {
  log.info("Handling push notification:", payload);

  // If window is visible and focused, send directly to renderer
  // Otherwise show a system notification
  if (mainWindow && isWindowVisible(mainWindow) && mainWindow.isFocused()) {
    log.info("Window is visible and focused, sending to renderer");
    mainWindow.webContents.send("push-notification", payload);
    return;
  }

  // Show a system notification (app is minimized to tray or not focused)
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: payload.title || "Touch Typer",
      body: payload.body || "Time to practice your typing!",
      // icon: join(__dirname, "../build/app-icon.icns"),

      silent: false,
    });

    
    // Show and focus the window when user clicks the notification
    notification.on("click", () => {
      log.info("User clicked notification, bringing app to front");
      if (mainWindow) {
        showWindowFromTray(mainWindow);

        // Send to renderer process
        mainWindow.webContents.send("push-notification", payload);

        // If action is practice, navigate to practice
        if (payload.action === "practice") {
          mainWindow.webContents.send("deep-link", {
            action: "practice",
            duration: payload.duration,
          });
        }
      }
    });

    notification.show();
    log.info("Displayed system notification (app was in tray or background)");
  } else {
    log.warn("Notifications not supported on this system");
  }
}

// ============ Linux Fallback Implementation ============

async function installLinuxScheduler(config: NotificationConfig): Promise<void> {
  const [hour, minute] = config.time.split(":");

  // First, remove any existing entries
  await removeLinuxScheduler();

  // Map days to cron format (0-6, 0=Sunday)
  const dayMap: Record<string, string> = {
    sun: "0",
    mon: "1",
    tue: "2",
    wed: "3",
    thu: "4",
    fri: "5",
    sat: "6",
  };

  const days = config.days
    .filter((d) => dayMap[d])
    .map((d) => dayMap[d])
    .join(",");

  if (!days) {
    throw new Error("No valid days selected");
  }

  const appPath = app.getPath("exe");
  const deepLink = `touchtyper://practice?duration=${config.duration}`;

  // Create cron entry with a marker comment for identification
  const cronEntry = `${minute} ${hour} * * ${days} ${appPath} "${deepLink}" # TouchTyperReminder`;

  // Add to user's crontab
  try {
    await execAsync(
      `(crontab -l 2>/dev/null | grep -v "TouchTyperReminder"; echo "${cronEntry}") | crontab -`
    );
    log.info("Linux notification scheduler installed successfully");
  } catch (error) {
    log.error("Failed to install cron job:", error);
    throw error;
  }
}

async function removeLinuxScheduler(): Promise<void> {
  try {
    await execAsync(
      `crontab -l 2>/dev/null | grep -v "TouchTyperReminder" | crontab - || true`
    );
    log.info("Linux notification scheduler removed");
  } catch {
    // Crontab might be empty or not exist, ignore
  }
}

async function isLinuxSchedulerInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`crontab -l 2>/dev/null || true`);
    return stdout.includes("TouchTyperReminder");
  } catch {
    return false;
  }
}

/**
 * Show an immediate notification (for testing or in-app reminders)
 */
export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: join(__dirname, "../build/app-icon.icns"),
    });
    notification.show();
  }
}

/**
 * Clean up old macOS LaunchAgent if it exists (migration from local scheduler)
 */
export async function cleanupLegacyScheduler(): Promise<void> {
  if (process.platform === "darwin") {
    const plistPath = getLaunchAgentPath();
    try {
      await execAsync(`launchctl unload "${plistPath}" 2>/dev/null || true`);
      await unlink(plistPath);
      await unlink(join(app.getPath("userData"), "reminder.scpt"));
      log.info("Legacy macOS scheduler cleaned up");
    } catch {
      // Ignore - might not exist
    }
  }
}
