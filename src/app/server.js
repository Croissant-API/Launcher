const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch'); // Assurez-vous d'installer node-fetch si ce n'est pas déjà fait
const { checkInstallationStatus } = require('./games.js');

const PORT = 3333;

module.exports.startServer = () => {
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

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};