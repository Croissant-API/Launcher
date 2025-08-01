const { WebSocketServer } = require("ws");
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { checkInstallationStatus } = require('./games.js');
const { spawn } = require('child_process');
const zip = require('adm-zip');
const RPC = require('discord-rpc');
const DiscordRpcManager = require("../discordRpcManager.js");

const now = new Date();
const clientId = '1324530344900431923';
const rpc = new RPC.Client({ transport: 'ipc' });
const discordRpcManager = new DiscordRpcManager(rpc);
const gamesDir = path.join(process.env.APPDATA, 'Croissant-Launcher', 'games');

let actualConnection = null;

rpc.login({ clientId }).catch(console.error);

rpc.on('ready', () => {
    discordRpcManager.isReady = true;
    discordRpcManager.setActivity({
        details: 'Ready to play',
        state: 'In launcher',
        startTimestamp: now,
        largeImageKey: 'launcher_icon',
        largeImageText: 'Croissant Launcher',
        smallImageKey: 'ready',
        smallImageText: 'Ready to play',
        instance: true,
    }, true);

    rpc.subscribe('ACTIVITY_JOIN_REQUEST');
    rpc.on('ACTIVITY_JOIN_REQUEST', ({ user }) => {
        rpc.sendJoinInvite(user.id);
    });
    rpc.subscribe('ACTIVITY_JOIN');
    rpc.on('ACTIVITY_JOIN', ({ secret }) => {
        //joinLobby(secret.split("secret")[0], mainWindow);
        actualConnection.send(JSON.stringify({
            action: "joinLobby",
            lobbyId: secret.split("secret")[0],
        }));
    });
});

rpc.on('error', (error) => {
    console.error('Discord RPC Error:', error);
});

rpc.on('disconnected', () => {
});

