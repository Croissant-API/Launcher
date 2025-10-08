import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { detect } from './smart-update.js';

let gamesDir;
console.log("Initializing games directory...");
console.log("Current platform:", process.platform);
if (process.platform === 'linux') {
  gamesDir = path.join(process.env.HOME, '.croissant-launcher', 'games');
} else if (process.platform === 'darwin') {
  gamesDir = path.join(process.env.HOME, 'Library', 'Application Support', 'Croissant-Launcher', 'games');
} else { 
  gamesDir = path.join(process.env.APPDATA, 'Croissant-Launcher', 'games');
}
console.log("Games directory set to:", gamesDir);

export const ensureGamesDir = () => {
  if (!fs.existsSync(gamesDir)) {
    fs.mkdirSync(gamesDir, { recursive: true });
  }
};

export const checkInstallationStatus = async (gameId, token) => {
  let status = 'not_installed';
  if (fs.existsSync(gamesDir)) {
    const gamePath = path.join(gamesDir, gameId);
    if (fs.existsSync(gamePath)) {
      try {
        const needUpdate = await detect(gameId, token);
        if (needUpdate) {
          return 'to_update';
        } else {
          return 'installed';
        }
      } catch (e) {
        return 'installed'; 
      }
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


