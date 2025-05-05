import React, { useState } from "react";
import "../styles/Library.css";

const games = [
    {
        id: 1,
        gameId: "game-001",
        name: "Space Adventure",
        description: "Explore the universe in this thrilling space game.",
        price: 29.99,
        ownerId: "user-123",
        showInStore: true,
        image: "https://placehold.co/600x300?text=Space+Adventure",
    },
    {
        id: 2,
        gameId: "game-002",
        name: "Mystery Mansion",
        description: "Solve puzzles in a haunted mansion.",
        price: 19.99,
        ownerId: "user-123",
        showInStore: true,
        image: "https://placehold.co/600x300?text=Mystery+Mansion",
    },
    {
        id: 3,
        gameId: "game-003",
        name: "Racing Thunder",
        description: "High-speed racing action with stunning graphics.",
        price: 24.99,
        ownerId: "user-123",
        showInStore: false,
        image: "https://placehold.co/600x300?text=Racing+Thunder",
    },
];

type Game = typeof games[0];

const Library: React.FC = () => {
    const [selected, setSelected] = useState<Game>(games[0]);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlay = () => {
        if (!isPlaying && selected.showInStore) {
            setIsPlaying(true);
            // Simule la fin du jeu après 5 secondes
            setTimeout(() => setIsPlaying(false), 5000);
        }
    };

    // Si on change de jeu, on arrête "en jeu"
    const handleSelect = (game: Game) => {
        setSelected(game);
        setIsPlaying(false);
    };

    return (
        <div className="steam-library-layout">
            <aside className="steam-library-sidebar">
                <h3 className="sidebar-title">Games</h3>
                <ul className="sidebar-list">
                    {games.map((game) => (
                        <li
                            key={game.id}
                            className={`sidebar-game ${selected.id === game.id ? "selected" : ""}`}
                            onClick={() => handleSelect(game)}
                        >
                            <img src={game.image} alt={game.name} className="sidebar-thumb" />
                            <span>{game.name}</span>
                        </li>
                    ))}
                </ul>
            </aside>
            <main className="steam-library-main">
                <img src={selected.image} alt={selected.name} className="main-splash" />
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
