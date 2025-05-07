import React, { useEffect, useState } from 'react';
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

    const handleCancel = () => {
        setEditingId(null);
        setFormData(null);
        setIconFile(null);
        setBannerFile(null);
        setErrors({});
        setSuccess(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target as any;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIconFile(e.target.files[0]);
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBannerFile(e.target.files[0]);
        }
    };

    const validate = () => {
        const newErrors: any = {};
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.price) newErrors.price = 'Price is required';
        return newErrors;
    };

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
            <div className="mygames-container">
                <h1 className="mygames-title">
                    <span className="mygames-title-span">My Games</span>
                </h1>
                {loading ? (
                    <div className="mygames-loading">Loading...</div>
                ) : (
                    <>
                        {games.length === 0 && (
                            <div className="mygames-empty">No games found.</div>
                        )}
                        <div className="mygames-grid">
                            {games.map(game => (
                                <div key={`game-${game.gameId}`}
                                    className="mygames-card"
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
                                        className="mygames-card-icon"
                                        draggable={false}
                                    />
                                    <div className="mygames-card-name">{game.name}</div>
                                    <div className="mygames-card-price">
                                        {game.price}
                                        <img src="./credit.png" className="mygames-card-credit" />
                                    </div>
                                    <button
                                        className="mygames-card-editbtn"
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
                                <div key={`empty-${idx}`} className="mygames-card-empty" />
                            ))}
                        </div>
                        {tooltip && (
                            <div
                                className="mygames-tooltip"
                                style={{
                                    left: tooltip.x,
                                    top: tooltip.y,
                                }}
                            >
                                <div className="mygames-tooltip-title">{tooltip.game.name}</div>
                                <div className="mygames-tooltip-desc">{tooltip.game.description}</div>
                                <div className="mygames-tooltip-price">
                                    Price: {tooltip.game.price}
                                    <img src="./credit.png" className="mygames-card-credit" />
                                    <span className="mygames-tooltip-store">
                                        Show in Store: {tooltip.game.showInStore ? "Yes" : "No"}
                                    </span>
                                </div>
                            </div>
                        )}
                        {editingId && (
                            <div className="mygames-modal-overlay">
                                <form
                                    onSubmit={handleSubmit}
                                    className="mygames-modal-form"
                                >
                                    <div className="mygames-modal-col">
                                        <h2 className="mygames-modal-title">Edit Game</h2>
                                        <label className="mygames-label" htmlFor="name">Name</label>
                                        <input
                                            id="name"
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Name"
                                            className="mygames-input"
                                            required
                                        />
                                        <label className="mygames-label" htmlFor="description">Description</label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder="Description"
                                            rows={2}
                                            className="mygames-input"
                                            required
                                        />
                                        <label className="mygames-label" htmlFor="price">Price</label>
                                        <input
                                            id="price"
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleChange}
                                            placeholder="Price"
                                            min={0}
                                            className="mygames-input"
                                            required
                                        />
                                        <label className="mygames-label">
                                            <input
                                                type="checkbox"
                                                name="showInStore"
                                                checked={formData.showInStore}
                                                onChange={handleChange}
                                                className="mygames-checkbox"
                                            />
                                            Show in Store
                                        </label>
                                        <label className="mygames-label">
                                            <input
                                                type="checkbox"
                                                name="multiplayer"
                                                checked={formData.multiplayer}
                                                onChange={handleChange}
                                                className="mygames-checkbox"
                                            />
                                            Multiplayer
                                        </label>
                                    </div>
                                    <div className="mygames-modal-col">
                                        <label className="mygames-label" htmlFor="icon">Game Icon</label>
                                        <input
                                            id="icon"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleIconChange}
                                            className="mygames-input"
                                        />
                                        <label className="mygames-label" htmlFor="banner">Banner</label>
                                        <input
                                            id="banner"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBannerChange}
                                            className="mygames-input"
                                        />
                                        <label className="mygames-label" htmlFor="genre">Genre</label>
                                        <input
                                            id="genre"
                                            type="text"
                                            name="genre"
                                            value={formData.genre}
                                            onChange={handleChange}
                                            placeholder="Genre"
                                            className="mygames-input"
                                        />
                                        <label className="mygames-label" htmlFor="release_date">Release Date</label>
                                        <input
                                            id="release_date"
                                            type="date"
                                            name="release_date"
                                            value={formData.release_date}
                                            onChange={handleChange}
                                            placeholder="Release Date"
                                            className="mygames-input"
                                        />
                                        <label className="mygames-label" htmlFor="publisher">Publisher</label>
                                        <input
                                            id="publisher"
                                            type="text"
                                            name="publisher"
                                            value={formData.publisher}
                                            onChange={handleChange}
                                            placeholder="Publisher"
                                            className="mygames-input"
                                        />
                                    </div>
                                    <div className="mygames-modal-col">
                                        <label className="mygames-label" htmlFor="developer">Developer</label>
                                        <input
                                            id="developer"
                                            type="text"
                                            name="developer"
                                            value={formData.developer}
                                            onChange={handleChange}
                                            placeholder="Developer"
                                            className="mygames-input"
                                        />
                                        <label className="mygames-label" htmlFor="platforms">Platforms</label>
                                        <input
                                            id="platforms"
                                            type="text"
                                            name="platforms"
                                            value={formData.platforms}
                                            onChange={handleChange}
                                            placeholder="Platforms"
                                            className="mygames-input"
                                        />
                                        <label className="mygames-label" htmlFor="website">Website</label>
                                        <input
                                            id="website"
                                            type="url"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleChange}
                                            placeholder="Website"
                                            className="mygames-input"
                                        />
                                        <label className="mygames-label" htmlFor="trailer_link">Trailer Link</label>
                                        <input
                                            id="trailer_link"
                                            type="url"
                                            name="trailer_link"
                                            value={formData.trailer_link}
                                            onChange={handleChange}
                                            placeholder="Trailer Link"
                                            className="mygames-input"
                                        />
                                    </div>
                                    <div className="mygames-modal-actions">
                                        {errors.submit && <div className="mygames-error">{errors.submit}</div>}
                                        <div className="mygames-modal-btns">
                                            <button type="submit" disabled={submitting} className="mygames-btn-save">
                                                {submitting ? "Saving..." : "Save"}
                                            </button>
                                            <button type="button" onClick={handleCancel} disabled={submitting} className="mygames-btn-cancel">
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