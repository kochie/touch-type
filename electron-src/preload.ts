/* eslint-disable @typescript-eslint/no-namespace */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ipcRenderer, IpcRenderer, contextBridge } from "electron";

declare global {
  namespace NodeJS {
    interface Global {
      ipcRenderer: IpcRenderer;
      getWords: () => string[];
    }
  }
}

// Since we disabled nodeIntegration we can reintroduce
// needed node functionality here
contextBridge.exposeInMainWorld("electronAPI", {
  getWords: () => ipcRenderer.invoke("getWords"),
});
