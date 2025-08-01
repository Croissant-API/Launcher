const { startServer } = require('./server.js');
const { ensureGamesDir } = require('./games.js');
const { setupWebSocket } = require('./websocket.js');
const { showConsole, hideConsole } = require("node-hide-console-window");

// Créer l'icône dans le tray
// var tray = new gui.Tray({ icon: 'icon.png' });

// // Ajouter un menu contextuel (clic droit)
// var menu = new gui.Menu();
// menu.append(new gui.MenuItem({ label: 'Ouvrir', click: function() { console.log('Ouvrir clicked'); } }));
// menu.append(new gui.MenuItem({ label: 'Quitter', click: function() { gui.App.quit(); } }));

// tray.menu = menu;

// // Optionnel : afficher une notification au lancement
// gui.App.on('ready', function() {
//   console.log('Application prête');
// });

const { exec } = require('child_process');

const ENDPOINT = "https://croissant-api.fr/launcher/home?from=app";

async function startApp() {
  exec(
    `start msedge.exe --new-window --app="${ENDPOINT}"`,
    (error) => {
      if (error) {
        console.error(`Error opening URL: ${error.message}`);
      }
    }
  );

  // hideConsole();
  ensureGamesDir();
  startServer();
  setupWebSocket();
}
startApp();