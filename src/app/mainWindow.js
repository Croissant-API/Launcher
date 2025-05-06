import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './server.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devEnv = true;
const PORT_TO_SERVE = !devEnv ? PORT : 4536;

let win;

export function createMainWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        titleBarStyle: 'hidden',
        ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon.png'), // Use your icon path
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    win.maximize();
    win.loadURL('http://localhost:' + PORT_TO_SERVE + '/'); // Adjust the URL as needed

    win.setTitleBarOverlay({
        color: "rgba(0, 0, 0, 0)",
        symbolColor: "white",
        height: 30,
    });

    // Hide window instead of closing
    win.on('close', (event) => {
        event.preventDefault();
        win.hide();
    });

    return win;
}

export function loginToken(token) {
    win.webContents.send("set-token", token.toString());
    win.show();
    win.focus();

    // Bring window to foreground
    win.setAlwaysOnTop(true, 'screen');
    setTimeout(() => win.setAlwaysOnTop(false), 1000);
}

export function joinLobby(lobbyId) {
    win.webContents.send("join-lobby", lobbyId);
    win.show();
    win.focus();

    // Bring window to foreground
    win.setAlwaysOnTop(true, 'screen');
    setTimeout(() => win.setAlwaysOnTop(false), 1000);
}