import { app } from 'electron';
import { startServer } from './server.js';
import { createMainWindow } from './mainWindow.js';
import { createTray } from './tray.js';
import { setupWebSocket } from './websocket.js';
import { ensureGamesDir } from './games.js';
import { ipcMain } from 'electron';
import open from 'open';

export function startApp() {
  // Ensure games directory exists
  ensureGamesDir();

  let win = null;
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    });

    app.whenReady().then(() => {
      startServer();
      win = createMainWindow();
      createTray(win);
      setupWebSocket();
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

    ipcMain.on('open-login', (event) => {
      open("https://croissant-api.fr/login")
    });

    app.on('activate', () => {
      if (win === null) {
        win = createMainWindow();
      }
    });
  }
}