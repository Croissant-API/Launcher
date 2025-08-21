import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import simpleGit from "simple-git";
import { checkInstallationStatus } from "./games.js";
import { spawn } from "child_process";
import zip from "adm-zip";
import RPC from "discord-rpc";

const now = new Date();
const clientId = "1324530344900431923";
const rpc = new RPC.Client({ transport: "ipc" });
let gamesDir;
if (process.platform === "linux") {
  gamesDir = path.join(process.env.HOME, ".croissant-launcher", "games");
} else if (process.platform === "darwin") {
  gamesDir = path.join(
    process.env.HOME,
    "Library",
    "Application Support",
    "Croissant-Launcher",
    "games"
  );
} else {
  // Windows
  gamesDir = path.join(process.env.APPDATA, "Croissant-Launcher", "games");
}

let actualConnection = null;

rpc.login({ clientId }).catch(console.error);
rpc.on("ready", () => {
  rpc.subscribe("ACTIVITY_JOIN_REQUEST");
  rpc.on("ACTIVITY_JOIN_REQUEST", ({ user }) => {
    rpc.sendJoinInvite(user.id);
  });
  rpc.subscribe("ACTIVITY_JOIN");
  rpc.on("ACTIVITY_JOIN", ({ secret }) => {
    //joinLobby(secret.split("secret")[0], mainWindow);
    actualConnection.send(
      JSON.stringify({
        action: "joinLobby",
        lobbyId: secret.split("secret")[0],
      })
    );
  });
});

rpc.on("error", (error) => {
  console.error("Discord RPC Error:", error);
});

rpc.on("disconnected", () => {});

