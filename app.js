import { app, BrowserWindow, ipcMain, Tray, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from "ws";
import open from 'open';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4536;

let win;
let tray;

const server = express();

// server.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, "build",'index.html'));
// });
// server.use(express.static(path.join(__dirname, 'build')));
// server.use((_req, res) => {
//     res.sendFile(path.join(__dirname, "build", "index.html"));
// });
// server.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
// WebSocket server setup
const wss = new WebSocketServer({ port: 8081 }); // Choose a port

wss.on("connection", (ws) => {
    ws.on("message", (token) => {
      // Send token to renderer process
      if (win) {
        win.webContents.send("set-token", token.toString());
        win.show();
        win.focus();

        // Bring window to foreground
        win.setAlwaysOnTop(true, 'screen');
        setTimeout(() => win.setAlwaysOnTop(false), 1000);

      }
    });
});

// Ensure single instance
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

  function createWindow() {
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
        allowRunningInsecureContent: true,
      }
    });

    win.maximize();
    win.loadURL('http://localhost:'+PORT);

    win.setTitleBarOverlay({
      color: "rgba(0, 0, 0, 0)",
      symbolColor: "white", // symbol color here
      height: 30,
    });

    // Hide window instead of closing
    win.on('close', (event) => {
      event.preventDefault();
      win.hide();
    });
  }

  app.whenReady().then(() => {
    createWindow();

    // Add tray icon
    tray = new Tray(path.join(__dirname, 'icon.png')); // Use your icon path
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show', click: () => { if (win) win.show(); } },
      { label: 'Quit', click: () => { process.exit(0); } }
    ]);
    tray.setToolTip('Croissant Launcher');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (win) win.show();
    });
  });

  // Handle window control events
  ipcMain.on('window-minimize', () => {
    if (win) win.minimize();
  });
  ipcMain.on('window-maximize', () => {
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('window-close', () => {
    if (win) win.close();
  });
  ipcMain.on('open-login', () => {
    open('https://croissant-api.fr/login');
  });
}
