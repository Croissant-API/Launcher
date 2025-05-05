import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Ensure to install node-fetch if not already
import { fileURLToPath } from 'url';
import { checkInstallationStatus } from './games.js';

export const PORT = 3333;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gamesDir = path.join(__dirname, "..", 'games');

export const startServer = () => {
  const server = express();

  server.use(cors());

  server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "..", "build", 'index.html'));
  });

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

  server.use(express.static(path.join(__dirname, "..", "build")));
  server.use((_req, res) => {
    res.sendFile(path.join(__dirname, "..", "build", "index.html"));
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

export default startServer;