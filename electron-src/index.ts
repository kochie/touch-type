// Native
import { join } from "path";
import { format } from "url";

// Packages
import { app, BrowserWindow } from "electron";
// import { BrowserWindow } from "electron-acrylic-window";
import isDev from "electron-is-dev";
import prepareNext from "electron-next";

// Prepare the renderer once the app is ready
app.on("ready", async () => {
  await prepareNext("./renderer");

  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    // transparent: true,
    // frame: false,
    // vibrancy: "titlebar",
    // transparent: true,
    // backgroundColor: "#00000000",
    // vibrancy: "under-page",
    // darkTheme: false,
    // visualEffectState: "followWindow",
    // roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      preload: join(__dirname, "preload.js"),
    },
  });

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
