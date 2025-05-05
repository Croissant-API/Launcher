import React, { useState, useEffect } from "react";
import "../styles/Library.css";
import { endpoint } from "../config/config";

type Game = {
    id?: number;
    gameId: string;
    name: string;
    description: string;
    price: number;
    ownerId: string;
    showInStore: boolean;
    image?: string;
};

const Library: React.FC = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [selected, setSelected] = useState<Game | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Remplace l'URL par celle de ton backend si besoin
        fetch(endpoint + "/games/list/@me", { 
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

    const handlePlay = () => {
        if (!isPlaying && selected && selected.showInStore) {
            setIsPlaying(true);
            setTimeout(() => setIsPlaying(false), 5000);
        }
    };

    const handleSelect = (game: Game) => {
        setSelected(game);
        setIsPlaying(false);
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div style={{ color: "red" }}>{error}</div>;
    if (!selected) return <div>No games found.</div>;

    return (
        <div className="steam-library-layout">
            <aside className="steam-library-sidebar">
                <h3 className="sidebar-title">Games</h3>
                <ul className="sidebar-list">
                    {games.map((game) => (
                        <li
                            key={game.gameId}
                            className={`sidebar-game ${selected.gameId === game.gameId ? "selected" : ""}`}
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
            </aside>
            <main className="steam-library-main">
                <img
                    src={selected.image || "https://placehold.co/600x300?text=No+Image"}
                    alt={selected.name}
                    className="main-splash"
                />
                <div className="main-details">
                    <h2>{selected.name}</h2>
                    <p>{selected.description}</p>
                    <button
                        className={`library-play-btn ${isPlaying ? "playing" : selected.showInStore ? "can-play" : ""}`}
                        disabled={!selected.showInStore || isPlaying}
                        onClick={handlePlay}
                    >
                        {!selected.showInStore
                            ? "Unavailable"
                            : isPlaying
                            ? "In Game"
                            : "Play"}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Library;
