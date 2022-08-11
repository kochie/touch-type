"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_path = require("path");
var import_url = require("url");
var import_electron = require("electron");
var import_electron_is_dev = __toESM(require("electron-is-dev"));
var import_electron_next = __toESM(require("electron-next"));
var import_electron_updater = require("electron-updater");
var import_electron_log = __toESM(require("electron-log"));
var import_electron2 = require("@sentry/electron");
(0, import_electron2.init)({
  dsn: "https://b91033c73a0f46a287bfaa7959809d12@o157203.ingest.sentry.io/6633710"
});
import_electron_updater.autoUpdater.logger = import_electron_log.default;
import_electron_updater.autoUpdater.logger.transports.file.level = "info";
import_electron_log.default.info("App starting...");
import_electron.app.on("ready", async () => {
  await (0, import_electron_next.default)("./renderer");
  import_electron_updater.autoUpdater.checkForUpdatesAndNotify();
  const mainWindow = new import_electron.BrowserWindow({
    width: 1300,
    height: 800,
    minWidth: 1300,
    vibrancy: "under-window",
    webPreferences: {
      contextIsolation: false,
      preload: (0, import_path.join)(__dirname, "preload.js")
    }
  });
  const url = import_electron_is_dev.default ? "http://localhost:8000/" : (0, import_url.format)({
    pathname: (0, import_path.join)(__dirname, "../renderer/out/index.html"),
    protocol: "file:",
    slashes: true
  });
  mainWindow.loadURL(url);
});
setInterval(() => {
  import_electron_updater.autoUpdater.checkForUpdates();
}, 6e4);
import_electron_updater.autoUpdater.on("update-downloaded", (event) => {
  const message = (process.platform === "win32" ? event.releaseNotes : event.releaseName) ?? "";
  const dialogOpts = {
    type: "info",
    buttons: ["Restart", "Later"],
    title: "Application Update",
    message: Array.isArray(message) ? message.join("\n") : message,
    detail: "A new version has been downloaded. Restart the application to apply the updates."
  };
  import_electron.dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      import_electron.app.off("window-all-closed", import_electron.app.quit);
      import_electron_updater.autoUpdater.quitAndInstall();
    }
  });
});
import_electron_updater.autoUpdater.on("error", (message) => {
  console.error("There was a problem updating the application");
  console.error(message);
});
import_electron.app.on("window-all-closed", import_electron.app.quit);
