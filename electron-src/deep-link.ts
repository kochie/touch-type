import { app, BrowserWindow } from "electron";
import log from "electron-log";

export interface DeepLinkData {
  action: "practice" | "settings" | "stats" | "pvp";
  duration?: number;
  mode?: "timed" | "words" | "endless";
  // PvP specific
  pvpAction?: "invite" | "challenge";
  code?: string;
  challengeId?: string;
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
 * URL formats:
 *   - touchtyper://practice?duration=5&mode=timed
 *   - touchtyper://pvp/invite/{code}
 *   - touchtyper://pvp/challenge/{id}
 */
export function parseDeepLink(url: string): DeepLinkData | null {
  try {
    const parsed = new URL(url);
    const action = parsed.hostname as DeepLinkData["action"];

    // Handle PvP links with path segments
    if (action === "pvp") {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const pvpAction = pathParts[0] as "invite" | "challenge" | undefined;
      const codeOrId = pathParts[1];

      if (pvpAction === "invite" && codeOrId) {
        return {
          action: "pvp",
          pvpAction: "invite",
          code: codeOrId,
        };
      }

      if (pvpAction === "challenge" && codeOrId) {
        return {
          action: "pvp",
          pvpAction: "challenge",
          challengeId: codeOrId,
        };
      }

      // Default to PvP hub
      return { action: "pvp" };
    }

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
  // Only register as default protocol client for packaged builds. In dev
  // (`electron .` via `pnpm dev`) the binary identifies as the generic
  // `com.github.Electron` bundle ID; registering would set THAT as the
  // OS-wide touchtyper:// handler, stealing routing from the installed
  // app (TestFlight / release / DMG). Repairing requires a manual
  // LSSetDefaultHandlerForURLScheme call. Skipping in dev avoids the
  // footgun — devs who need to test deep-link routing inside a dev
  // session can dispatch handleDeepLink() directly from the main process.
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient("touchtyper");
  } else {
    log.info(
      "Dev mode: skipping setAsDefaultProtocolClient to preserve the installed app's touchtyper:// registration",
    );
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

  app.on("second-instance", (_event, commandLine) => {
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
 * Returns true if the app was launched with a deep-link URL in argv.
 * The renderer reads this via electronAPI before deciding whether to
 * open startup modals (which would otherwise obscure the deep-link
 * destination page on cold start).
 */
export function launchedWithDeepLink(): boolean {
  return !!getDeepLinkFromArgs(process.argv);
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
    // did-finish-load already ensures the renderer JS has run; this short
    // delay lets React mount + useDeepLink register its listener before
    // we dispatch. 500ms was overcautious and lengthened the window where
    // a startup modal could open first; 50ms is enough for mount.
    setTimeout(() => {
      handleDeepLink(url);
    }, 50);
  }
}
