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
  },
  showHistory: (data) => {
    ipcRenderer.invoke('showHistory', data);
    console.log("show call history:", data);
  },
  showStatus: (statusMsg) => {
    ipcRenderer.invoke('showStatus', statusMsg);
    console.log("show status msg:", statusMsg);
  },
  onNotification: (func) => {
    ipcRenderer.on('notification', (e, ...args) => func(...args));
  }
})