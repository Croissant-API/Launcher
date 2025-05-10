import { endpoint, url } from "../config/config";
import React, { useEffect, useState } from "react";
import Profile from "./Profile";
import { useNavigate } from "react-router-dom";

interface DiscordUser {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    global_name?: string;
    banner?: string | null;
    accent_color?: number | null;
    banner_color?: string | null;
}

type Lobby = {
    lobbyId: string;
    users: DiscordUser[];
};

export default function LobbyPage() {
    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [tooltip, setTooltip] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchLobby = (loading=true) => {
        setLoading(loading);
        fetch(endpoint + "/lobbies/user/@me", {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + (localStorage.getItem("token") || ""),
            }
        })
        .then(async (res) => {
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to fetch lobby");
            }
            return res.json();
        })
        .then(async (data) => {
            const usersIds = JSON.parse(data.users) as string[];
            const users: DiscordUser[] = [];

            for (const userId of usersIds) {
                const res = await fetch(endpoint + "/users/" + userId);
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.message || "Failed to fetch user");
                }
                const user = await res.json();
                users.push(user);
            }
            setLobby({
                lobbyId: data.lobbyId,
                users: users, 
            });
        })
        .catch(() => setLobby(null))
        .finally(() => setLoading(false));
    };

    const showTooltip = (msg: string) => {
        setTooltip(msg);
        setTimeout(() => setTooltip(null), 2000);
    };

    useEffect(() => {
        fetchLobby();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (!isCollapsed) {
            // Poll every 10 seconds when collapsed
            interval = setInterval(() => {
                fetchLobby(false);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isCollapsed]);

    const handleCreateLobby = async () => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(endpoint + "/lobbies", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + (localStorage.getItem("token") || ""),
                },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to create lobby");
            }
            await fetchLobby();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeaveLobby = async () => {
        if (!lobby) return;
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(endpoint + `/lobbies/${lobby.lobbyId}/leave`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + (localStorage.getItem("token") || ""),
                },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to leave lobby");
            }
            setLobby(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <>
            {/* Tooltip notification */}
            {tooltip && (
                <div className="lobby-tooltip">
                    <i className="fa fa-check-circle lobby-tooltip-icon" aria-hidden="true"></i>
                    {tooltip}
                </div>
            )}
            {isCollapsed ? (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="lobby-expand-btn"
                    aria-label="Expand lobby"
                >
                    ...
                </button>
            ) : (
                <div className="lobby-container">
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="lobby-collapse-btn"
                        aria-label="Collapse lobby"
                    >
                        X
                    </button>
                    {!isCollapsed && (
                        <>
                            <h1>Lobby</h1>
                            {loading && <p>Loading...</p>}
                            {error && <p className="lobby-error">{error}</p>}

                            {selectedUser && (
                                <div className="lobby-profile-wrapper">
                                    <button onClick={() => setSelectedUser(null)} className="lobby-back-btn">
                                        ← Retour au lobby
                                    </button>
                                    <Profile user={selectedUser} />
                                </div>
                            )}

                            {!selectedUser && (
                                <>
                                    {lobby ? (
                                        <div>
                                            <ul className="lobby-users-list">
                                                {lobby.users.map((user: DiscordUser) => (
                                                    <li key={user.id}>
                                                        <button
                                                            className="lobby-user-btn"
                                                            onClick={() => navigate("/launcher/profile?user=" + user.id)}
                                                        >
                                                            <img className="lobby-user-avatar"
                                                                src={url + "/avatar/" + user.id} />
                                                            <span className="lobby-user-name">
                                                                {user.global_name} {user.id === window.me.userId ? "(You)": ""}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                            {/* Copy Lobby Link and Leave Lobby Buttons in a flex row */}
                                            <div className="lobby-actions">
                                                <button
                                                    onClick={async () => {
                                                        const lobbyLink = "https://croissant-api.fr/join-lobby?lobbyId=" + lobby.lobbyId;
                                                        try {
                                                            await navigator.clipboard.writeText(lobbyLink);
                                                            showTooltip("Lobby link copied!");
                                                        } catch {
                                                            showTooltip("Failed to copy link.");
                                                        }
                                                    }}
                                                >
                                                    Copy Lobby Link
                                                </button>
                                                <button
                                                    onClick={handleLeaveLobby}
                                                    disabled={actionLoading}
                                                >
                                                    {actionLoading ? "Leaving..." : "Leave Lobby"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p>You are not in any lobby.</p>
                                            <button
                                                onClick={handleCreateLobby}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading ? "Creating..." : "Create and Join Lobby"}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
}
