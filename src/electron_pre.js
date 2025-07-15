const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('phone', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  showMe: () => {
    ipcRenderer.invoke('showme');
    console.log("show main window");
  },
  showVer: () => {
    ipcRenderer.invoke('showver');
    console.log("show version");
  }
})