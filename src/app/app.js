const { startServer } = require('./server.js');
const { ensureGamesDir } = require('./games.js');
const { setupWebSocket } = require('./websocket.js');

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ENDPOINT = "http://localhost:8580/launcher/home?from=app";

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