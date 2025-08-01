const { startServer } = require('./server.js');
const { ensureGamesDir } = require('./games.js');
const { setupWebSocket } = require('./websocket.js');
const ENDPOINT = "http://localhost:8580/launcher/home?from=app";

async function startApp() {
  ensureGamesDir();
  startServer();
  setupWebSocket();

  const exec = require('child_process').exec;
  exec(`start msedge --new-window --app="${ENDPOINT}"`, (error) => {
    if (error) {
      console.error(`Error opening URL: ${error.message}`);
    }
  });
}
startApp();