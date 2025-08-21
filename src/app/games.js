import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import dns from 'dns';

let gamesDir;
console.log("Initializing games directory...");
console.log("Current platform:", process.platform);
if (process.platform === 'linux') {
  gamesDir = path.join(process.env.HOME, '.croissant-launcher', 'games');
} else if (process.platform === 'darwin') {
  gamesDir = path.join(process.env.HOME, 'Library', 'Application Support', 'Croissant-Launcher', 'games');
} else { // Windows
  gamesDir = path.join(process.env.APPDATA, 'Croissant-Launcher', 'games');
}
console.log("Games directory set to:", gamesDir);

export const ensureGamesDir = () => {
  if (!fs.existsSync(gamesDir)) {
    fs.mkdirSync(gamesDir, { recursive: true });
  }
};

export const checkInstallationStatus = async (gameId) => {
  let status = 'not_installed';
  if (fs.existsSync(gamesDir)) {
    const gamePath = path.join(gamesDir, gameId);
    if (fs.existsSync(gamePath)) {
      // Utilise le tableau global pour déterminer le status
      if (gamesToUpdate.has(gameId)) {
        return 'to_update';
      }
      return 'installed';
    }
  }
  return status;
};

export const downloadGame = async (gameId, downloadUrl) => {
  const dest = path.join(gamesDir, gameId);
  if (!fs.existsSync(dest)) {
    await simpleGit().clone(downloadUrl, dest);
    return { action: "downloadComplete", gameId };
  } else {
    return { action: "alreadyInstalled", gameId };
  }
};

const gamesToUpdate = new Set();

const isOnline = () => {
  return new Promise((resolve) => {
    dns.lookup('github.com', (err) => {
      resolve(!err);
    });
  });
};

const refreshGamesToUpdate = async () => {
  if (!fs.existsSync(gamesDir)) return;
  const online = await isOnline();
  if (!online) return; // Skip if offline

  const gameIds = fs.readdirSync(gamesDir).filter(f => fs.statSync(path.join(gamesDir, f)).isDirectory());
  for (const gameId of gameIds) {
    try {
      const gamePath = path.join(gamesDir, gameId);
      const git = simpleGit(gamePath);
      const remotes = await git.getRemotes(true);
      if (remotes.length === 0) {
        gamesToUpdate.delete(gameId);
        continue;
      }
      await git.fetch();
      const statusObj = await git.status();
      if (statusObj.behind && statusObj.behind > 0) {
        gamesToUpdate.add(gameId);
      } else {
        gamesToUpdate.delete(gameId);
      }
    } catch (e) {
      gamesToUpdate.delete(gameId);
    }
  }
};

// Lancer le check toutes les 30 secondes
setInterval(refreshGamesToUpdate, 30000);
// Premier check au démarrage
refreshGamesToUpdate();