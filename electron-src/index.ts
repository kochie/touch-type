// Native
import { join } from "node:path";

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainInvokeEvent,
  MessageBoxOptions,
  shell,
} from "electron";
// import isDev from "electron-is-dev";
// import isDev from 'electron-is-dev';
import prepareNext from "./electron-next";
import {autoUpdater} from 'electron-updater';

import log from "electron-log";
import { init } from "@sentry/electron/main";
import { readFile } from "fs/promises";
import serve from "electron-serve";

import "./in-app-purchase";
import { getProducts, purchaseProduct, setIAPWindow } from "./in-app-purchase";

// Deep linking, notifications, and tray support
import { setupDeepLinkHandlers, setMainWindow, handleInitialDeepLink } from "./deep-link";
import { setupNotificationScheduler } from "./notification-scheduler";
import { setupTray, setIsQuitting } from "./tray";
import { setupStartupHandlers, shouldStartMinimized } from "./startup";

// import { fileURLToPath } from "node:url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

init({
  dsn: "https://b91033c73a0f46a287bfaa7959809d12@o157203.ingest.sentry.io/6633710",
});

autoUpdater.logger = log;
// @ts-ignore
autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

// Setup deep link handlers before app is ready
// This returns false if another instance is running
const shouldContinue = setupDeepLinkHandlers();
if (!shouldContinue) {
  // Another instance is already running, quit this one
  process.exit(0);
}

async function handleWordSet(event: IpcMainInvokeEvent, language: string) {
  try {
    const file = await readFile(
      join(__dirname, "../wordsets/", `${language}.txt`),
    );
    return file;
  } catch (error) {
    return new Uint8Array();
  }
}

const loadURL = serve({ directory: "renderer/out" });

// Prepare the renderer once the app is ready
// Store isDev status globally after import
let isDevMode = false;

app.on("ready", async () => {
  // Import isDev at app ready to avoid issues
  const isDev = await import("electron-is-dev");
  isDevMode = isDev.default;

  ipcMain.handle("getWordSet", handleWordSet);
  ipcMain.handle("getProducts", getProducts);
  ipcMain.handle("purchaseProduct", (_event, productId: string, quantity: number) =>
    purchaseProduct(productId, quantity ?? 1)
  );
  ipcMain.handle("isMas", () => !!process.mas);
  
  // Debug info handler
  ipcMain.handle("getDebugInfo", () => ({
    isDev: isDevMode,
    platform: process.platform,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
  }));

  // Setup startup handlers for launch at login
  setupStartupHandlers();

  // Use beta/alpha update channel when app version is a prerelease
  const appVersion = app.getVersion();
  if (appVersion.includes("-beta")) {
    autoUpdater.channel = "beta";
  } else if (appVersion.includes("-alpha")) {
    autoUpdater.channel = "alpha";
  }

  autoUpdater.checkForUpdatesAndNotify();

  // Check if we should start minimized (hidden in tray)
  const startHidden = shouldStartMinimized();
  log.info("Starting app:", { startHidden });

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    autoHideMenuBar: true,
    show: !startHidden, // Don't show window if starting minimized
    // transparent: true,
    // frame: false,
    vibrancy: "under-window",
    backgroundMaterial: "mica",
    // opacity: 0.85,
    // transparent: true,
    // backgroundColor: "#00000000",
    // vibrancy: "under-page",
    // darkTheme: false,
    // visualEffectState: "followWindow",
    // roundedCorners: true,
    // autoHideMenuBar: true,
    webPreferences: {
      // nodeIntegration: true,
      nodeIntegration: false,
      contextIsolation: true,
      // contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = details.url?.trim();
    const isValid =
      url &&
      (url.startsWith("http://") || url.startsWith("https://")) &&
      url !== "undefined" &&
      url !== "null";
    if (isValid) {
      shell.openExternal(url).catch((err) => {
        log.warn("Could not open external URL:", err?.message ?? err);
        dialog.showMessageBox(mainWindow, {
          type: "info",
          title: "Open in browser",
          message: "Copy this link and open it in your browser:",
          detail: url,
        });
      });
    } else {
      log.warn("Blocked invalid or missing URL:", url || "(empty)");
    }
    return { action: "deny" }; // Prevent the app from opening the URL in-app.
  });

  // Set the main window reference for deep linking and IAP
  setMainWindow(mainWindow);
  setIAPWindow(mainWindow);

  // Setup system tray
  setupTray(mainWindow);

  // Setup notification scheduler IPC handlers
  setupNotificationScheduler(mainWindow);

  // Note: Even when starting hidden, we keep the dock icon visible on macOS
  // (like Slack). Clicking the dock icon will show the window.

  if (isDevMode) {
    console.log("Running in development");

    await prepareNext("./renderer");
    await mainWindow.loadURL("http://localhost:8000/");
  } else {
    await loadURL(mainWindow);
  }

  // Handle deep link if app was launched with one
  mainWindow.webContents.once("did-finish-load", () => {
    handleInitialDeepLink();
  });

  // const url = isDev.default
  //   ? "http://localhost:8000/"
  //   : format({
  //       pathname: join(__dirname, "../renderer/out/index.html"),
  //       protocol: "file:",
  //       slashes: true,
  //     });

  // console.log("Loading URL", url);
});

setInterval(() => {
  autoUpdater.checkForUpdates();
}, 60000);

autoUpdater.on("update-downloaded", (event) => {
  const message =
    (process.platform === "win32" ? event.releaseNotes : event.releaseName) ??
    "";
  const dialogOpts: MessageBoxOptions = {
    type: "info",
    buttons: ["Restart", "Later"],
    title: "Application Update",
    message: Array.isArray(message) ? message.join("\n") : message,
    detail:
      "A new version has been downloaded. Restart the application to apply the updates.",
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      app.off("window-all-closed", app.quit);
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on("error", (message) => {
  console.error("There was a problem updating the application");
  console.error(message);
});

// Handle window-all-closed event
// On macOS, the app stays in the tray; on other platforms, quit
// The app only quits when the user explicitly quits from the tray menu
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Properly quit when the user explicitly quits
app.on("before-quit", () => {
  setIsQuitting(true);
});
