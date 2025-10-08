import cors from 'cors';
import express from 'express';
import fs from 'fs';
import isOnline from 'is-online';
import mime from 'mime-types';
import fetch from 'node-fetch';
import path from 'path';
import { checkInstallationStatus } from './games.js';
import { devEnv } from './mainWindow.js';

export const PORT = 3333;
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
      const statePromises = gamesList.map(game => checkInstallationStatus(game.gameId, token));
      const states = await Promise.all(statePromises);
      for (let i = 0; i < gamesList.length; i++) {
        games.push({
          ...gamesList[i],
          state: states[i],
        });
      }

      res.json(games);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching games list', err: err.message });
    }
  });

  server.use((req, res) => {
    
    const cacheDir = path.join(process.cwd(), 'offline-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    
    
    if (!isOnline()) {
      
      let filePath = path.join(cacheDir, req.path);

      
      if (!fs.existsSync(filePath)) {
        
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

    
    const url = `${ENDPOINT}${req.path}`;
    
    const { host, ...forwardHeaders } = req.headers;
    fetch(url, { method: req.method, headers: { ...forwardHeaders } }).then(async (response) => {
      if (!response.ok) {
        res.status(response.status).send('Error fetching resource');
        return;
      }
      
      const contentType = response.headers.get('content-type');
      let ext = mime.extension(contentType) || '';
      let filePath = path.join(cacheDir, req.path);

      
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


