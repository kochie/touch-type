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
app.on("ready", async () => {
  ipcMain.handle("getWordSet", handleWordSet);

  autoUpdater.checkForUpdatesAndNotify();

  

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    autoHideMenuBar: true,
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

  // mainWindow.setVibrancy("under-window");
  const isDev = await import("electron-is-dev");

  if (isDev.default) {
    console.log("Running in development");

    await prepareNext("./renderer");
    await mainWindow.loadURL("http://localhost:8000/");
  } else {
    await loadURL(mainWindow);
  }

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

// Quit the app once all windows are closed
app.on("window-all-closed", app.quit);
