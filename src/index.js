import { updateElectronApp } from 'update-electron-app';
updateElectronApp();

import { startApp } from "./app/app.js";
startApp();

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const exePath = process.execPath;
// createDesktopShortcut({
//     windows: {
//         filePath: exePath,
//         name: 'Croissant Launcher',
//         comment: 'Open Croissant Launcher',
//         icon: __dirname + '/icon.ico', // chemin vers ton fichier .ico
//         desktop: true,
//         startMenu: true,
//         menu: true // Ajoute le raccourci dans le menu démarrer
//     }
// });

import ws from 'windows-shortcuts';
import { app } from 'electron';

const exePath = process.execPath;
const desktop = app.getPath('desktop');
const shortcutPath = path.join(desktop, 'Croissant Launcher.lnk');

ws.create(shortcutPath, {
  target: exePath,
  desc: 'Start Croissant Launcher',
  icon: process.execPath,
});
