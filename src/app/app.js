
// Neutralino.js migration
import { devEnv } from './mainWindow.js';
const ENDPOINT = devEnv ? "http://localhost:8580/" : "https://croissant-api.fr/";
const PROTOCOL = 'croissant-launcher';
const DISCORD_CLIENT_ID = '1324530344900431923';

let deeplinkToHandle = null;

function handleDeeplink(url) {
  try {
    if (url.startsWith(`discord-${DISCORD_CLIENT_ID}://`)) {
      return;
    }
    const match = url.match(/(croissant(-launcher)|discord-\d+):\/\/.*/i);
    const cleanUrl = match ? match[0] : url;
    if (cleanUrl.startsWith(`discord-${DISCORD_CLIENT_ID}://`)) {
      const secretMatch = cleanUrl.match(/secret=([^&]+)/);
      const pathSecret = cleanUrl.match(new RegExp(`discord-${DISCORD_CLIENT_ID}:\/\/\/([^?]+)`));
      let joinSecret = null;
      if (secretMatch) {
        joinSecret = decodeURIComponent(secretMatch[1]);
      } else if (pathSecret) {
        joinSecret = decodeURIComponent(pathSecret[1]);
      }
      if (joinSecret) {
        if (joinSecret.startsWith('join-lobby:lobbyId=')) {
          const lobbyId = joinSecret.replace('join-lobby:lobbyId=', '');
          joinLobby(lobbyId);
          return;
        } else {
          joinLobby(joinSecret);
          return;
        }
      }
      return;
    }
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== `${PROTOCOL}:`) return;
    if (parsed.hostname === 'join-lobby') {
      const lobbyId = parsed.searchParams.get('lobbyId');
      if (lobbyId) joinLobby(lobbyId);
    } else if (parsed.hostname === 'set-token') {
      const token = parsed.searchParams.get('token');
      if (token) loginToken(token);
    }
  } catch (e) {
    console.error('Invalid deeplink:', url, e);
  }
}

export function loginToken(token) {
  Neutralino.events.emit('set-token', { token: token.toString() });
  Neutralino.window.show();
  Neutralino.window.focus();
  Neutralino.window.setAlwaysOnTop(true);
  setTimeout(() => Neutralino.window.setAlwaysOnTop(false), 1000);
}

export function joinLobby(lobbyId) {
  Neutralino.events.emit('join-lobby', { lobbyId });
  Neutralino.window.show();
  Neutralino.window.focus();
  Neutralino.window.setAlwaysOnTop(true);
  setTimeout(() => Neutralino.window.setAlwaysOnTop(false), 1000);
}

export function startApp() {
  // Remplacer ensureGamesDir par une commande Neutralino si besoin
  Neutralino.init();

  // Récupérer les arguments pour deeplink
  Neutralino.os.getArgv().then(argv => {
    const deeplinkArg = argv.find(arg =>
      arg.startsWith(`${PROTOCOL}://`) ||
      arg.startsWith(`discord-${DISCORD_CLIENT_ID}://`)
    );
    if (deeplinkArg) deeplinkToHandle = deeplinkArg;
    if (deeplinkToHandle) {
      setTimeout(() => handleDeeplink(deeplinkToHandle), 500);
      deeplinkToHandle = null;
    }
  });

  // Gestion des événements fenêtre
  Neutralino.events.on('window-minimize', () => Neutralino.window.minimize());
  Neutralino.events.on('window-maximize', () => Neutralino.window.maximize());
  Neutralino.events.on('window-close', () => Neutralino.app.exit());
  Neutralino.events.on('open-discord-login', () => Neutralino.os.open(ENDPOINT + "auth/discord"));
  Neutralino.events.on('open-google-login', () => Neutralino.os.open(ENDPOINT + "auth/google"));
  Neutralino.events.on('open-email-login', () => Neutralino.os.open(ENDPOINT + "transmitToken?from=launcher"));

  // Démarrer le serveur backend si besoin
  // Neutralino.os.execCommand('node src/app/server.js');
}