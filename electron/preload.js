import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("nexLauncher", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  launch: (opts) => ipcRenderer.invoke("game:launch", opts),
  onProgress: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on("game:progress", handler);
    return () => ipcRenderer.removeListener("game:progress", handler);
  }
});
