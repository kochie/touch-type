import { Tray, Menu, nativeImage, app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import log from "electron-log";

let tray: Tray | null = null;
let isQuitting = false;
let currentStreakData: { currentStreak: number; isAtRisk: boolean } = {
  currentStreak: 0,
  isAtRisk: false,
};
let mainWindowRef: BrowserWindow | null = null;

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
 * Build the tray context menu with current streak data
 */
function buildContextMenu(mainWindow: BrowserWindow): Menu {
  const streakLabel = currentStreakData.currentStreak > 0
    ? `${currentStreakData.currentStreak} day streak${currentStreakData.isAtRisk ? " (at risk!)" : ""}`
    : "No streak yet";

  return Menu.buildFromTemplate([
    {
      label: "Open Touch Typer",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: `🔥 ${streakLabel}`,
      enabled: false, // Display only, not clickable
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
}

/**
 * Update the tray tooltip and menu with streak data
 */
function updateTrayWithStreak(): void {
  if (!tray || !mainWindowRef) return;

  const streakText = currentStreakData.currentStreak > 0
    ? `${currentStreakData.currentStreak} day streak${currentStreakData.isAtRisk ? " ⚠️" : ""}`
    : "";

  const tooltip = streakText
    ? `Touch Typer - ${streakText}`
    : "Touch Typer";

  tray.setToolTip(tooltip);
  tray.setContextMenu(buildContextMenu(mainWindowRef));
}

/**
 * Setup the system tray icon and menu
 */
export function setupTray(mainWindow: BrowserWindow): Tray {
  mainWindowRef = mainWindow;

  // Set up IPC handler for streak updates
  ipcMain.on("updateStreakData", (_, data: { currentStreak: number; isAtRisk: boolean }) => {
    currentStreakData = data;
    updateTrayWithStreak();
  });

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

  // Set initial tooltip and menu
  tray.setToolTip("Touch Typer");
  tray.setContextMenu(buildContextMenu(mainWindow));

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

  // Handle window close - minimize to tray instead of quitting
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // On macOS, also hide from dock when minimized to tray
      if (process.platform === "darwin") {
        app.dock?.hide();
      }
    }
  });

  // Show dock icon again when window is shown
  mainWindow.on("show", () => {
    if (process.platform === "darwin") {
      app.dock?.show();
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
