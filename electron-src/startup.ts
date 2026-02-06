import { app, ipcMain } from "electron";
import log from "electron-log";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface StartupSettings {
  launchAtStartup: boolean;
  startMinimized: boolean;
}

const defaultSettings: StartupSettings = {
  launchAtStartup: false,
  startMinimized: false,
};

function getSettingsPath(): string {
  return join(app.getPath("userData"), "startup-settings.json");
}

function loadSettings(): StartupSettings {
  try {
    const path = getSettingsPath();
    if (existsSync(path)) {
      const data = readFileSync(path, "utf-8");
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (error) {
    log.error("Failed to load startup settings:", error);
  }
  return defaultSettings;
}

function saveSettings(settings: StartupSettings): void {
  try {
    const path = getSettingsPath();
    writeFileSync(path, JSON.stringify(settings, null, 2));
  } catch (error) {
    log.error("Failed to save startup settings:", error);
  }
}

/**
 * Check if the app was launched at startup and should start minimized
 */
export function shouldStartMinimized(): boolean {
  // Check if we're in auto-launch mode
  const wasAutoLaunched = process.argv.includes("--hidden") || 
                          process.argv.includes("--autostart") ||
                          app.getLoginItemSettings().wasOpenedAtLogin;
  
  const settings = loadSettings();
  const startMinimized = settings.startMinimized;
  
  log.info("Startup check:", {
    wasAutoLaunched,
    startMinimized,
    argv: process.argv,
  });
  
  // Start minimized if both conditions are met:
  // 1. App was auto-launched (or startMinimized is enabled regardless)
  // 2. User has enabled start minimized
  return startMinimized && (wasAutoLaunched || startMinimized);
}

/**
 * Setup IPC handlers for startup settings
 */
export function setupStartupHandlers(): void {
  // Get current launch at startup setting
  ipcMain.handle("getLoginItemSettings", () => {
    const loginSettings = app.getLoginItemSettings();
    const settings = loadSettings();
    return {
      openAtLogin: loginSettings.openAtLogin,
      openAsHidden: loginSettings.openAsHidden,
      startMinimized: settings.startMinimized,
    };
  });

  // Set launch at startup
  ipcMain.handle("setLaunchAtStartup", (_, enabled: boolean) => {
    try {
      const settings = loadSettings();
      
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: settings.startMinimized,
        // On macOS, pass additional args for hidden launch
        args: settings.startMinimized ? ["--hidden"] : [],
      });
      
      saveSettings({ ...settings, launchAtStartup: enabled });
      
      log.info("Set launch at startup:", enabled);
      return { success: true };
    } catch (error) {
      log.error("Failed to set launch at startup:", error);
      return { success: false, error: String(error) };
    }
  });

  // Set start minimized
  ipcMain.handle("setStartMinimized", (_, enabled: boolean) => {
    try {
      const settings = loadSettings();
      saveSettings({ ...settings, startMinimized: enabled });
      
      // Update login item settings to include hidden flag if launch at startup is enabled
      if (settings.launchAtStartup) {
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: enabled,
          args: enabled ? ["--hidden"] : [],
        });
      }
      
      log.info("Set start minimized:", enabled);
      return { success: true };
    } catch (error) {
      log.error("Failed to set start minimized:", error);
      return { success: false, error: String(error) };
    }
  });

  // Get start minimized setting
  ipcMain.handle("getStartMinimized", () => {
    const settings = loadSettings();
    return settings.startMinimized;
  });

  log.info("Startup handlers initialized");
}
