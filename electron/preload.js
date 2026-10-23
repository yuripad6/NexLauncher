const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexLauncher", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  launch: (opts) => ipcRenderer.invoke("game:launch", opts),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setUsername: (name) => ipcRenderer.invoke("settings:set-username", name),
  listLocalBuilds: () => ipcRenderer.invoke("builds:list-local"),
  createLocalBuild: (input) => ipcRenderer.invoke("builds:create-local", input),
  searchMods: (input) => ipcRenderer.invoke("modrinth:search", input),
  installMod: (input) => ipcRenderer.invoke("modrinth:install", input),
  searchModsCurseForge: (input) => ipcRenderer.invoke("curseforge:search", input),
  installModCurseForge: (input) => ipcRenderer.invoke("curseforge:install", input),
  importAuto: (type) => ipcRenderer.invoke("import:auto-detect", { type }),
  importFromTL: (input) => ipcRenderer.invoke("import:from-tlauncher", input),
  importFromPrism: (input) => ipcRenderer.invoke("import:from-prism", input),
  importFromZip: (input) => ipcRenderer.invoke("import:from-zip", input),
  onModProgress: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on("mod:progress", handler);
    return () => ipcRenderer.removeListener("mod:progress", handler);
  },
  onProgress: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on("game:progress", handler);
    return () => ipcRenderer.removeListener("game:progress", handler);
  }
});