export function setupWebSocket() {
  const wss = new WebSocketServer({ port: 8081 });
  console.log("WebSocket server started on ws://localhost:8081");

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ action: "serverReady" }));
    actualConnection = ws;

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);

        // Download game
        if (data.action === "downloadGame") {
          const { gameId, downloadUrl, token } = data;
          const dest = path.join(gamesDir, gameId);
          if (!fs.existsSync(dest)) {
            // if (downloadUrl.endsWith('.zip')) {
            const url = new URL("https://croissant-api.fr" + downloadUrl);
            console.log(url.href);
            const response = await fetch(url.href, {
              headers: {
                "User-Agent": "Croissant-Launcher",
                Accept: "application/zip",
                "Content-Type": "application/zip",
                Authorization: `Bearer ${token}`,
              },
            });
            if (!response.ok) {
              ws.send(
                JSON.stringify({
                  action: "error",
                  message: "Failed to download game",
                })
              );
              return;
            }
            const total = Number(response.headers.get("content-length")) || 0;
            let received = 0;
            const chunks = [];
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              received += value.length;
              if (total > 0) {
                const percent = Math.round((received / total) * 100);
                ws.send(
                  JSON.stringify({
                    action: "downloadProgress",
                    gameId,
                    percent,
                  })
                );
              }
            }
            fs.mkdirSync(dest, { recursive: true });
            const buffer = Buffer.concat(chunks);
            const zipFilePath = path.join(dest, "game.zip");
            fs.writeFileSync(zipFilePath, buffer);
            const zipInstance = new zip(zipFilePath);
            zipInstance.extractAllTo(dest, true);
            fs.unlinkSync(zipFilePath);
            ws.send(JSON.stringify({ action: "downloadComplete", gameId }));
            // } else {
            //     await simpleGit().clone(downloadUrl, dest);
            //     ws.send(JSON.stringify({ action: "downloadComplete", gameId }));
            // }
          } else {
            ws.send(JSON.stringify({ action: "alreadyInstalled", gameId }));
          }
        }

        // Play game
        if (data.action === "playGame") {
          const { gameId, playerId, verificationKey } = data;
          ws.send(JSON.stringify({ action: "playing", gameId }));
          const game = await fetch(
            `https://croissant-api.fr/api/games/${gameId}`
          ).then((res) => res.json());
          const gameName = game.name || "Unknown Game";

          const gamePath = path.join(gamesDir, gameId);

          // Correction des permissions sur Linux/macOS
          if (process.platform === "linux" || process.platform === "darwin") {
            try {
              const { spawnSync } = require("child_process");
              spawnSync("chown", ["-R", process.env.USER, gamePath]);
            } catch (e) {
              // Ignore les erreurs de chown
            }
          }

          let launchFile = null;
          const candidates = [".exe", "index.js", "index.ts", "index.html"];
          const files = fs.readdirSync(gamePath);
          for (const candidate of candidates) {
            if (candidate === ".exe") {
              // Utilise le plus gros .exe trouvé
              const exePath = findLargestExe(gamePath);
              if (exePath) {
                launchFile = exePath;
                break;
              }
            } else {
              // Check for candidate file in gamePath
              const filePath = path.join(gamePath, candidate);
              if (fs.existsSync(filePath)) {
                launchFile = filePath;
                break;
              }
              // Check for candidate file in immediate subdirectories
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
              ws.send(JSON.stringify({ action: "closeGame", gameId }));
            };
            // ...dans la section playGame, remplace le bloc de lancement .exe par :
            if (launchFile.endsWith(".exe")) {
              let proc;
              const exeArgs = [
                launchFile,
                `--croissantId=${playerId}`,
                `--croissantVerificationKey=${verificationKey}`,
              ];
              const opts = { cwd: gamePath, detached: true, stdio: "ignore" };
              let cmd, args;
              if (
                process.platform === "linux" ||
                process.platform === "darwin"
              ) {
                cmd = "wine";
                args = exeArgs;
              } else {
                cmd = launchFile;
                args = exeArgs.slice(1);
              }

              // Essaye avec les arguments croissant
              proc = await trySpawnWithFallback(cmd, args, opts, onExit);

              // Si échec, relance sans les arguments croissant
              if (!proc) {
                if (
                  process.platform === "linux" ||
                  process.platform === "darwin"
                ) {
                  proc = spawn("wine", [launchFile], opts);
                } else {
                  proc = spawn(launchFile, [], opts);
                }
                proc.unref();
                proc.on("exit", onExit);
              } else {
                proc.on("exit", onExit);
              }
            } else if (launchFile.endsWith(".js")) {
              proc = spawn(
                process.execPath,
                [
                  launchFile,
                  `--croissantId=${playerId}`,
                  `--croissantVerificationKey=${verificationKey}`,
                ],
                { cwd: gamePath, detached: true, stdio: "ignore" }
              );
              proc.unref();
              proc.on("exit", onExit);
            } else if (launchFile.endsWith(".ts")) {
              proc = spawn(
                "ts-node",
                [
                  launchFile,
                  `--croissantId=${playerId}`,
                  `--croissantVerificationKey=${verificationKey}`,
                ],
                { cwd: gamePath, detached: true, stdio: "ignore" }
              );
              proc.unref();
              proc.on("exit", onExit);
            }
          } else {
            ws.send(
              JSON.stringify({
                action: "error",
                message: "No launchable file found for game " + gameId,
              })
            );
            ws.send(JSON.stringify({ action: "closeGame", gameId }));
          }
        }

        // Close game
        if (data.action === "closeGame") {
          const { gameId } = data;
          ws.send(JSON.stringify({ action: "closed", gameId }));
        }

        // Check installation status
        if (data.action === "checkInstallationStatus") {
          const { gameId } = data;
          const status = await checkInstallationStatus(gameId);
          ws.send(JSON.stringify({ action: "status", gameId, status }));
        }

        // List games
        if (data.action === "listGames") {
          const games = fs.readdirSync(gamesDir).map((gameId) => ({
            gameId,
            state: fs.existsSync(path.join(gamesDir, gameId))
              ? "installed"
              : "not_installed",
          }));
          ws.send(JSON.stringify({ action: "gamesList", games }));
        }

        // Delete game
        if (data.action === "deleteGame") {
          const { gameId } = data;
          const dest = path.join(gamesDir, gameId);
          if (fs.existsSync(dest)) {
            fs.rmdirSync(dest, { recursive: true });
            ws.send(JSON.stringify({ action: "deleteComplete", gameId }));
          } else {
            ws.send(JSON.stringify({ action: "notFound", gameId }));
          }
        }

        // Update game
        if (data.action === "updateGame") {
          const { gameId } = data;
          const dest = path.join(gamesDir, gameId);
          if (fs.existsSync(dest)) {
            await simpleGit(dest).pull();
            ws.send(JSON.stringify({ action: "updateComplete", gameId }));
          } else {
            ws.send(JSON.stringify({ action: "notFound", gameId }));
          }
        }

        // Get game info
        if (data.action === "getGameInfo") {
          const { gameId } = data;
          const dest = path.join(gamesDir, gameId);
          if (fs.existsSync(dest)) {
            const stats = fs.statSync(dest);
            ws.send(
              JSON.stringify({ action: "gameInfo", gameId, size: stats.size })
            );
          } else {
            ws.send(JSON.stringify({ action: "notFound", gameId }));
          }
        }

        // Get game icon
        if (data.action === "getGameIcon") {
          const { gameId } = data;
          const iconPath = path.join(gamesDir, gameId, "icon.png");
          if (fs.existsSync(iconPath)) {
            const iconBuffer = fs.readFileSync(iconPath);
            ws.send(
              JSON.stringify({
                action: "gameIcon",
                gameId,
                icon: iconBuffer.toString("base64"),
              })
            );
          } else {
            ws.send(JSON.stringify({ action: "notFound", gameId }));
          }
        }

        // Get game description
        if (data.action === "getGameDescription") {
          const { gameId } = data;
          const descPath = path.join(gamesDir, gameId, "description.txt");
          if (fs.existsSync(descPath)) {
            const description = fs.readFileSync(descPath, "utf-8");
            ws.send(
              JSON.stringify({ action: "gameDescription", gameId, description })
            );
          } else {
            ws.send(JSON.stringify({ action: "notFound", gameId }));
          }
        }

        // Get game version
        if (data.action === "getGameVersion") {
          const { gameId } = data;
          const versionPath = path.join(gamesDir, gameId, "version.txt");
          if (fs.existsSync(versionPath)) {
            const version = fs.readFileSync(versionPath, "utf-8");
            ws.send(JSON.stringify({ action: "gameVersion", gameId, version }));
          } else {
            ws.send(JSON.stringify({ action: "notFound", gameId }));
          }
        }

        // Get game size
        if (data.action === "getGameSize") {
          const { gameId } = data;
          const sizePath = path.join(gamesDir, gameId);
          if (fs.existsSync(sizePath)) {
            const stats = fs.statSync(sizePath);
            ws.send(
              JSON.stringify({ action: "gameSize", gameId, size: stats.size })
            );
          } else {
            ws.send(JSON.stringify({ action: "notFound", gameId }));
          }
        }

        // Get game state
        if (data.action === "getGameState") {
          const { gameId } = data;
          const state = fs.existsSync(path.join(gamesDir, gameId))
            ? "installed"
            : "not_installed";
          ws.send(JSON.stringify({ action: "gameState", gameId, state }));
        }

        // Get game path
        if (data.action === "getGamePath") {
          const { gameId } = data;
          const gamePath = path.join(gamesDir, gameId);
          if (fs.existsSync(gamePath)) {
            ws.send(
              JSON.stringify({ action: "gamePath", gameId, path: gamePath })
            );
          } else {
            ws.send(JSON.stringify({ action: "notFound", gameId }));
          }
        }

        if (data.action === "setActivity") {
          // console.log("Setting activity:", data.activity);
          rpc.setActivity({
            ...data.activity,
            partySize: parseInt(data.activity.partySize || 0),
            partyMax: parseInt(data.activity.partyMax || 0),
          });
        }
      } catch (err) {
        ws.send(JSON.stringify({ action: "error", message: err.message }));
      }
    });
  });
  return wss;
}

