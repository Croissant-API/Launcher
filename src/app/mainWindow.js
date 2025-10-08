import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const devEnv = false;

const PORT_TO_SERVE = 'https://croissant-api.fr/launcher/home';

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
}

let win;

export function createMainWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    titleBarStyle: 'hidden',
    ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.maximize();
  win.loadURL(PORT_TO_SERVE);

  win.setTitleBarOverlay({
    color: 'rgba(0, 0, 0, 0)',
    symbolColor: 'white',
    height: 30,
  });

  win.on('close', event => {
    event.preventDefault();
    win.hide();
  });

  return win;
}

