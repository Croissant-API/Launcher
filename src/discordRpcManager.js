import { join } from "path";

class DiscordRpcManager {
    constructor(rpc) {
        this.activity = null;
        this.lobby = null;
        this.isReady = false;
        this.rpc = rpc;

        setInterval(() => {
            if (this.isReady) {
                this.rpc.setActivity(this.activity);
            }
        }, 3000);
    }

    setActivity(activity, initialize = false) {
        this.activity = { ...this.activity, ...activity };
        if (this.isReady && initialize) {
            this.rpc.setActivity(this.activity);
        }
    }

    createLobby(lobbyInfo) {
        this.lobby = lobbyInfo;
        this.setActivity({
            ...this.activity,
            partyId: lobbyInfo.id,
            partySize: lobbyInfo.size,
            partyMax: lobbyInfo.max,
            joinSecret: lobbyInfo.joinSecret,
        });
        console.log('Discord activity set with this joinSecret:', lobbyInfo.joinSecret);
    }

    updateLobby(lobbyInfo) {
        this.lobby = { ...this.lobby, ...lobbyInfo };
        this.setActivity({
            ...this.activity,
            partySize: this.lobby.size,
            partyMax: this.lobby.max,
        });
    }

    clearLobby() {
        this.lobby = null;
        this.setActivity({ ...this.activity, partyId: undefined, joinSecret: undefined, partySize: undefined, partyMax: undefined });
    }

    updateState(state) {
        if (this.activity) {
            this.setActivity({
                ...this.activity,
                state,
            });
        }
    }

    disconnect() {
        this.rpc.destroy();
        this.isReady = false;
    }
}

export default DiscordRpcManager;
