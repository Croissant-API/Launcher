const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    window: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close'),
        openDiscordLogin: () => ipcRenderer.send('open-discord-login'),
        openGoogleLogin: () => ipcRenderer.send('open-google-login'),
        openEmailLogin: () => ipcRenderer.send('open-email-login'),
        onSetToken: (callback) => {
            ipcRenderer.on('set-token', (event, token) => callback(token));
        }
    }
});

ipcRenderer.on('set-token', (event, token) => {
    document.cookie = `token=${token}; path=/;`;
    location.reload();
    return;
})

ipcRenderer.on('join-lobby', (event, lobbyId) => {
    fetch("https://croissant-api.fr/api/lobbies/" +lobbyId+ "/join", {
        method: "POST",
        headers: {
            accept: "application/json",
            Authorization: "Bearer " + document.cookie.split('; ').find(row => row.startsWith('token=')).split('=')[1],
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