import { spawn } from 'child_process';
import RPC from 'discord-rpc';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import { checkInstallationStatus } from './games.js';
import { detect, update } from './smart-update.js';

const now = new Date();
const clientId = '1324530344900431923';
const rpc = new RPC.Client({ transport: 'ipc' });
let gamesDir;
if (process.platform === 'linux') {
  gamesDir = path.join(process.env.HOME, '.croissant-launcher', 'games');
} else if (process.platform === 'darwin') {
  gamesDir = path.join(process.env.HOME, 'Library', 'Application Support', 'Croissant-Launcher', 'games');
} else {
  gamesDir = path.join(process.env.APPDATA, 'Croissant-Launcher', 'games');
}

let actualConnection = null;
let procs = [];

rpc.login({ clientId }).catch(console.error);
rpc.on('ready', () => {
  rpc.subscribe('ACTIVITY_JOIN_REQUEST');
  rpc.on('ACTIVITY_JOIN_REQUEST', ({ user }) => {
    rpc.sendJoinInvite(user.id);
  });
  rpc.subscribe('ACTIVITY_JOIN');
  rpc.on('ACTIVITY_JOIN', ({ secret }) => {
    //joinLobby(secret.split("secret")[0], mainWindow);
    actualConnection.send(
      JSON.stringify({
        action: 'joinLobby',
        lobbyId: secret.split('secret')[0],
      })
    );
  });
});

rpc.on('error', error => {
  console.error('Discord RPC Error:', error);
});

rpc.on('disconnected', () => {});

