const { startServer } = require('./server.js');
const { ensureGamesDir } = require('./games.js');
const { setupWebSocket } = require('./websocket.js');

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ENDPOINT = "http://localhost:8580/launcher/home?from=app";

async function startApp() {
  const appProcess = exec(
    `start msedge.exe --new-window --app="${ENDPOINT}"`,
    (error) => {
      if (error) {
        console.error(`Error opening URL: ${error.message}`);
      }
    }
  );

  const lockFilePath = path.join(process.cwd(), 'app.lock');

  if (fs.existsSync(lockFilePath)) {
    console.log('App is already running (lockfile detected).');
    process.exit(0);
  }

  fs.writeFileSync(lockFilePath, process.pid.toString());

  process.on('exit', () => {
    if (fs.existsSync(lockFilePath)) fs.unlinkSync(lockFilePath);
    appProcess.kill();
    console.log('App exited, lockfile removed.');
  });
  process.on('SIGINT', () => process.exit());
  process.on('SIGTERM', () => process.exit());

  ensureGamesDir();
  startServer();
  setupWebSocket();
}
startApp();