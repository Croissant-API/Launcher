import express from 'express';
import cors from 'cors';
import path from 'path';
import fetch from 'node-fetch'; // Ensure to install node-fetch if not already
import { fileURLToPath } from 'url';
import { checkInstallationStatus } from './games.js';
import isOnline from 'is-online';
import fs from 'fs';
import mime from 'mime-types'; // Ajoute en haut du fichier

export const PORT = 3333;
import { devEnv } from './mainWindow.js';
const ENDPOINT = devEnv ? "http://localhost:8580" : "https://croissant-api.fr";

export const startServer = () => {
  const server = express();

  server.use(cors());
  server.get('/list', async (req, res) => {
    const token = req.headers['authorization'] || req.headers['Authorization'];
    if (!token) {
      res.status(401).send('Unauthorized');
      return;
    }
    try {
      const response = await fetch("https://croissant-api.fr/api/games/list/@me", {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: token,
          "Content-Type": "application/json",
        }
      });
      const gamesList = await response.json();
      if (!Array.isArray(gamesList)) {
        res.status(500).json({ message: 'Invalid response from API', response: gamesList });
        return;
      }
      const games = [];
      for (const game of gamesList) {
        games.push({
          ...game,
          state: await checkInstallationStatus(game.gameId),
        });
      }

      res.json(games);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching games list', err: err.message });
    }
  });

  server.use((req, res) => {
    // Nous allons d abord créer le dossier offline-cache s il n existe pas
    const cacheDir = path.join(process.cwd(), 'offline-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Si offline, on sert le fichier depuis le cache
    // Vérifier si l'utilisateur est offline
    if (!isOnline()) {
      // User is not online, we serve from cache if possible
      let filePath = path.join(cacheDir, req.path);

      // If file doesn't exist, try to deduce extension from available files
      if (!fs.existsSync(filePath)) {
        // Get all files in the directory matching the base name
        const dir = path.dirname(filePath);
        const base = path.basename(filePath);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const match = files.find(f => f.startsWith(base + '.'));
          if (match) {
            filePath = path.join(dir, match);
          }
        }
      }

      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
        return;
      }
    }

    console.log(`Fetching resource: ${req.path}`);

    // Si online, on fetch depuis le endpoint et on met en cache
    const url = `${ENDPOINT}${req.path}`;
    // Remove 'host' header to avoid SSL certificate mismatch
    const { host, ...forwardHeaders } = req.headers;
    fetch(url, { method: req.method, headers: { ...forwardHeaders } }).then(async (response) => {
      if (!response.ok) {
        res.status(response.status).send('Error fetching resource');
        return;
      }
      // Déduire l’extension à partir du type MIME
      const contentType = response.headers.get('content-type');
      let ext = mime.extension(contentType) || '';
      let filePath = path.join(cacheDir, req.path);

      // Si le chemin n’a pas déjà d’extension, on l’ajoute
      if (ext && !path.extname(filePath)) {
        filePath += '.' + ext;
      }

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const data = await response.buffer();
      fs.writeFileSync(filePath, data);
      res.sendFile(filePath);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

export default startServer;