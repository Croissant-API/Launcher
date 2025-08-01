(async () => {
  await import("./app/app.js")
  const path = require('path');
  const ws = require('windows-shortcuts');

  // Utilisation du dossier Bureau de l'utilisateur sans Electron
  const desktop = path.join(require('os').homedir(), 'Desktop');
  const exePath = process.execPath;
  const shortcutPath = path.join(desktop, 'Croissant Launcher.lnk');

  ws.create(shortcutPath, {
    target: exePath,
    desc: 'Start Croissant Launcher',
    icon: exePath,
  });
})();
