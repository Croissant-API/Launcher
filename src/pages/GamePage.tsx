import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { url, endpoint } from "../config/config";

const GamePage: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const [game, setGame] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const navigate = useNavigate();

    React.useEffect(() => {
        fetch(endpoint + "/games/" + gameId)
            .then(res => res.json())
            .then(setGame)
            .finally(() => setLoading(false));
    }, [gameId]);

    if (loading) return <div>Loading...</div>;
    if (!game) return <div>Game not found.</div>;

    return (
        <div className="main-details-steam" style={{ marginTop: 30}}>
            <button
                onClick={() => navigate(-1)}
                style={{
                    margin: "24px 0 0 24px",
                    padding: "8px 20px",
                    background: "#23262e",
                    color: "#fff",
                    border: "1px solid #bcbcbc",
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 15,
                    position: "absolute",
                    zIndex: 10
                }}
            >
                ← Back
            </button>
            <div className="banner-container">
                <img src={url + `/banners-icons/${game.bannerHash}`} alt={game.name} className="main-banner-steam" />
                <img src={url + `/games-icons/${game.iconHash}`} alt={game.name} className="main-icon-steam" />
            </div>
            <div className="main-details-content">
                <h2>{game.name}</h2>
                <p style={{ color: "#bcbcbc" }}>{game.description}</p>
                <div className="game-properties">
                    {game.genre && <div><b>Genre:</b> {game.genre}</div>}
                    {game.developer && <div><b>Developer:</b> {game.developer}</div>}
                    {game.publisher && <div><b>Publisher:</b> {game.publisher}</div>}
                    {game.release_date && <div><b>Release Date:</b> {game.release_date}</div>}
                    {game.platforms && <div><b>Platforms:</b> {game.platforms}</div>}
                    {game.rating !== undefined && <div><b>Rating:</b> {game.rating}</div>}
                    {game.price !== undefined && <div><b>Price:</b> {game.price} <img src="../credit.png" style={{width: 18, height: 18, verticalAlign: "middle"}} /></div>}
                </div>
                {/* Add more details or actions as needed */}
            </div>
        </div>
    );
};

export default GamePage;