module.exports.setupWebSocket = () => {
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
                    const { gameId, downloadUrl } = data;
                    const dest = path.join(gamesDir, gameId);
                    if (!fs.existsSync(dest)) {
                        if (downloadUrl.endsWith('.zip')) {
                            const response = await fetch(downloadUrl);
                            if (!response.ok) {
                                ws.send(JSON.stringify({ action: "error", message: "Failed to download game" }));
                                return;
                            }
                            const total = Number(response.headers.get('content-length')) || 0;
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
                                    ws.send(JSON.stringify({ action: "downloadProgress", gameId, percent }));
                                }
                            }
                            fs.mkdirSync(dest, { recursive: true });
                            const buffer = Buffer.concat(chunks);
                            const zipFilePath = path.join(dest, 'game.zip');
                            fs.writeFileSync(zipFilePath, buffer);
                            const zipInstance = new zip(zipFilePath);
                            zipInstance.extractAllTo(dest, true);
                            fs.unlinkSync(zipFilePath);
                            ws.send(JSON.stringify({ action: "downloadComplete", gameId }));
                        } else {
                            await simpleGit().clone(downloadUrl, dest);
                            ws.send(JSON.stringify({ action: "downloadComplete", gameId }));
                        }
                    } else {
                        ws.send(JSON.stringify({ action: "alreadyInstalled", gameId }));
                    }
                }

                // Play game
                if (data.action === "playGame") {
                    const { gameId, playerId, verificationKey } = data;
                    ws.send(JSON.stringify({ action: "playing", gameId }));
                    const game = await fetch(`https://croissant-api.fr/api/games/${gameId}`).then(res => res.json());
                    const gameName = game.name || 'Unknown Game';
                    discordRpcManager.setActivity({
                        details: `Playing ${gameName}`,
                        startTimestamp: now,
                        largeImageKey: 'game_icon',
                        largeImageText: `Playing ${gameName}`,
                        smallImageKey: 'play',
                        smallImageText: 'In game',
                    });
                    const gamePath = path.join(gamesDir, gameId);
                    let launchFile = null;
                    const candidates = ['.exe', 'index.js', 'index.ts', 'index.html'];
                    for (const candidate of candidates) {
                        if (candidate === '.exe') {
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
                        const onExit = () => {
                            ws.send(JSON.stringify({ action: "closeGame", gameId }));
                            discordRpcManager.setActivity({
                                details: 'Ready to play',
                                startTimestamp: now,
                            });
                        };
                        if (launchFile.endsWith('.exe')) {
                            proc = spawn(
                                launchFile,
                                [`--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`],
                                { cwd: gamePath, detached: true, stdio: 'ignore' }
                            );
                            proc.unref();
                            proc.on('exit', onExit);
                        } else if (launchFile.endsWith('.js')) {
                            proc = spawn(
                                process.execPath,
                                [launchFile, `--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`],
                                { cwd: gamePath, detached: true, stdio: 'ignore' }
                            );
                            proc.unref();
                            proc.on('exit', onExit);
                        } else if (launchFile.endsWith('.ts')) {
                            proc = spawn(
                                'ts-node',
                                [launchFile, `--croissantId=${playerId}`, `--croissantVerificationKey=${verificationKey}`],
                                { cwd: gamePath, detached: true, stdio: 'ignore' }
                            );
                            proc.unref();
                            proc.on('exit', onExit);
                        }
                    } else {
                        ws.send(JSON.stringify({ action: "error", message: "No launchable file found for game " + gameId }));
                        ws.send(JSON.stringify({ action: "closeGame", gameId }));
                        discordRpcManager.setActivity({
                            details: 'Ready to play',
                            startTimestamp: now,
                        });
                    }
                }

                // Close game
                if (data.action === "closeGame") {
                    const { gameId } = data;
                    discordRpcManager.setActivity({
                        details: 'Ready to play',
                        startTimestamp: now,
                    });
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
                    const games = fs.readdirSync(gamesDir).map(gameId => ({
                        gameId,
                        state: fs.existsSync(path.join(gamesDir, gameId)) ? 'installed' : 'not_installed',
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
                        ws.send(JSON.stringify({ action: "gameInfo", gameId, size: stats.size }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }

                // Get game icon
                if (data.action === "getGameIcon") {
                    const { gameId } = data;
                    const iconPath = path.join(gamesDir, gameId, 'icon.png');
                    if (fs.existsSync(iconPath)) {
                        const iconBuffer = fs.readFileSync(iconPath);
                        ws.send(JSON.stringify({ action: "gameIcon", gameId, icon: iconBuffer.toString('base64') }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }

                // Get game description
                if (data.action === "getGameDescription") {
                    const { gameId } = data;
                    const descPath = path.join(gamesDir, gameId, 'description.txt');
                    if (fs.existsSync(descPath)) {
                        const description = fs.readFileSync(descPath, 'utf-8');
                        ws.send(JSON.stringify({ action: "gameDescription", gameId, description }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }

                // Get game version
                if (data.action === "getGameVersion") {
                    const { gameId } = data;
                    const versionPath = path.join(gamesDir, gameId, 'version.txt');
                    if (fs.existsSync(versionPath)) {
                        const version = fs.readFileSync(versionPath, 'utf-8');
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
                        ws.send(JSON.stringify({ action: "gameSize", gameId, size: stats.size }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }

                // Get game state
                if (data.action === "getGameState") {
                    const { gameId } = data;
                    const state = fs.existsSync(path.join(gamesDir, gameId)) ? 'installed' : 'not_installed';
                    ws.send(JSON.stringify({ action: "gameState", gameId, state }));
                }

                // Get game path
                if (data.action === "getGamePath") {
                    const { gameId } = data;
                    const gamePath = path.join(gamesDir, gameId);
                    if (fs.existsSync(gamePath)) {
                        ws.send(JSON.stringify({ action: "gamePath", gameId, path: gamePath }));
                    } else {
                        ws.send(JSON.stringify({ action: "notFound", gameId }));
                    }
                }

                // Lobby update
                if (data.action === "lobbyUpdate") {
                    const { lobbyId, users } = data;
                    if (lobbyId) {
                        if (discordRpcManager.lobby && discordRpcManager.lobby.id === lobbyId) {
                            discordRpcManager.updateLobby({
                                id: lobbyId,
                                name: `Lobby ${lobbyId}`,
                                size: users.length,
                                max: 10,
                                joinSecret: lobbyId + "secret"
                            });
                        } else {
                            discordRpcManager.createLobby({
                                id: lobbyId,
                                name: `Lobby ${lobbyId}`,
                                size: users.length,
                                max: 10,
                                joinSecret: lobbyId + "secret"
                            });
                        }
                    } else {
                        discordRpcManager.clearLobby();
                    }
                    ws.send(JSON.stringify({ action: "lobbyUpdated" }));
                }

                // Lobby leave
                if (data.action === "lobbyLeave") {
                    const { lobbyId } = data;
                    if (discordRpcManager.lobby && discordRpcManager.lobby.id === lobbyId) {
                        discordRpcManager.clearLobby();
                    }
                    ws.send(JSON.stringify({ action: "lobbyLeft", lobbyId }));
                }

                // Update state
                if (data.action === "updateState") {
                    const { state } = data;
                    discordRpcManager.updateState(state);
                }

            } catch (err) {
                ws.send(JSON.stringify({ action: "error", message: err.message }));
            }
        });
    });
    return wss;
}