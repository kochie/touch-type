import { Notification, ipcMain, BrowserWindow, app } from "electron";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import log from "electron-log";

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
}

// Path to LaunchAgent plist on macOS
const LAUNCH_AGENT_LABEL = "io.kochie.touch-typer-reminder";
const getLaunchAgentPath = () =>
  join(
    app.getPath("home"),
    "Library/LaunchAgents",
    `${LAUNCH_AGENT_LABEL}.plist`
  );

// Task name for Windows
const WINDOWS_TASK_NAME = "TouchTyperReminder";

/**
 * Setup notification scheduler IPC handlers
 */
export function setupNotificationScheduler(mainWindow: BrowserWindow): void {
  // Handle notification scheduling from renderer
  ipcMain.handle(
    "scheduleNotification",
    async (_, config: NotificationConfig): Promise<ScheduleResult> => {
      try {
        if (config.enabled) {
          await installSystemScheduler(config);
        } else {
          await removeSystemScheduler();
        }
        return { success: true };
      } catch (error) {
        log.error("Failed to schedule notification:", error);
        return { success: false, error: String(error) };
      }
    }
  );

  ipcMain.handle("cancelNotification", async (): Promise<ScheduleResult> => {
    try {
      await removeSystemScheduler();
      return { success: true };
    } catch (error) {
      log.error("Failed to cancel notification:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("requestNotificationPermission", async (): Promise<boolean> => {
    // Check if notifications are supported
    return Notification.isSupported();
  });

  ipcMain.handle("getNotificationStatus", async (): Promise<boolean> => {
    // Check if scheduler is installed
    try {
      const platform = process.platform;
      switch (platform) {
        case "darwin":
          return await isMacOSSchedulerInstalled();
        case "win32":
          return await isWindowsSchedulerInstalled();
        case "linux":
          return await isLinuxSchedulerInstalled();
        default:
          return false;
      }
    } catch {
      return false;
    }
  });
}

/**
 * Install the system-level scheduler based on platform
 */
async function installSystemScheduler(config: NotificationConfig): Promise<void> {
  const platform = process.platform;

  switch (platform) {
    case "darwin":
      await installMacOSScheduler(config);
      break;
    case "win32":
      await installWindowsScheduler(config);
      break;
    case "linux":
      await installLinuxScheduler(config);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Remove the system-level scheduler based on platform
 */
async function removeSystemScheduler(): Promise<void> {
  const platform = process.platform;

  switch (platform) {
    case "darwin":
      await removeMacOSScheduler();
      break;
    case "win32":
      await removeWindowsScheduler();
      break;
    case "linux":
      await removeLinuxScheduler();
      break;
  }
}

// ============ macOS Implementation ============

async function installMacOSScheduler(config: NotificationConfig): Promise<void> {
  const [hour, minute] = config.time.split(":").map(Number);

  // First, unload any existing scheduler
  await removeMacOSScheduler();

  // Create the reminder script that shows notification and opens app
  const scriptPath = join(app.getPath("userData"), "reminder.scpt");
  const appPath = app.getPath("exe");
  const deepLink = `touchtyper://practice?duration=${config.duration}`;

  // AppleScript to show notification and open the app
  const script = `
display notification "${config.message}" with title "Touch Typer" sound name "default"
delay 0.5
do shell script "open '${deepLink}'"
`;

  await writeFile(scriptPath, script, "utf-8");

  // Build calendar intervals for each selected day
  // macOS uses 1=Sunday, 2=Monday, ..., 7=Saturday
  const dayMap: Record<string, number> = {
    sun: 1,
    mon: 2,
    tue: 3,
    wed: 4,
    thu: 5,
    fri: 6,
    sat: 7,
  };

  const calendarIntervals = config.days
    .filter((day) => dayMap[day] !== undefined)
    .map(
      (day) => `
      <dict>
        <key>Hour</key>
        <integer>${hour}</integer>
        <key>Minute</key>
        <integer>${minute}</integer>
        <key>Weekday</key>
        <integer>${dayMap[day]}</integer>
      </dict>`
    )
    .join("\n");

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/osascript</string>
    <string>${scriptPath}</string>
  </array>
  <key>StartCalendarInterval</key>
  <array>
${calendarIntervals}
  </array>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>`;

  // Ensure LaunchAgents directory exists
  const launchAgentsDir = join(app.getPath("home"), "Library/LaunchAgents");
  await mkdir(launchAgentsDir, { recursive: true });

  // Write the LaunchAgent plist
  const plistPath = getLaunchAgentPath();
  await writeFile(plistPath, plist, "utf-8");

  // Load the LaunchAgent
  try {
    await execAsync(`launchctl load "${plistPath}"`);
    log.info("macOS notification scheduler installed successfully");
  } catch (error) {
    log.error("Failed to load LaunchAgent:", error);
    throw error;
  }
}

async function removeMacOSScheduler(): Promise<void> {
  const plistPath = getLaunchAgentPath();

  try {
    // Unload the LaunchAgent (ignore errors if not loaded)
    await execAsync(`launchctl unload "${plistPath}" 2>/dev/null || true`);
  } catch {
    // Ignore unload errors
  }

  try {
    // Remove the plist file
    await unlink(plistPath);
  } catch {
    // File might not exist, ignore
  }

  // Also clean up the script
  try {
    await unlink(join(app.getPath("userData"), "reminder.scpt"));
  } catch {
    // Ignore
  }

  log.info("macOS notification scheduler removed");
}

async function isMacOSSchedulerInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `launchctl list | grep "${LAUNCH_AGENT_LABEL}" || true`
    );
    return stdout.includes(LAUNCH_AGENT_LABEL);
  } catch {
    return false;
  }
}

// ============ Windows Implementation ============

async function installWindowsScheduler(config: NotificationConfig): Promise<void> {
  const [hour, minute] = config.time.split(":");

  // First, remove any existing task
  await removeWindowsScheduler();

  // Map days to Windows format
  const dayMap: Record<string, string> = {
    sun: "SUN",
    mon: "MON",
    tue: "TUE",
    wed: "WED",
    thu: "THU",
    fri: "FRI",
    sat: "SAT",
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

  // Create scheduled task using schtasks
  // The task will launch the app with the deep link URL
  const command = `schtasks /create /tn "${WINDOWS_TASK_NAME}" /tr "\\"${appPath}\\" \\"${deepLink}\\"" /sc weekly /d ${days} /st ${hour}:${minute} /f`;

  try {
    await execAsync(command);
    log.info("Windows notification scheduler installed successfully");
  } catch (error) {
    log.error("Failed to create Windows scheduled task:", error);
    throw error;
  }
}

async function removeWindowsScheduler(): Promise<void> {
  try {
    await execAsync(`schtasks /delete /tn "${WINDOWS_TASK_NAME}" /f 2>nul || exit 0`);
    log.info("Windows notification scheduler removed");
  } catch {
    // Task might not exist, ignore
  }
}

async function isWindowsSchedulerInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `schtasks /query /tn "${WINDOWS_TASK_NAME}" 2>nul || exit 0`
    );
    return stdout.includes(WINDOWS_TASK_NAME);
  } catch {
    return false;
  }
}

// ============ Linux Implementation ============

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
