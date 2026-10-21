const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexLauncher', {
  installPack: (pack) => ipcRenderer.invoke('packs:install', pack),
  openPackFolder: (id) => ipcRenderer.invoke('packs:open-folder', id)
});
