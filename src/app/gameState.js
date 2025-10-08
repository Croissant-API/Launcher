const launchedGames = new Set();

// Add a game to the launchedGames set
export const addLaunchedGame = (gameId) => {
  launchedGames.add(gameId);
};

// Remove a game from the launchedGames set
export const removeLaunchedGame = (gameId) => {
  launchedGames.delete(gameId);
};

// Check if a game is in the launchedGames set
export const isGameLaunched = (gameId) => {
  return launchedGames.has(gameId);
};

// Get all launched games
export const getLaunchedGames = () => {
  return Array.from(launchedGames);
};