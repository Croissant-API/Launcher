import React, { useEffect, useState } from 'react';
import '../../styles/GameForm.css';
import { endpoint, url } from '../../config/config';
import DevNavbar from '../../components/DevNavbar';

type Game = {
    gameId: string;
    name: string;
    description: string;
    price: number;
    showInStore: boolean;
    iconHash?: string;
    bannerHash?: string;
    genre?: string;
    release_date?: string;
    developer?: string;
    publisher?: string;
    platforms?: string;
    website?: string;
    trailer_link?: string;
    multiplayer?: boolean;
};

const MyGames = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>(null);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<any>({});
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; game: Game } | null>(null);

    // Fetch games on mount
    useEffect(() => {
        const fetchGames = async () => {
            setLoading(true);
            try {
                const res = await fetch(endpoint + '/games/@mine', {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    setGames(Array.isArray(data) ? data : data.games || []);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchGames();
    }, []);

    // Start editing a game
    const handleEdit = (game: Game) => {
        setEditingId(game.gameId);
        setFormData({
            name: game.name,
            description: game.description,
            price: game.price.toString(),
            showInStore: game.showInStore,
            iconHash: game.iconHash || null,
            bannerHash: game.bannerHash || null,
            genre: game.genre || '',
            release_date: game.release_date || '',
            developer: game.developer || '',
            publisher: game.publisher || '',
            platforms: game.platforms || '',
            website: game.website || '',
            trailer_link: game.trailer_link || '',
            multiplayer: !!game.multiplayer,
        });
        setIconFile(null);
        setBannerFile(null);
        setErrors({});
        setSuccess(null);
    };

    // Cancel editing
    const handleCancel = () => {
        setEditingId(null);
        setFormData(null);
        setIconFile(null);
        setBannerFile(null);
        setErrors({});
        setSuccess(null);
    };

    // Handle form changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target as any;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    // Handle icon file selection
    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIconFile(e.target.files[0]);
        }
    };

    // Handle banner file selection
    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBannerFile(e.target.files[0]);
        }
    };

    // Validate form
    const validate = () => {
        const newErrors: any = {};
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.price) newErrors.price = 'Price is required';
        return newErrors;
    };

    // Submit edit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess(null);
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setSubmitting(true);

        let iconHash = formData.iconHash;
        let bannerHash = formData.bannerHash;

        if (iconFile) {
            const iconData = new FormData();
            iconData.append('icon', iconFile);
            try {
                const res = await fetch(url + '/upload/game-icon', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: iconData,
                });
                if (res.ok) {
                    const data = await res.json();
                    iconHash = data.hash;
                } else {
                    const err = await res.json();
                    setErrors({ submit: err.error || 'Failed to upload icon.' });
                    setSubmitting(false);
                    return;
                }
            } catch (err: any) {
                setErrors({ submit: err.message || 'Failed to upload icon.' });
                setSubmitting(false);
                return;
            }
        }

        if (bannerFile) {
            const bannerData = new FormData();
            bannerData.append('banner', bannerFile);
            try {
                const res = await fetch(url + '/upload/banner', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: bannerData,
                });
                if (res.ok) {
                    const data = await res.json();
                    bannerHash = data.hash;
                } else {
                    const err = await res.json();
                    setErrors({ submit: err.error || 'Failed to upload banner.' });
                    setSubmitting(false);
                    return;
                }
            } catch (err: any) {
                setErrors({ submit: err.message || 'Failed to upload banner.' });
                setSubmitting(false);
                return;
            }
        }

        const data = {
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            showInStore: formData.showInStore,
            iconHash,
            bannerHash,
            genre: formData.genre,
            release_date: formData.release_date,
            developer: formData.developer,
            publisher: formData.publisher,
            platforms: formData.platforms,
            website: formData.website,
            trailer_link: formData.trailer_link,
            multiplayer: formData.multiplayer,
        };

        try {
            const res = await fetch(endpoint + `/games/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setSuccess('Game updated successfully!');
                setGames(games =>
                    games.map(game =>
                        game.gameId === editingId ? { ...game, ...data } : game
                    )
                );
                setEditingId(null);
                setFormData(null);
                setIconFile(null);
                setBannerFile(null);
            } else {
                const err = await res.json();
                setErrors({ submit: err.message || 'Failed to update game.' });
            }
        } catch (err: any) {
            setErrors({ submit: err.message || 'Failed to update game.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <DevNavbar />
            <div className="container" style={{
                padding: "32px",
                backgroundColor: "#3c3c3c",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                margin: "40px auto",
                width: "90vw"
            }}>
                <h1 style={{ textAlign: "center", marginBottom: 24 }}>
                    <span style={{
                        color: "#fff",
                        padding: "4px 12px",
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 20,
                        letterSpacing: 1
                    }}>My Games</span>
                </h1>
                {loading ? (
                    <div style={{ color: "#fff", textAlign: "center" }}>Loading...</div>
                ) : (
                    <>
                        {games.length === 0 && (
                            <div style={{ color: "#fff", textAlign: "center" }}>No games found.</div>
                        )}
                        <div
                            style={{
                                margin: "0 auto",
                                display: "grid",
                                gridTemplateColumns: `repeat(6, 120px)`,
                                gap: 18,
                                justifyContent: "center",
                                background: "none",
                                border: "none",
                                padding: 0,
                            }}
                        >
                            {games.map(game => (
                                <div key={`game-${game.gameId}`}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        background: "#232323",
                                        borderRadius: 8,
                                        padding: 10,
                                        position: "relative",
                                        cursor: "pointer",
                                        userSelect: "none",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                                        border: "2px solid #444",
                                        transition: "transform 0.1s",
                                        minHeight: 170,
                                    }}
                                    tabIndex={0}
                                    draggable={false}
                                    onMouseEnter={e => {
                                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                                        setTooltip({
                                            x: rect.right + 8,
                                            y: rect.top,
                                            game,
                                        });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                    onClick={() => handleEdit(game)}
                                >
                                    <img
                                        src={url + "/games-icons/" + game.iconHash}
                                        alt={game.name}
                                        style={{
                                            width: 64,
                                            height: 64,
                                            objectFit: "contain",
                                            marginBottom: 8,
                                            imageRendering: "pixelated",
                                            pointerEvents: "none",
                                            userSelect: "none",
                                            background: "#111",
                                            borderRadius: 8,
                                        }}
                                        draggable={false}
                                    />
                                    <div style={{
                                        fontWeight: 700,
                                        color: "#fff",
                                        fontSize: 15,
                                        marginBottom: 2,
                                        textAlign: "center",
                                        width: "100%",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>{game.name}</div>
                                    <div style={{
                                        color: "#ffd700",
                                        fontWeight: 700,
                                        fontSize: 15,
                                        marginBottom: 2,
                                        textAlign: "center"
                                    }}>{game.price}<img src="./credit.png" style={{width: '18px', height: '18px', position: 'relative', marginLeft: '4px', top: '4px'}}/></div>
                                    <button
                                        style={{
                                            marginTop: 8,
                                            padding: "6px 12px",
                                            background: "#3cbf7f",
                                            color: "#222",
                                            border: "none",
                                            borderRadius: 6,
                                            fontWeight: 600,
                                            cursor: "pointer"
                                        }}
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleEdit(game);
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                            {Array.from({ length: Math.max(0, 6 * Math.ceil(games.length / 6) - games.length) }).map((_, idx) => (
                                <div key={`empty-${idx}`} style={{ minHeight: 170 }} />
                            ))}
                        </div>
                        {tooltip && (
                            <div
                                style={{
                                    position: "fixed",
                                    left: tooltip.x,
                                    top: tooltip.y,
                                    background: "#222",
                                    color: "#fff",
                                    border: "1px solid #888",
                                    borderRadius: 6,
                                    padding: "10px 16px",
                                    zIndex: 1000,
                                    pointerEvents: "none",
                                    minWidth: 200,
                                    maxWidth: 320,
                                    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                                    fontSize: 15,
                                    whiteSpace: "pre-line",
                                }}
                            >
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.game.name}</div>
                                <div style={{ color: "#bcbcbc" }}>{tooltip.game.description}</div>
                                <div style={{ marginTop: 8, color: "#ffd700" }}>
                                    Price: {tooltip.game.price}<img src="./credit.png" style={{width: '18px', height: '18px', position: 'relative', marginLeft: '4px', top: '4px'}}/>
                                    <span style={{ color: "#bcbcbc", marginLeft: 8 }}>
                                        Show in Store: {tooltip.game.showInStore ? "Yes" : "No"}
                                    </span>
                                </div>
                            </div>
                        )}
                        {editingId && (
                            <div
                                style={{
                                    position: "fixed",
                                    left: 0,
                                    top: 0,
                                    width: "100vw",
                                    height: "100vh",
                                    background: "rgba(0,0,0,0.5)",
                                    zIndex: 3000,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <form
                                    onSubmit={handleSubmit}
                                    style={{
                                        background: "#232323",
                                        border: "1px solid #888",
                                        borderRadius: 8,
                                        padding: 32,
                                        minWidth: 900,
                                        color: "#fff",
                                        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                                        textAlign: "center",
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr",
                                        gap: "36px",
                                        position: "relative",
                                        top: "50px"
                                    }}
                                >
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <h2 style={{ marginBottom: 12, gridColumn: "span 3" }}>Edit Game</h2>
                                        <label style={{ textAlign: "left" }} htmlFor="name">Name</label>
                                        <input
                                            id="name"
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Name"
                                            style={{ marginBottom: 6, width: "100%" }}
                                            required
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="description">Description</label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder="Description"
                                            rows={2}
                                            style={{ marginBottom: 6, width: "100%" }}
                                            required
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="price">Price</label>
                                        <input
                                            id="price"
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleChange}
                                            placeholder="Price"
                                            min={0}
                                            style={{ marginBottom: 6, width: "100%" }}
                                            required
                                        />
                                        <label style={{ textAlign: "left" }}>
                                            <input
                                                type="checkbox"
                                                name="showInStore"
                                                checked={formData.showInStore}
                                                onChange={handleChange}
                                                style={{ marginRight: 6 }}
                                            />
                                            Show in Store
                                        </label>
                                        <label style={{ textAlign: "left" }}>
                                            <input
                                                type="checkbox"
                                                name="multiplayer"
                                                checked={formData.multiplayer}
                                                onChange={handleChange}
                                                style={{ marginRight: 6 }}
                                            />
                                            Multiplayer
                                        </label>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <label style={{ textAlign: "left" }} htmlFor="icon">Game Icon</label>
                                        <input
                                            id="icon"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleIconChange}
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="banner">Banner</label>
                                        <input
                                            id="banner"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBannerChange}
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="genre">Genre</label>
                                        <input
                                            id="genre"
                                            type="text"
                                            name="genre"
                                            value={formData.genre}
                                            onChange={handleChange}
                                            placeholder="Genre"
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="release_date">Release Date</label>
                                        <input
                                            id="release_date"
                                            type="date"
                                            name="release_date"
                                            value={formData.release_date}
                                            onChange={handleChange}
                                            placeholder="Release Date"
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="publisher">Publisher</label>
                                        <input
                                            id="publisher"
                                            type="text"
                                            name="publisher"
                                            value={formData.publisher}
                                            onChange={handleChange}
                                            placeholder="Publisher"
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <label style={{ textAlign: "left" }} htmlFor="developer">Developer</label>
                                        <input
                                            id="developer"
                                            type="text"
                                            name="developer"
                                            value={formData.developer}
                                            onChange={handleChange}
                                            placeholder="Developer"
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="platforms">Platforms</label>
                                        <input
                                            id="platforms"
                                            type="text"
                                            name="platforms"
                                            value={formData.platforms}
                                            onChange={handleChange}
                                            placeholder="Platforms"
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="website">Website</label>
                                        <input
                                            id="website"
                                            type="url"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleChange}
                                            placeholder="Website"
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                        <label style={{ textAlign: "left" }} htmlFor="trailer_link">Trailer Link</label>
                                        <input
                                            id="trailer_link"
                                            type="url"
                                            name="trailer_link"
                                            value={formData.trailer_link}
                                            onChange={handleChange}
                                            placeholder="Trailer Link"
                                            style={{ marginBottom: 6, width: "100%" }}
                                        />
                                    </div>
                                    <div style={{ gridColumn: "span 3", marginTop: 8 }}>
                                        {errors.submit && <div style={{ color: "red", marginBottom: 6 }}>{errors.submit}</div>}
                                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                                            <button type="submit" disabled={submitting} style={{ background: "#3cbf7f" }}>
                                                {submitting ? "Saving..." : "Save"}
                                            </button>
                                            <button type="button" onClick={handleCancel} disabled={submitting}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default MyGames;