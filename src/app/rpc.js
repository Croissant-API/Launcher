const DiscordRPC = require('discord-rpc');

const clientId = "1324530344900431923";
try{
    DiscordRPC.register(clientId);
    const rpc = new DiscordRPC.Client({ transport: 'ipc' });

    async function setActivity() {
      if (!rpc || !mainWindow) {
        return;
      }
    
      rpc.setActivity({
        details: `booped 5 times`,
        state: 'in slither party',
        startTimestamp,
        largeImageKey: 'icon',
        largeImageText: 'Croissant Launcher',
        instance: false,
      });
    }
    
    rpc.on('ready', () => {
      setActivity();
    
      // Activity can only be set every 15 seconds
      setInterval(() => {
        setActivity();
      }, 15000);
    });
    
    rpc.login({ clientId });
}
catch (e) {
    console.log("Discord RPC not running, skipping...");
}

// WIP
