import { Tray, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

let tray;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createTray(mainWindow) {
  tray = new Tray(path.join(__dirname, 'icon.png')); // Use your icon path
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow) mainWindow.show();
      },
    },
    {
      label: 'Quit',
      click: () => {
        process.exit(0);
      },
    },
  ]);
  tray.setToolTip('Croissant Launcher');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}