/**
 * Cherche le plus gros fichier .exe dans un dossier (et ses sous-dossiers immédiats)
 * @param {string} dir
 * @returns {string|null} chemin du plus gros .exe ou null
 */
function findLargestExe(dir) {
  let largest = { path: null, size: 0 };
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    if (fs.statSync(entryPath).isFile() && entry.endsWith(".exe")) {
      const size = fs.statSync(entryPath).size;
      if (size > largest.size) {
        largest = { path: entryPath, size };
      }
    } else if (fs.statSync(entryPath).isDirectory()) {
      const subEntries = fs.readdirSync(entryPath);
      for (const subEntry of subEntries) {
        const subEntryPath = path.join(entryPath, subEntry);
        if (fs.statSync(subEntryPath).isFile() && subEntry.endsWith(".exe")) {
          const size = fs.statSync(subEntryPath).size;
          if (size > largest.size) {
            largest = { path: subEntryPath, size };
          }
        }
      }
    }
  }
  return largest.path;
}

// ...dans la section "playGame", juste avant le if (launchFile.endsWith(".exe")) { ... }
async function trySpawnWithFallback(cmd, args, opts, onExit) {
  return new Promise((resolve) => {
    let proc = spawn(cmd, args, opts);
    let exited = false;
    let timer = setTimeout(() => {
      if (!exited) {
        // Only resolve with proc if it hasn't exited (still running)
        proc.unref();
        resolve(proc);
      }
    }, 10000); // 2 secondes : si le process tient, on considère que c'est bon

    proc.on("exit", (code) => {
      exited = true;
      clearTimeout(timer);
      // If the process exits (with any code) before the timeout, treat as failure
      resolve(null);
    });
    proc.on("error", () => {
      exited = true;
      clearTimeout(timer);
      resolve(null);
    });
  });
}
