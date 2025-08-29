import { updateElectronApp } from 'update-electron-app';
updateElectronApp();

import path from 'path';
import ws from 'windows-shortcuts';
import { app } from 'electron';
import { startApp } from "./app/app.js";
startApp();

const exePath = process.execPath;
const desktop = app.getPath('desktop');
const shortcutPath = path.join(desktop, 'Croissant Launcher.lnk');

ws.create(shortcutPath, {
  target: exePath,
  desc: 'Start Croissant Launcher',
  icon: process.execPath,
});
