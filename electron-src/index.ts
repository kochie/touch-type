// Native
import { join } from "path";
import { format } from "url";

// Packages
import { app, BrowserWindow } from "electron";
// import { BrowserWindow } from "electron-acrylic-window";
import isDev from "electron-is-dev";
import prepareNext from "electron-next";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { init } from "@sentry/electron";

init({
  dsn: "https://b91033c73a0f46a287bfaa7959809d12@o157203.ingest.sentry.io/6633710",
});

autoUpdater.logger = log;
// @ts-ignore
autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

// Prepare the renderer once the app is ready
app.on("ready", async () => {
  await prepareNext("./renderer");
  autoUpdater.checkForUpdatesAndNotify();

  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    // transparent: true,
    // frame: false,
    vibrancy: "under-window",
    // transparent: true,
    // backgroundColor: "#00000000",
    // vibrancy: "under-page",
    // darkTheme: false,
    // visualEffectState: "followWindow",
    // roundedCorners: true,
    webPreferences: {
      // nodeIntegration: true,
      contextIsolation: false,
      preload: join(__dirname, "preload.js"),
    },
  });

  // mainWindow.setVibrancy("under-window");

  const url = isDev
    ? "http://localhost:8000/"
    : format({
        pathname: join(__dirname, "../renderer/out/index.html"),
        protocol: "file:",
        slashes: true,
      });

  mainWindow.loadURL(url);
});

// Quit the app once all windows are closed
app.on("window-all-closed", app.quit);
