// Native
import { join } from "node:path";

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainInvokeEvent,
  MessageBoxOptions,
  nativeTheme,
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

import "./in-app-purchase"
import { getProducts } from "./in-app-purchase";

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

async function handleGetCodeSnippets(event: IpcMainInvokeEvent, lang: string) {
  try {
    return await readFile(join(__dirname, "../codesnippets/", `${lang}.txt`));
  } catch (error) {
    log.error(`Error loading code snippets for lang="${lang}":`, error);
    return null;
  }
}

async function handleLoadUserCodeFile(event: IpcMainInvokeEvent, filePath: string) {
  try {
    const content = await readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    log.error("Error loading user code file:", error);
    return null;
  }
}

async function handleShowOpenDialog() {
  try {
    return await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Code Files", extensions: ["c", "h", "py", "js", "ts", "txt", "cpp", "hpp", "java", "go", "rs"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
  } catch (error) {
    log.error("Error showing open dialog:", error);
    throw error;
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
  ipcMain.handle("isMas", () => !!process.mas);
  
  // Code mode IPC handlers
  ipcMain.handle("getCodeSnippets", handleGetCodeSnippets);
  ipcMain.handle("loadUserCodeFile", handleLoadUserCodeFile);
  ipcMain.handle("showOpenDialog", handleShowOpenDialog);

  // Drives native chrome (titlebar, vibrancy, mica) to match the user's
  // in-app theme choice. Without this, the window frame stays in the macOS
  // system appearance even when the renderer is in manual dark/light mode.
  ipcMain.handle(
    "setThemeSource",
    (_event: IpcMainInvokeEvent, source: "system" | "light" | "dark") => {
      if (source === "system" || source === "light" || source === "dark") {
        nativeTheme.themeSource = source;
      }
    },
  );

  // Debug info handler
  ipcMain.handle("getDebugInfo", () => ({
    isDev: isDevMode,
    platform: process.platform,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
  }));

  ipcMain.handle("getSystemLocale", () => app.getLocale());

  // Track whether the user has manually resized the window so we can skip
  // programmatic auto-resizes after they've taken ownership of the size.
  let userHasResized = false;
  let isProgrammaticResize = false;

  ipcMain.handle("setWindowHeight", (_event: IpcMainInvokeEvent, height: number) => {
    if (userHasResized) return;
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    const [width] = win.getSize();
    isProgrammaticResize = true;
    win.setSize(width, Math.round(height), true);
    // Reset flag after the resize event fires (~next tick)
    setTimeout(() => { isProgrammaticResize = false; }, 100);
  });

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
    height: 900,
    minWidth: 1280,
    minHeight: 900,
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
    shell.openExternal(details.url); // Open URL in user's browser.
    return { action: "deny" }; // Prevent the app from opening the URL.
  });

  mainWindow.on("resize", () => {
    if (!isProgrammaticResize) userHasResized = true;
  });

  // Set the main window reference for deep linking
  setMainWindow(mainWindow);

  // Setup system tray
  setupTray(mainWindow);

  // Setup notification scheduler IPC handlers
  setupNotificationScheduler(mainWindow);

  // Note: Even when starting hidden, we keep the dock icon visible on macOS
  // (like Slack). Clicking the dock icon will show the window.

  // mainWindow.setVibrancy("under-window");
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
// On all platforms, the app stays running in the tray when windows are closed
// The app only quits when the user explicitly quits from the tray menu
app.on("window-all-closed", () => {
  // Don't quit - the app continues running in the system tray
  // Users can quit explicitly from the tray context menu
});

// Properly quit when the user explicitly quits
app.on("before-quit", () => {
  setIsQuitting(true);
});
