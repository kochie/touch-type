"use strict";
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  getWords: () => import_electron.ipcRenderer.invoke("getWords")
});
