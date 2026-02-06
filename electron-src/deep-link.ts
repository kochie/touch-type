import { app, BrowserWindow } from "electron";
import { join, resolve } from "path";
import log from "electron-log";

export interface DeepLinkData {
  action: "practice" | "settings" | "stats";
  duration?: number;
  mode?: "timed" | "words" | "endless";
}

let mainWindow: BrowserWindow | null = null;

/**
 * Set the main window reference for deep link handling
 */
export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window;
}

/**
 * Get the main window reference
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Parse a deep link URL into structured data
 * URL format: touchtyper://practice?duration=5&mode=timed
 */
export function parseDeepLink(url: string): DeepLinkData | null {
  try {
    const parsed = new URL(url);
    const action = parsed.hostname as DeepLinkData["action"];

    // Validate action
    if (!["practice", "settings", "stats"].includes(action)) {
      log.warn("Unknown deep link action:", action);
      return null;
    }

    return {
      action,
      duration: parsed.searchParams.get("duration")
        ? parseInt(parsed.searchParams.get("duration")!, 10)
        : undefined,
      mode: parsed.searchParams.get("mode") as DeepLinkData["mode"] | undefined,
    };
  } catch (error) {
    log.error("Failed to parse deep link:", error);
    return null;
  }
}

/**
 * Handle a deep link URL by parsing it and sending to the renderer
 */
export function handleDeepLink(url: string): void {
  const data = parseDeepLink(url);
  if (!data) return;

  log.info("Handling deep link:", data);

  // Show and focus the window
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();

    // Send to renderer process
    mainWindow.webContents.send("deep-link", data);
  }
}

/**
 * Extract deep link URL from command line arguments
 */
export function getDeepLinkFromArgs(args: string[]): string | undefined {
  return args.find((arg) => arg.startsWith("touchtyper://"));
}

/**
 * Setup deep link handlers for all platforms
 * Must be called before app.ready
 * Returns false if another instance is already running
 */
export function setupDeepLinkHandlers(): boolean {
  // Register as default protocol client
  // In development, we need to pass the path to the script
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("touchtyper", process.execPath, [
        resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient("touchtyper");
  }

  // macOS: Handle protocol when app is already running
  app.on("open-url", (event, url) => {
    event.preventDefault();
    log.info("Received open-url event:", url);
    handleDeepLink(url);
  });

  // Windows/Linux: Ensure single instance and handle protocol
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    log.info("Another instance is already running, quitting...");
    app.quit();
    return false;
  }

  app.on("second-instance", (event, commandLine) => {
    log.info("Second instance detected, command line:", commandLine);

    // Windows/Linux: the URL is in commandLine
    const url = getDeepLinkFromArgs(commandLine);
    if (url) {
      handleDeepLink(url);
    }

    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return true;
}

/**
 * Handle deep link from initial app launch
 * Should be called after the window is ready
 */
export function handleInitialDeepLink(): void {
  // Check if app was launched with a deep link URL
  const url = getDeepLinkFromArgs(process.argv);
  if (url) {
    log.info("App launched with deep link:", url);
    // Wait a bit for the window to fully load
    setTimeout(() => {
      handleDeepLink(url);
    }, 500);
  }
}
