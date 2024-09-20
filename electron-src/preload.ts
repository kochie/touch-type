/* eslint-disable @typescript-eslint/no-namespace */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ipcRenderer, IpcRenderer, contextBridge } from "electron";

declare global {
  namespace NodeJS {
    interface Global {
      ipcRenderer: IpcRenderer;
      getWordSet: () => string[];
      getProducts: () => Electron.Product[];
    }
  }
}

// Since we disabled nodeIntegration we can reintroduce
// needed node functionality here
contextBridge.exposeInMainWorld("electronAPI", {
  getWordSet: (language: string) => ipcRenderer.invoke("getWordSet", language),
  getProducts: () => ipcRenderer.invoke("getProducts"),
});
