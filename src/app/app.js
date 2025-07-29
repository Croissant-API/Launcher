import { app, shell } from 'electron';
import { startServer } from './server.js';
import { createMainWindow } from './mainWindow.js';
import { createTray } from './tray.js';
import { setupWebSocket, setMainWindow } from './websocket.js';
import { ensureGamesDir } from './games.js';
import { ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { devEnv } from './mainWindow.js';
const ENDPOINT = devEnv ? "http://localhost:8580/" : "https://croissant-api.fr/";
const PROTOCOL = 'croissant-launcher';
const DISCORD_CLIENT_ID = '1324530344900431923';

let mainWindow = null;
let deeplinkToHandle = null;

function handleDeeplink(url, win) {
  try {
    if (url.startsWith(`discord-${DISCORD_CLIENT_ID}://`)) {
      return;
    }
    const match = url.match(/(croissant(-launcher)|discord-\d+):\/\/.*/i);
    const cleanUrl = match ? match[0] : url;
    if (cleanUrl.startsWith(`discord-${DISCORD_CLIENT_ID}://`)) {
      const secretMatch = cleanUrl.match(/secret=([^&]+)/);
      const pathSecret = cleanUrl.match(new RegExp(`discord-${DISCORD_CLIENT_ID}:\/\/\/([^?]+)`));
      let joinSecret = null;
      if (secretMatch) {
        joinSecret = decodeURIComponent(secretMatch[1]);
      } else if (pathSecret) {
        joinSecret = decodeURIComponent(pathSecret[1]);
      }
      if (joinSecret) {
        if (joinSecret.startsWith('join-lobby:lobbyId=')) {
          const lobbyId = joinSecret.replace('join-lobby:lobbyId=', '');
          joinLobby(lobbyId, win);
          return;
        } else {
          joinLobby(joinSecret, win);
          return;
        }
      }
      return;
    }
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== `${PROTOCOL}:`) return;
    if (!win) return;
    if (parsed.hostname === 'join-lobby') {
      const lobbyId = parsed.searchParams.get('lobbyId');
      if (lobbyId) joinLobby(lobbyId, win);
    } else if (parsed.hostname === 'set-token') {
      const token = parsed.searchParams.get('token');
      if (token) loginToken(token, win);
    }
  } catch (e) {
    console.error('Invalid deeplink:', url, e);
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
  if ((process.platform === 'win32' || process.platform === 'linux') && process.argv.length > 1) {
    const deeplinkArg = process.argv.find(arg => 
      arg.startsWith(`${PROTOCOL}://`) || 
      arg.startsWith(`discord-${DISCORD_CLIENT_ID}://`)
    );
    if (deeplinkArg) deeplinkToHandle = deeplinkArg;
  }
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }
  app.on('second-instance', (event, argv) => {
    const deeplinkArg = argv.find(arg => 
      arg.startsWith(`${PROTOCOL}://`) || 
      arg.startsWith(`discord-${DISCORD_CLIENT_ID}://`)
    );
    if (deeplinkArg) {
      if (mainWindow) handleDeeplink(deeplinkArg, mainWindow);
      else deeplinkToHandle = deeplinkArg;
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) handleDeeplink(url, mainWindow);
    else deeplinkToHandle = url;
  });
  app.whenReady().then(() => {
    startServer();
    mainWindow = createMainWindow();
    setMainWindow(mainWindow);
    createTray(mainWindow);
    setupWebSocket();
    if (process.defaultApp) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
      app.setAsDefaultProtocolClient(`discord-${DISCORD_CLIENT_ID}`, process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL);
      app.setAsDefaultProtocolClient(`discord-${DISCORD_CLIENT_ID}`);
    }
    if (deeplinkToHandle) {
      setTimeout(() => handleDeeplink(deeplinkToHandle, mainWindow), 500);
      deeplinkToHandle = null;
    }
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  ipcMain.on('window-minimize', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (win) win.minimize();
  });
  ipcMain.on('window-maximize', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });
  ipcMain.on('window-close', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    if (win) win.close();
  });
  ipcMain.on('open-discord-login', () => {
    open(ENDPOINT + "auth/discord");
  });
  ipcMain.on('open-google-login', () => {
    open(ENDPOINT + "auth/google");
  });
  ipcMain.on('open-email-login', () => {
    open(ENDPOINT + "transmitToken?from=launcher");
  });
  app.on('activate', () => {
    if (mainWindow === null) mainWindow = createMainWindow();
  });
}