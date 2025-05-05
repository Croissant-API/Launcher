const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    openLogin: () => ipcRenderer.send('open-login'),
  }
});

ipcRenderer.on('set-token', (event, token) => {
    localStorage["token"] = token;
    location.reload();
    return;
})