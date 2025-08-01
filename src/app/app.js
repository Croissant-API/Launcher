const { startServer } = require('./server.js');
const { ensureGamesDir } = require('./games.js');
const { setupWebSocket } = require('./websocket.js');

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

  ensureGamesDir();
  startServer();
  setupWebSocket();
}
startApp();