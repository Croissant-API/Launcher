import { app, shell } from 'electron';
import { startServer } from './server.js';
import { createMainWindow } from './mainWindow.js';
import { createTray } from './tray.js';
import { setupWebSocket } from './websocket.js';
import { ensureGamesDir } from './games.js';
import { ipcMain } from 'electron';
import path from 'path';

import { fileURLToPath } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { devEnv } from './mainWindow.js';
const ENDPOINT = devEnv ? "http://localhost:8580/" : "https://croissant-api.fr/";
const PROTOCOL = 'croissant-launcher'; // Utilise ce nom partout

let mainWindow = null;
let deeplinkToHandle = null; // Stocke le deeplink reçu avant que la fenêtre ne soit prête

function handleDeeplink(url, win) {
  try {
    const match = url.match(/croissant(-launcher):\/\/.*/i);
    const cleanUrl = match ? match[0] : url;
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== 'croissant-launcher:') return;
    if (!win) return;
    if (parsed.hostname === 'join-lobby') {
      const lobbyId = parsed.searchParams.get('lobbyId');
      if (lobbyId) {
        joinLobby(lobbyId, win);
      }
    } else if (parsed.hostname === 'set-token') {
      const token = parsed.searchParams.get('token');
      if (token) {
        loginToken(token, win);
      }
    }
  } catch (e) {
    // Optionally log error
    // console.error('Invalid deeplink:', url, e);
  }
}

export function loginToken(token, win) {
  win.webContents.send("set-token", token.toString());
  win.show();
  win.focus();
  win.setAlwaysOnTop(true, 'screen');
  setTimeout(() => win.setAlwaysOnTop(false), 1000);
}

export function joinLobby(lobbyId, win) {
  win.webContents.send("join-lobby", lobbyId);
  win.show();
  win.focus();
  win.setAlwaysOnTop(true, 'screen');
  setTimeout(() => win.setAlwaysOnTop(false), 1000);
}

export function startApp() {
  ensureGamesDir();

  // Stocke le deeplink passé au lancement (Windows/Linux)
  if ((process.platform === 'win32' || process.platform === 'linux') && process.argv.length > 1) {
    const deeplinkArg = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deeplinkArg) {
      deeplinkToHandle = deeplinkArg;
    }
  }

  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', (event, argv) => {
    // Sur Windows/Linux, argv contient le deeplink
    const deeplinkArg = argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deeplinkArg) {
      if (mainWindow) {
        handleDeeplink(deeplinkArg, mainWindow);
      } else {
        deeplinkToHandle = deeplinkArg;
      }
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // macOS : gestion du deeplink via open-url
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) {
      handleDeeplink(url, mainWindow);
    } else {
      deeplinkToHandle = url;
    }
  });

  app.whenReady().then(() => {
    startServer();
    mainWindow = createMainWindow();
    createTray(mainWindow);
    setupWebSocket();

    // Enregistre le protocole
    if (app.setAsDefaultProtocolClient) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.cwd(), '.')]);
    }

    // Si un deeplink a été reçu avant que la fenêtre ne soit prête, traite-le maintenant
    if (deeplinkToHandle) {
      setTimeout(() => handleDeeplink(deeplinkToHandle, mainWindow), 500);
      deeplinkToHandle = null;
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  ipcMain.on('window-minimize', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (win) win.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window-close', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (win) win.close();
  });

  ipcMain.on('open-discord-login', (event) => {
    open(ENDPOINT + "auth/discord")
  });

  ipcMain.on('open-google-login', (event) => {
    open(ENDPOINT + "auth/google")
  });

  ipcMain.on('open-email-login', (event) => {
    open(ENDPOINT + "login?from=launcher")
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });
}