export function setupWebSocket() {
  const wss = new WebSocketServer({ port: 8081 });
  console.log('WebSocket server started on ws://localhost:8081');

  wss.on('connection', ws => {
    ws.send(JSON.stringify({ action: 'serverReady' }));
    actualConnection = ws;

    ws.on('message', async msg => {
      try {
        const data = JSON.parse(msg);

        if (data.action === 'downloadGame') {
          const { gameId, token } = data;
          try {
            const needs = await detect(gameId, token);
            if (needs) {
              await update(
                gameId,
                percent => {
                  ws.send(
                    JSON.stringify({
                      action: 'downloadProgress',
                      gameId,
                      percent,
                    })
                  );
                },
                token
              );
              ws.send(JSON.stringify({ action: 'downloadComplete', gameId }));
            } else {
              ws.send(JSON.stringify({ action: 'alreadyInstalled', gameId }));
            }
          } catch (e) {
            console.error(e);
            ws.send(JSON.stringify({ action: 'error', message: e.message }));
          }
        }

        if (data.action === 'playGame') {
          const { gameId, playerId, verificationKey } = data;
          ws.send(JSON.stringify({ action: 'playing', gameId }));
          const game = await fetch(`https://croissant-api.fr/api/games/${gameId}`).then(res => res.json());
          const gameName = game.name || 'Unknown Game';

          const gamePath = path.join(gamesDir, gameId);

          if (process.platform === 'linux' || process.platform === 'darwin') {
            try {
              const { spawnSync } = require('child_process');
              spawnSync('chown', ['-R', process.env.USER, gamePath]);
            } catch (e) {}
          }

          let launchFile = null;
          const candidates = ['.exe', 'index.js', 'index.ts', 'index.html'];
          const files = fs.readdirSync(gamePath);
          for (const candidate of candidates) {
            if (candidate === '.exe') {
              const exePath = findLargestExe(gamePath);
              if (exePath) {
                launchFile = exePath;
                break;
              }
            } else {
              const filePath = path.join(gamePath, candidate);
              if (fs.existsSync(filePath)) {
                launchFile = filePath;
                break;
              }

              for (const dir of files) {
                const subPath = path.join(gamePath, dir);
                if (fs.statSync(subPath).isDirectory()) {
                  const subFilePath = path.join(subPath, candidate);
                  if (fs.existsSync(subFilePath)) {
                    launchFile = subFilePath;
                    break;
                  }
                }
              }
              if (launchFile) break;
            }
          }
          if (launchFile) {
            let proc;
            const onExit = () => {
              ws.send(JSON.stringify({ action: 'closeGame', gameId }));
              procs = procs.filter(p => p.gameId !== gameId);
            };

            if (launchFile.endsWith('.exe')) {
              let proc;
              const exeArgs = [launchFile, `--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`];
              const opts = { cwd: gamePath, detached: false, stdio: 'ignore' }; // Ensure detached is false
              let cmd, args;
              if (process.platform === 'linux' || process.platform === 'darwin') {
                cmd = 'wine';
                args = exeArgs;
              } else {
                cmd = launchFile;
                args = exeArgs.slice(1);
              }

              proc = await trySpawnWithFallback(cmd, args, opts, onExit);

              if (!proc) {
                if (process.platform === 'linux' || process.platform === 'darwin') {
                  proc = spawn('wine', [launchFile], { ...opts, detached: false });
                } else {
                  proc = spawn(launchFile, [], { ...opts, detached: false });
                }
                proc.unref();
                proc.on('exit', onExit);
              } else {
                proc.on('exit', onExit);
              }
            } else if (launchFile.endsWith('.js')) {
              proc = spawn(process.execPath, [launchFile, `--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`], { cwd: gamePath, detached: true, stdio: 'ignore' });
              proc.unref();
              proc.on('exit', onExit);
            } else if (launchFile.endsWith('.ts')) {
              proc = spawn('ts-node', [launchFile, `--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`], { cwd: gamePath, detached: true, stdio: 'ignore' });
              proc.unref();
              proc.on('exit', onExit);
            }
            if (proc) {
              console.log(`Launched process PID: ${proc.pid} for gameId: ${gameId}`); // Log the PID of the launched process
              procs.push({ gameId, proc });
              proc.on('exit', onExit);
            }
          } else {
            ws.send(
              JSON.stringify({
                action: 'error',
                message: 'No launchable file found for game ' + gameId,
              })
            );
            ws.send(JSON.stringify({ action: 'closeGame', gameId }));
          }
        }

        if (data.action === 'closeGame') {
          const { gameId } = data;
          ws.send(JSON.stringify({ action: 'closed', gameId }));
        }

        if (data.action === 'stopGame') {
          const { gameId } = data;
          const gameProc = procs.find(p => p.gameId === gameId);
          if (gameProc) {
            const procName = path.basename(gameProc.proc.spawnfile); // Get the executable name
            const { exec } = require('child_process');
            exec(`taskkill /f /im ${procName}`, (error, stdout, stderr) => {
              if (error) {
                console.error(`Error stopping process: ${error.message}`);
                ws.send(JSON.stringify({ action: 'error', message: `Failed to stop game ${gameId}` }));
                return;
              }
              console.log(`Stopped process for gameId: ${gameId}`);
              procs = procs.filter(p => p.gameId !== gameId);
              ws.send(JSON.stringify({ action: 'stopped', gameId }));
            });
          } else {
            ws.send(JSON.stringify({ action: 'error', message: 'No running process found for game ' + gameId }));
          }
        }

        if (data.action === 'checkInstallationStatus') {
          const { gameId } = data;
          const status = await checkInstallationStatus(gameId, data.token);
          ws.send(JSON.stringify({ action: 'status', gameId, status }));
        }

        if (data.action === 'listGames') {
          const games = fs.readdirSync(gamesDir).map(gameId => ({
            gameId,
            state: fs.existsSync(path.join(gamesDir, gameId)) ? 'installed' : 'not_installed',
          }));
          ws.send(JSON.stringify({ action: 'gamesList', games }));
        }

        if (data.action === 'deleteGame') {
          const { gameId } = data;
          const dest = path.join(gamesDir, gameId);
          if (fs.existsSync(dest)) {
            fs.rmdirSync(dest, { recursive: true });
            ws.send(JSON.stringify({ action: 'deleteComplete', gameId }));
          } else {
            ws.send(JSON.stringify({ action: 'notFound', gameId }));
          }
        }

        if (data.action === 'updateGame') {
          const { gameId, token } = data;
          const dest = path.join(gamesDir, gameId);
          if (!fs.existsSync(dest)) {
            ws.send(JSON.stringify({ action: 'notFound', gameId }));
            return;
          }
          try {
            const needs = await detect(gameId, token);
            if (needs) {
              await update(
                gameId,
                percent => {
                  ws.send(
                    JSON.stringify({
                      action: 'updateProgress',
                      gameId,
                      percent,
                    })
                  );
                },
                token
              );
              ws.send(JSON.stringify({ action: 'updateComplete', gameId }));
            } else {
              ws.send(JSON.stringify({ action: 'alreadyUpToDate', gameId }));
            }
          } catch (e) {
            ws.send(JSON.stringify({ action: 'error', message: e.message }));
          }
        }

        if (data.action === 'getGameInfo') {
          const { gameId } = data;
          const dest = path.join(gamesDir, gameId);
          if (fs.existsSync(dest)) {
            const stats = fs.statSync(dest);
            ws.send(JSON.stringify({ action: 'gameInfo', gameId, size: stats.size }));
          } else {
            ws.send(JSON.stringify({ action: 'notFound', gameId }));
          }
        }

        if (data.action === 'getGameIcon') {
          const { gameId } = data;
          const iconPath = path.join(gamesDir, gameId, 'icon.png');
          if (fs.existsSync(iconPath)) {
            const iconBuffer = fs.readFileSync(iconPath);
            ws.send(
              JSON.stringify({
                action: 'gameIcon',
                gameId,
                icon: iconBuffer.toString('base64'),
              })
            );
          } else {
            ws.send(JSON.stringify({ action: 'notFound', gameId }));
          }
        }

        if (data.action === 'getGameDescription') {
          const { gameId } = data;
          const descPath = path.join(gamesDir, gameId, 'description.txt');
          if (fs.existsSync(descPath)) {
            const description = fs.readFileSync(descPath, 'utf-8');
            ws.send(JSON.stringify({ action: 'gameDescription', gameId, description }));
          } else {
            ws.send(JSON.stringify({ action: 'notFound', gameId }));
          }
        }

        if (data.action === 'getGameVersion') {
          const { gameId } = data;
          const versionPath = path.join(gamesDir, gameId, 'version.txt');
          if (fs.existsSync(versionPath)) {
            const version = fs.readFileSync(versionPath, 'utf-8');
            ws.send(JSON.stringify({ action: 'gameVersion', gameId, version }));
          } else {
            ws.send(JSON.stringify({ action: 'notFound', gameId }));
          }
        }

        if (data.action === 'getGameSize') {
          const { gameId } = data;
          const sizePath = path.join(gamesDir, gameId);
          if (fs.existsSync(sizePath)) {
            const stats = fs.statSync(sizePath);
            ws.send(JSON.stringify({ action: 'gameSize', gameId, size: stats.size }));
          } else {
            ws.send(JSON.stringify({ action: 'notFound', gameId }));
          }
        }

        if (data.action === 'getGameState') {
          const { gameId } = data;
          const state = fs.existsSync(path.join(gamesDir, gameId)) ? 'installed' : 'not_installed';
          ws.send(JSON.stringify({ action: 'gameState', gameId, state }));
        }

        if (data.action === 'getGamePath') {
          const { gameId } = data;
          const gamePath = path.join(gamesDir, gameId);
          if (fs.existsSync(gamePath)) {
            ws.send(JSON.stringify({ action: 'gamePath', gameId, path: gamePath }));
          } else {
            ws.send(JSON.stringify({ action: 'notFound', gameId }));
          }
        }

        if (data.action === 'setActivity') {
          rpc.setActivity({
            ...data.activity,
            partySize: parseInt(data.activity.partySize || 0),
            partyMax: parseInt(data.activity.partyMax || 0),
          });
        }
      } catch (err) {
        ws.send(JSON.stringify({ action: 'error', message: err.message }));
      }
    });
  });
  return wss;
}

function findLargestExe(dir) {
  let largest = { path: null, size: 0 };

  function search(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir);
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const entryPath = path.join(currentDir, entry);
      let stat;
      try {
        stat = fs.statSync(entryPath);
      } catch (e) {
        continue;
      }
      if (stat.isFile() && entry.endsWith('.exe')) {
        if (stat.size > largest.size) {
          largest = { path: entryPath, size: stat.size };
        }
      } else if (stat.isDirectory()) {
        search(entryPath);
      }
    }
  }

  search(dir);
  return largest.path;
}

async function trySpawnWithFallback(cmd, args, opts, onExit) {
  return new Promise(resolve => {
    let proc = spawn(cmd, args, opts);
    let exited = false;
    let timer = setTimeout(() => {
      if (!exited) {
        proc.unref();
        resolve(proc);
      }
    }, 10000);

    proc.on('exit', code => {
      exited = true;
      clearTimeout(timer);

      resolve(null);
    });
    proc.on('error', () => {
      exited = true;
      clearTimeout(timer);
      resolve(null);
    });
  });
}
