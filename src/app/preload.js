window.electron = {
    window: {
        minimize: () => Neutralino.events.emit('window-minimize'),
        maximize: () => Neutralino.events.emit('window-maximize'),
        close: () => Neutralino.events.emit('window-close'),
        openDiscordLogin: () => Neutralino.events.emit('open-discord-login'),
        openGoogleLogin: () => Neutralino.events.emit('open-google-login'),
        openEmailLogin: () => Neutralino.events.emit('open-email-login'),
        onSetToken: (callback) => {
            Neutralino.events.on('set-token', (evt) => callback(evt.detail.token));
        }
    }
};

Neutralino.events.on('set-token', (evt) => {
    const token = evt.detail.token;
    document.cookie = `token=${token}; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
    location.reload();
});

Neutralino.events.on('join-lobby', (evt) => {
    const lobbyId = evt.detail.lobbyId;
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
    });
});