import { Tray, Menu, nativeImage, app, BrowserWindow, powerSaveBlocker } from "electron";
import { join } from "path";
import log from "electron-log";

let tray: Tray | null = null;
let isQuitting = false;
let hasShownTrayNotification = false;
let powerSaveBlockerId: number | null = null;

/**
 * Mark the app as quitting to allow window close
 */
export function setIsQuitting(value: boolean): void {
  isQuitting = value;
}

/**
 * Check if the app is quitting
 */
export function getIsQuitting(): boolean {
  return isQuitting;
}

/**
 * Setup the system tray icon and menu
 */
export function setupTray(mainWindow: BrowserWindow): Tray {
  // Create tray icon
  // Use different icon paths based on platform
  let iconPath: string;
  
  if (process.platform === "darwin") {
    // macOS: Use the 16x16 icon from the app icon set
    // For proper dark/light mode support, create a tray-iconTemplate.png
    iconPath = join(__dirname, "../build/AppIcon.appiconset/icon_16x16@2x.png");
  } else if (process.platform === "win32") {
    iconPath = join(__dirname, "../build/app-logo-win.png");
  } else {
    iconPath = join(__dirname, "../build/app-logo-linux.png");
  }

  let icon: Electron.NativeImage;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    // Resize for tray (16x16 on macOS, 24x24 on Windows/Linux)
    if (process.platform === "darwin") {
      icon = icon.resize({ width: 16, height: 16 });
    } else {
      icon = icon.resize({ width: 24, height: 24 });
    }
  } catch (error) {
    log.warn("Failed to load tray icon, using empty image:", error);
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Touch Typer",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "Quick Practice",
      submenu: [
        {
          label: "5 minutes",
          click: () => {
            showAndPractice(mainWindow, 5);
          },
        },
        {
          label: "10 minutes",
          click: () => {
            showAndPractice(mainWindow, 10);
          },
        },
        {
          label: "15 minutes",
          click: () => {
            showAndPractice(mainWindow, 15);
          },
        },
        {
          label: "30 minutes",
          click: () => {
            showAndPractice(mainWindow, 30);
          },
        },
      ],
    },
    { type: "separator" },
    {
      label: "Settings",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("navigate", "/settings");
      },
    },
    {
      label: "Statistics",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("navigate", "/stats");
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Touch Typer");
  tray.setContextMenu(contextMenu);

  // On macOS, clicking the tray icon shows/hides the window
  tray.on("click", () => {
    if (process.platform === "darwin") {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      // On Windows/Linux, always show
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Handle window close - hide window but keep app running (like Slack)
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Prevent App Nap on macOS to keep APNS connection alive
      // This ensures push notifications can be received while in the tray
      if (process.platform === "darwin" && powerSaveBlockerId === null) {
        powerSaveBlockerId = powerSaveBlocker.start("prevent-app-suspension");
        log.info("Started power save blocker to prevent App Nap, id:", powerSaveBlockerId);
      }
      
      // On Windows, show a balloon notification the first time
      // to let users know the app is still running in the tray
      if (process.platform === "win32" && !hasShownTrayNotification && tray) {
        hasShownTrayNotification = true;
        tray.displayBalloon({
          title: "Touch Typer",
          content: "The app is still running in the system tray. You'll receive notifications for practice reminders.",
          iconType: "info",
        });
      }
    }
  });

  // When window is shown, we can allow App Nap again
  mainWindow.on("show", () => {
    if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
      powerSaveBlocker.stop(powerSaveBlockerId);
      log.info("Stopped power save blocker, id:", powerSaveBlockerId);
      powerSaveBlockerId = null;
    }
  });

  // On macOS, clicking the dock icon when window is hidden should show it
  app.on("activate", () => {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  log.info("System tray initialized");
  return tray;
}

/**
 * Show the window and start a practice session
 */
function showAndPractice(mainWindow: BrowserWindow, duration: number): void {
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("deep-link", {
    action: "practice",
    duration,
    mode: "timed",
  });
}

/**
 * Destroy the tray icon
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/**
 * Get the tray instance
 */
export function getTray(): Tray | null {
  return tray;
}

/**
 * Check if window is currently visible (not hidden in tray)
 */
export function isWindowVisible(window: BrowserWindow): boolean {
  return window.isVisible() && !window.isMinimized();
}

/**
 * Show window from tray and bring to front
 */
export function showWindowFromTray(window: BrowserWindow): void {
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}
