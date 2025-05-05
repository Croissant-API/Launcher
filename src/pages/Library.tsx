import React, { useState, useEffect } from "react";
import "../styles/Library.css";
import { endpoint, myUrl } from "../config/config";

type Game = {
    id?: number;
    gameId: string;
    name: string;
    description: string;
    price: number;
    ownerId: string;
    showInStore: boolean;
    image?: string;
    state?: "installed" | "not_installed" | "playing" | "to_update";
    download_link?: string; // Assure-toi que ce champ existe côté API
};

const ws = new WebSocket("ws://localhost:8081"); // Adjust if needed

const Library: React.FC = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [selected, setSelected] = useState<Game | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(myUrl + "/list", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then(async (res) => {
                if (!res.ok) throw new Error("Erreur lors du chargement des jeux");
                return res.json();
            })
            .then((data) => {
                setGames(data);
                setSelected(data[0] || null);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (
                    message.action === "downloadComplete" ||
                    message.action === "alreadyInstalled"
                ) {
                    // console.log("Download complete or already installed:", message);
                    setGames((prevGames) => {
                        const updatedGames = prevGames.map((game) =>
                            game.gameId === message.gameId
                                ? { ...game, state: "installed" as Game["state"] }
                                : game
                        );
                        // Met à jour selected si besoin
                        if (selected && selected.gameId === message.gameId) {
                            const updatedSelected = updatedGames.find(g => g.gameId === selected.gameId);
                            if (updatedSelected) setSelected(updatedSelected);
                        }
                        return updatedGames;
                    });
                }
                if (message.action === "status") {
                    setGames((prevGames) =>
                        prevGames.map((game) =>
                            game.gameId === message.gameId
                                ? { 
                                    ...game, 
                                    state: (
                                        message.status === "installed" ||
                                        message.status === "not_installed" ||
                                        message.status === "playing" ||
                                        message.status === "to_update"
                                    ) ? message.status as Game["state"] : game.state
                                }
                                : game
                        )
                    );
                    if (selected && selected.gameId === message.gameId) {
                        setSelected({ 
                            ...selected, 
                            state: (
                                message.status === "installed" ||
                                message.status === "not_installed" ||
                                message.status === "playing" ||
                                message.status === "to_update"
                            ) ? message.status as Game["state"] : selected.state
                        });
                    }
                }
                if (message.action === "updateComplete") {
                    setGames((prevGames) =>
                        prevGames.map((game) =>
                            game.gameId === message.gameId
                                ? { ...game, state: "installed" }
                                : game
                        )
                    );
                    if (selected && selected.gameId === message.gameId) {
                        setSelected({ ...selected, state: "installed" });
                    }
                }
                // Handle closeGame: switch from playing to installed
                if (message.action === "closeGame" || message.action === "closed") {
                    setGames((prevGames) =>
                        prevGames.map((game) =>
                            game.gameId === message.gameId
                                ? { ...game, state: "installed" }
                                : game
                        )
                    );
                    if (selected && selected.gameId === message.gameId) {
                        setSelected({ ...selected, state: "installed" });
                    }
                    setIsPlaying(false);
                }
                // Optionally, handle playing state
                if (message.action === "playing") {
                    setGames((prevGames) =>
                        prevGames.map((game) =>
                            game.gameId === message.gameId
                                ? { ...game, state: "playing" }
                                : game
                        )
                    );
                    if (selected && selected.gameId === message.gameId) {
                        setSelected({ ...selected, state: "playing" });
                    }
                    setIsPlaying(true);
                }
                if (message.action === "deleteComplete") {
                    setGames((prevGames) =>
                        prevGames.map((game) =>
                            game.gameId === message.gameId
                                ? { ...game, state: "not_installed" }
                                : game
                        )
                    );
                    if (selected && selected.gameId === message.gameId) {
                        setSelected({ ...selected, state: "not_installed" });
                    }
                }
                if (message.action === "notFound" && message.gameId) {
                    setError(`Game ${message.gameId} not found for deletion.`);
                }
            } catch (e) {
                // Handle parse error or ignore
            }
        };
        return () => {
            ws.onmessage = null;
        };
    }, [selected]);

    const handleInstall = () => {
        if (selected && selected.state === "not_installed") {
            ws.send(JSON.stringify({
                action: "downloadGame",
                gameId: selected.gameId,
                downloadUrl: selected.download_link // Assure-toi que ce champ existe côté API
            }));
            // Optionally update UI state to show downloading...
        }
    };

    const handlePlay = () => {
        if (selected && selected.state === "installed") {
            ws.send(JSON.stringify({ action: "playGame", gameId: selected.gameId, playerId: window.me.userId, verificationKey: localStorage.getItem("verificationKey") }));
            setIsPlaying(true);
            // Optionally update selected.state to "playing"
        }
    };

    const handleUpdate = () => {
        if (selected && selected.state === "to_update") {
            ws.send(JSON.stringify({ action: "updateGame", gameId: selected.gameId }));
        }
    };

    const handleDelete = () => {
        if (selected && selected.state === "installed") {
            ws.send(JSON.stringify({ action: "deleteGame", gameId: selected.gameId }));
            // Do not remove from UI here, wait for WebSocket confirmation
        }
    };

    const handleSelect = (game: Game) => {
        setSelected(game);
        setIsPlaying(game.state === "playing");
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div style={{ color: "red" }}>{error}</div>;

    return (
        <div className="steam-library-layout">
            <aside className="steam-library-sidebar">
                <h3 className="sidebar-title">Games</h3>
                {games.length === 0 ? (
                    <div className="sidebar-empty"></div>
                ) : (
                    <ul className="sidebar-list">
                        {games.map((game) => (
                            <li
                                key={game.gameId}
                                className={`sidebar-game 
                                    ${selected && selected.gameId === game.gameId ? "selected" : ""}
                                    ${game.state === "not_installed" ? "not-installed" : ""}
                                    ${game.state === "installed" ? "installed" : ""}
                                    ${game.state === "to_update" ? "to-update" : ""}
                                    ${game.state === "playing" ? "playing" : ""}
                                `}
                                onClick={() => handleSelect(game)}
                            >
                                <img
                                    src={game.image || "https://placehold.co/600x300?text=No+Image"}
                                    alt={game.name}
                                    className="sidebar-thumb"
                                />
                                <span>{game.name}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </aside>
            <main className="steam-library-main">
                {!selected ? (
                    <div className="main-empty">Please select a game.</div>
                ) : (
                    <>
                        <img
                            src={selected.image || "https://placehold.co/600x300?text=No+Image"}
                            alt={selected.name}
                            className="main-splash"
                        />
                        <div className="main-details">
                            <h2>{selected.name}</h2>
                            <p>{selected.description}</p>
                            {selected.state === "not_installed" && (
                                <button
                                    className="library-play-btn can-install"
                                    onClick={handleInstall}
                                >
                                    Install
                                </button>
                            )}
                            {selected.state === "to_update" && (
                                <button
                                    className="library-play-btn can-update"
                                    onClick={handleUpdate}
                                >
                                    Update
                                </button>
                            )}
                            {selected.state === "installed" && (
                                <>
                                    <button
                                        className={`library-play-btn can-play`}
                                        onClick={handlePlay}
                                        disabled={isPlaying}
                                    >
                                        {isPlaying ? "In Game" : "Play"}
                                    </button>
                                    <button
                                        className="library-play-btn can-delete"
                                        onClick={handleDelete}
                                        disabled={isPlaying}
                                        style={{ marginLeft: 8, background: "#c0392b", color: "#fff" }}
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                            {selected.state === "playing" && (
                                <button className="library-play-btn playing" disabled>
                                    In Game
                                </button>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Library;
