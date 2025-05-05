import { contextBridge, ipcRenderer } from 'electron';

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

ipcRenderer.on('join-lobby', (event, lobbyId) => {
    fetch("https://croissant-api.fr/api/lobbies/" +lobbyId+ "/join", {
        method: "POST",
        headers: {
            accept: "application/json",
            Authorization: "Bearer " + localStorage["token"],
            "Content-Type": "application/json",
        }
    }).then((response) => {
        if (response.status === 200) {
            // location.reload();
        } else {
            console.error("Failed to join lobby", response.statusText);
        }
    })
    return;
})