import { WebSocketServer } from "ws";
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { loginToken, joinLobby } from './mainWindow.js';
import { checkInstallationStatus } from './games.js';
import { spawn } from 'child_process';
import { BrowserWindow } from 'electron'; // Add this import at the top

const gamesDir = path.join(process.APPDATA, 'Croissant-Launcher', 'games');

export function setupWebSocket() {
    const wss = new WebSocketServer({ port: 8081 });

    wss.on("connection", (ws) => {
        ws.on("message", async (msg) => {
            try {
                const data = JSON.parse(msg);
                if (data.action === "downloadGame") {
                    const { gameId, downloadUrl } = data;
                    const dest = path.join(gamesDir, gameId);
                    if (!fs.existsSync(dest)) {
                        // Git clone
                        await simpleGit().clone(downloadUrl, dest);
                        ws.send(JSON.stringify({ action: "downloadComplete", gameId }));
                    } else {
                        ws.send(JSON.stringify({ action: "alreadyInstalled", gameId }));
                    }
                }
                if (data.action === "playGame") {
                    const { gameId, playerId, verificationKey } = data;
                    // Here, launch the game (e.g., spawn process)
                    ws.send(JSON.stringify({ action: "playing", gameId }));

                    // Trigger closeGame after 5 seconds
                    // setTimeout(() => {
                    //     ws.send(JSON.stringify({ action: "closeGame", gameId }));
                    // }, 5000);

                    const gamePath = path.join(gamesDir, gameId);
                    let launchFile = null;
                    const candidates = ['.exe', 'index.js', 'index.ts', 'index.html'];

                    for (const candidate of candidates) {
                        if (candidate === '.exe') {
                            // Find the first .exe file in the game directory
                            const files = fs.readdirSync(gamePath);
                            const exeFile = files.find(f => f.endsWith('.exe'));
                            if (exeFile) {
                                launchFile = path.join(gamePath, exeFile);
                                break;
                            }
                        } else {
                            const filePath = path.join(gamePath, candidate);
                            if (fs.existsSync(filePath)) {
                                launchFile = filePath;
                                break;
                            }
                        }
                    }

                    if (launchFile) {
                        let proc;
                        if (launchFile.endsWith('.exe')) {
                            proc = spawn(
                                launchFile,
                                [`--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`],
                                { cwd: gamePath, detached: true, stdio: 'ignore' }
                            );
                            proc.unref();
                            proc.on('exit', () => {
                                ws.send(JSON.stringify({ action: "closeGame", gameId }));
                            });
                        } else if (launchFile.endsWith('.js')) {
                            proc = spawn(
                                process.execPath,
                                [launchFile, `--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`],
                                { cwd: gamePath, detached: true, stdio: 'ignore' }
                            );
                            proc.unref();
                            proc.on('exit', () => {
                                ws.send(JSON.stringify({ action: "closeGame", gameId }));
                            });
                        } else if (launchFile.endsWith('.ts')) {
                            proc = spawn(
                                'ts-node',
                                [launchFile, `--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`],
                                { cwd: gamePath, detached: true, stdio: 'ignore' }
                            );
                            proc.unref();
                            proc.on('exit', () => {
                                ws.send(JSON.stringify({ action: "closeGame", gameId }));
                            });
                        } else if (launchFile.endsWith('.html')) {
                            // Open in a new Electron BrowserWindow with query string
                            const win = new BrowserWindow({
                                width: 800,
                                height: 600,
                                autoHideMenuBar: true,
                                webPreferences: {
                                    nodeIntegration: true,
                                    contextIsolation: false,
                                }
                            });
                            win.loadURL(`file://${launchFile}?croissantId=${encodeURIComponent(playerId)}&croissantVerificationKey=${encodeURIComponent(verificationKey)}`);
                            win.on('closed', () => {
                                ws.send(JSON.stringify({ action: "closeGame", gameId }));
                            });
                        }
                    } else {
                        ws.send(JSON.stringify({ action: "error", message: "No launchable file found for game " + gameId }));
                        ws.send(JSON.stringify({ action: "closeGame", gameId }));
                    }
                }
                if (data.action === "closeGame") {
                    const { gameId } = data;
                    // Here, close the game process if needed
                    ws.send(JSON.stringify({ action: "closed", gameId }));
                }
                if(data.action === "checkInstallationStatus") {
                    const { gameId } = data;
                    // Use the async checkInstallationStatus
                    const status = await checkInstallationStatus(gameId);
                    ws.send(JSON.stringify({ action: "status", gameId, status }));
                }
                if (data.action === "listGames") {
                    const games = fs.readdirSync(gamesDir).map(gameId => {
                        return {
                            gameId,
                            state: fs.existsSync(path.join(gamesDir, gameId)) ? 'installed' : 'not_installed',
                        };
                    });
                    ws.send(JSON.stringify({ action: "gamesList", games }));
                }
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
                if (data.action === "getGameInfo") {
                    const { gameId } = data;
                    const dest = path.join(gamesDir, gameId);
                    if (fs.existsSync(dest)) {
                        const stats = fs.statSync(dest);
                        ws.send(JSON.stringify({ action: "gameInfo", gameId, size: stats.size }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }
                if (data.action === "getGameIcon") {
                    const { gameId } = data;
                    const iconPath = path.join(gamesDir, gameId, 'icon.png'); // Adjust the path as needed
                    if (fs.existsSync(iconPath)) {
                        const iconBuffer = fs.readFileSync(iconPath);
                        ws.send(JSON.stringify({ action: "gameIcon", gameId, icon: iconBuffer.toString('base64') }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }
                if (data.action === "getGameDescription") {
                    const { gameId } = data;
                    const descPath = path.join(gamesDir, gameId, 'description.txt'); // Adjust the path as needed
                    if (fs.existsSync(descPath)) {
                        const description = fs.readFileSync(descPath, 'utf-8');
                        ws.send(JSON.stringify({ action: "gameDescription", gameId, description }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }
                if (data.action === "getGameVersion") {
                    const { gameId } = data;
                    const versionPath = path.join(gamesDir, gameId, 'version.txt'); // Adjust the path as needed
                    if (fs.existsSync(versionPath)) {
                        const version = fs.readFileSync(versionPath, 'utf-8');
                        ws.send(JSON.stringify({ action: "gameVersion", gameId, version }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }
                if (data.action === "getGameSize") {
                    const { gameId } = data;
                    const sizePath = path.join(gamesDir, gameId); // Adjust the path as needed
                    if (fs.existsSync(sizePath)) {
                        const stats = fs.statSync(sizePath);
                        ws.send(JSON.stringify({ action: "gameSize", gameId, size: stats.size }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }
                if (data.action === "getGameState") {
                    const { gameId } = data;
                    const state = fs.existsSync(path.join(gamesDir, gameId)) ? 'installed' : 'not_installed';
                    ws.send(JSON.stringify({ action: "gameState", gameId, state }));
                }
                if (data.action === "getGamePath") {
                    const { gameId } = data;
                    const gamePath = path.join(gamesDir, gameId); // Adjust the path as needed
                    if (fs.existsSync(gamePath)) {
                        ws.send(JSON.stringify({ action: "gamePath", gameId, path: gamePath }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }
                if (data.action === "set-token") {
                    loginToken(data.token);
                }
                if (data.action === "join-lobby") {
                    const { lobbyId } = data;
                    joinLobby(lobbyId);
                }
                // if (data.action === "getGameLaunchCommand") {
                //     const { gameId } = data;
                //     const launchPath = path.join(gamesDir, gameId, 'launch.sh'); // Adjust the path as needed
                //     if (fs.existsSync(launchPath)) {
                //         const command = fs.readFileSync(launchPath, 'utf-8');
                //         ws.send(JSON.stringify({ action: "gameLaunchCommand", gameId, command }));
                //     } else {
                //         ws.send(JSON.stringify({ action: "notFound", gameId }));
                //     }
                // }
                // if (data.action === "getGameLaunchArguments") {
                //     const { gameId } = data;
                //     const argsPath = path.join(gamesDir, gameId, 'args.txt'); // Adjust the path as needed
                //     if (fs.existsSync(argsPath)) {
                //         const args = fs.readFileSync(argsPath, 'utf-8');
                //         ws.send(JSON.stringify({ action: "gameLaunchArguments", gameId, args }));
                //     } else {
                //         ws.send(JSON.stringify({ action: "notFound", gameId }));
                //     }
                // }
                // if (data.action === "getGameLaunchOptions") {
                //     const { gameId } = data;
                //     const optionsPath = path.join(gamesDir, gameId, 'options.txt'); // Adjust the path as needed
                //     if (fs.existsSync(optionsPath)) {
                //         const options = fs.readFileSync(optionsPath, 'utf-8');
                //         ws.send(JSON.stringify({ action: "gameLaunchOptions", gameId, options }));
                //     } else {
                //         ws.send(JSON.stringify({ action: "notFound", gameId }));
                //     }
                // }
                // if (data.action === "getGameLaunchEnvironment") {
                //     const { gameId } = data;
                //     const envPath = path.join(gamesDir, gameId, 'env.txt'); // Adjust the path as needed
                //     if (fs.existsSync(envPath)) {
                //         const env = fs.readFileSync(envPath, 'utf-8');
                //         ws.send(JSON.stringify({ action: "gameLaunchEnvironment", gameId, env }));
                //     } else {
                //         ws.send(JSON.stringify({ action: "notFound", gameId }));
                //     }
                // }
            } catch (err) {
                ws.send(JSON.stringify({ action: "error", message: err.message }));
            }
        });
    });
}