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
    const navigate = useNavigate();

    const fetchLobby = () => {
        setLoading(true);
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

    useEffect(() => {
        fetchLobby();
    }, []);

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
            {isCollapsed ? (
                <button
                    onClick={() => setIsCollapsed(false)}
                    style={{
                        position: "fixed",
                        right: "15px",
                        bottom: "24px",
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "#222",
                        color: "#fff",
                        border: "2px solid #ccc",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        cursor: "pointer",
                        zIndex: 1000,
                        fontSize: 24,
                    }}
                    aria-label="Expand lobby"
                >
                    ...
                </button>
            ) : (
                <div className="container" style={{ marginBottom: 24, padding: 16, border: "1px solid #ccc", borderRadius: 8, width:"200px", position: "fixed", right: "15px", bottom: 0, backgroundColor: "#111", zIndex: 999 }}>
                    <button
                        onClick={() => setIsCollapsed(true)}
                        style={{
                            position: "absolute",
                            top: 34,
                            right: 12,
                            background: "none",
                            border: "none",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: 18,
                        }}
                        aria-label="Collapse lobby"
                    >
                        X
                    </button>
                    {!isCollapsed && (
                        <>
                            <h1>Lobby</h1>
                            {loading && <p>Loading...</p>}
                            {error && <p style={{ color: "red" }}>{error}</p>}

                            {selectedUser && (
                                <div style={{ marginBottom: 24 }}>
                                    <button onClick={() => setSelectedUser(null)} style={{ marginBottom: 8 }}>
                                        ← Retour au lobby
                                    </button>
                                    <Profile user={selectedUser} />
                                </div>
                            )}

                            {!selectedUser && (
                                <>
                                    {lobby ? (
                                        <div>
                                            <h2>Users</h2>
                                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                                {lobby.users.map((user: DiscordUser) => (
                                                    <li key={user.id}>
                                                        <button
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                cursor: "pointer",
                                                                padding: 0,
                                                                font: "inherit",
                                                            }}
                                                            onClick={() => navigate("/profile?user=" + user.id)}
                                                        >
                                                            <img style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: "50%",
                                                                marginRight: 8,
                                                            }}
                                                            src={url + "/avatar/" + user.id} />
                                                            <span style={{ 
                                                                position: "relative",
                                                                bottom: "10px",
                                                            }}>
                                                                {user.global_name} {user.id === window.me.userId ? "(You)": ""}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                            <button
                                                onClick={handleLeaveLobby}
                                                disabled={actionLoading}
                                                style={{ marginTop: 16 }}
                                            >
                                                {actionLoading ? "Leaving..." : "Leave Lobby"}
                                            </button>
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
