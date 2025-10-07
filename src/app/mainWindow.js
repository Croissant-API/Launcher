
// Neutralino.js migration
export const devEnv = false;
const PORT_TO_SERVE = "https://croissant-api.fr/launcher/home";
// const PORT_TO_SERVE = "http://localhost:3333/launcher/home"

export function createMainWindow() {
    Neutralino.window.setTitle("Croissant Launcher");
    Neutralino.window.setSize({ width: 800, height: 600 });
    Neutralino.window.maximize();
    // Charger l'URL (dans Neutralino, c'est généralement un fichier local, mais ici on charge une URL distante)
    window.location.href = PORT_TO_SERVE;

    // Personnalisation de la barre de titre non disponible nativement, mais on peut styliser l'UI dans l'HTML/CSS

    // Gestion de la fermeture : masquer la fenêtre au lieu de quitter
    Neutralino.events.on('window-close', () => {
        Neutralino.window.hide();
    });
}