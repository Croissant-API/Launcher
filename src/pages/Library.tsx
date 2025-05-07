import React, { useState, useEffect } from "react";
import { endpoint, myUrl, url } from "../config/config";
type Game = {
    id?: number;
    gameId: string;
    name: string;
    description: string;
    price: number;
    ownerId?: string;
    owner_id?: string;
    showInStore?: boolean | number;
    image?: string;
    state?: "installed" | "not_installed" | "playing" | "to_update";
    download_link?: string;
    bannerHash?: string;
    iconHash?: string;
    splashHash?: string | null;
    developer?: string;
    publisher?: string;
    genre?: string;
    multiplayer?: number | boolean;
    platforms?: string;
    rating?: number;
    release_date?: string;
    trailer_link?: string;
    website?: string;
};

const ws = new WebSocket("ws://localhost:8081"); // Adjust if needed

const Library: React.FC = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [selected, setSelected] = useState<Game | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

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
                const lastGameId = localStorage.getItem("lastSelectedGameId");
                const lastGame = data.find((g: Game) => g.gameId === lastGameId);
                setSelected(lastGame || data[0] || null);
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
                    setGames((prevGames) => {
                        const updatedGames = prevGames.map((game) =>
                            game.gameId === message.gameId
                                ? { ...game, state: "installed" as Game["state"] }
                                : game
                        );
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
                downloadUrl: selected.download_link
            }));
        }
    };

    const handlePlay = () => {
        if (selected && selected.state === "installed") {
            ws.send(JSON.stringify({ action: "playGame", gameId: selected.gameId, playerId: window.me.userId, verificationKey: localStorage.getItem("verificationKey") }));
            setIsPlaying(true);
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
        }
    };

    const handleSelect = (game: Game) => {
        setSelected(game);
        setIsPlaying(game.state === "playing");
        localStorage.setItem("lastSelectedGameId", game.gameId);
    };

    const filteredGames = games.filter(game =>
        game.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ position: "relative" }}>
                {/* Skeleton UI */}
                <div className="steam-library-layout">
                    <aside className="steam-library-sidebar">
                        <input
                            type="text"
                            placeholder="Search games..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="library-search-input"
                            disabled
                        />
                        <ul className="sidebar-list">
                            {[...Array(5)].map((_, i) => (
                                <li key={i} className="sidebar-game not-installed">
                                    <div className="sidebar-thumb skeleton-icon" style={{ width: 36, height: 36 }} />
                                    <span className="skeleton-title" style={{ width: "60%", height: 18, margin: 0 }} />
                                </li>
                            ))}
                        </ul>
                    </aside>
                    <main className="steam-library-main">
                        <div className="main-details-steam gamepage-blur">
                            <div className="banner-container">
                                <div className="main-banner-steam skeleton-banner" />
                                <div className="main-icon-steam skeleton-icon" />
                            </div>
                            <div className="main-details-content">
                                <div className="skeleton-title" />
                                <div className="skeleton-desc" />
                                <div className="skeleton-properties" />
                            </div>
                        </div>
                    </main>
                </div>
                {/* Loading spinner overlay */}
                <div className="gamepage-loading-overlay">
                    <div className="inventory-loading-spinner" />
                </div>
            </div>
        );
    }

    if (error) return <div style={{ color: "red" }}>{error}</div>;

    return (
        <div className="steam-library-layout">
            <aside className="steam-library-sidebar">
                <input
                    type="text"
                    placeholder="Search games..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="library-search-input"
                />
                {filteredGames.length === 0 ? (
                    <div className="sidebar-empty">No games found.</div>
                ) : (
                    <ul className="sidebar-list">
                        {filteredGames.map((game) => (
                            <li
                                key={game.gameId}
                                className={[`sidebar-game`,
                                    selected && selected.gameId === game.gameId ? "selected" : "",
                                    game.state === "not_installed" ? "not-installed" : "",
                                    game.state === "installed" ? "installed" : "",
                                    game.state === "to_update" ? "to-update" : "",
                                    game.state === "playing" ? "playing" : "",
                                ].filter(i=> !!i).join(" ").trim()}
                                onClick={() => handleSelect(game)}
                                onDoubleClick={() => {
                                    if (game.state === "installed") {
                                        handlePlay();
                                    } else if (game.state === "to_update") {
                                        handleUpdate();
                                    }
                                }}
                            >
                                <img
                                    src={ url + `/games-icons/${game.iconHash}` }
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
                    <div className="main-details-steam">
                        <div className="banner-container">
                            <img
                                src={url + `/banners-icons/${selected.bannerHash}`}
                                alt={selected.name}
                                className="main-banner-steam"
                            />
                            <img
                                src={url + `/games-icons/${selected.iconHash}`}
                                alt={selected.name}
                                className="main-icon-steam"
                            />
                        </div>
                        <div className="main-details-content">
                            <h2>{selected.name}</h2>
                            <p style={{ color: "#bcbcbc" }}>{selected.description}</p>
                            <div className="library-details-row">
                                <div className="game-properties">
                                    {selected.genre && <div><b>Genre:</b> {selected.genre}</div>}
                                    {selected.developer && <div><b>Developer:</b> {selected.developer}</div>}
                                    {selected.publisher && <div><b>Publisher:</b> {selected.publisher}</div>}
                                    {selected.release_date && <div><b>Release Date:</b> {selected.release_date}</div>}
                                    {selected.platforms && <div><b>Platforms:</b> {selected.platforms}</div>}
                                    {selected.rating !== undefined && <div><b>Rating:</b> {selected.rating}</div>}
                                </div>
                                <div className="library-btn-col">
                                    {selected.state === "not_installed" && (
                                        <button className="library-play-btn can-install" onClick={handleInstall}>Install</button>
                                    )}
                                    {selected.state === "to_update" && (
                                        <button className="library-play-btn can-update" onClick={handleUpdate}>Update</button>
                                    )}
                                    {selected.state === "installed" && (
                                        <div className="library-btn-col">
                                            <button className="library-play-btn can-play" onClick={handlePlay} disabled={isPlaying}>
                                                {isPlaying ? "In Game" : "Play"}
                                            </button>
                                            <button className="library-play-btn can-delete" onClick={handleDelete} disabled={isPlaying}>
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                    {selected.state === "playing" && (
                                        <button className="library-play-btn playing" disabled>In Game</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Library;
