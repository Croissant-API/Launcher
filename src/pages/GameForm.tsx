import React, { Dispatch, SetStateAction, useState } from 'react';
import '../styles/GameForm.css';
import { endpoint, url } from '../config/config';

const GameForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        downloadLink: '',
        iconHash: '',
        bannerHash: '',
        showInStore: true,
        genre: '',
        release_date: '',
        developer: '',
        publisher: '',
        platforms: '',
        website: '',
        trailer_link: '',
        multiplayer: false,
    });

    const [errors, setErrors]: [any, Dispatch<SetStateAction<any>>] = useState({});
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target as any;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const form = new FormData();
        form.append("icon", file);
        try {
            const res = await fetch(url + "/upload/game-icon", {
                method: "POST",
                body: form,
            });
            const data = await res.json();
            if (data.hash) {
                setFormData(f => ({ ...f, iconHash: data.hash }));
                setErrors((err: any) => ({ ...err, iconHash: undefined }));
            } else {
                setErrors((err: any) => ({ ...err, iconHash: "Upload failed" }));
            }
        } catch {
            setErrors((err: any) => ({ ...err, iconHash: "Upload failed" }));
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const form = new FormData();
        form.append("banner", file);
        try {
            const res = await fetch(url + "/upload/banner", {
                method: "POST",
                body: form,
            });
            const data = await res.json();
            if (data.hash) {
                setFormData(f => ({ ...f, bannerHash: data.hash }));
                setErrors((err: any) => ({ ...err, bannerHash: undefined }));
            } else {
                setErrors((err: any) => ({ ...err, bannerHash: "Upload failed" }));
            }
        } catch {
            setErrors((err: any) => ({ ...err, bannerHash: "Upload failed" }));
        }
    };

    const validate = () => {
        const newErrors: any = {};
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.price) newErrors.price = 'Price is required';
        if (!formData.downloadLink) newErrors.downloadLink = 'Download link is required';
        if (!formData.iconHash) newErrors.iconHash = 'Game icon is required';
        if (!formData.bannerHash) newErrors.bannerHash = 'Banner is required';
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
        setLoading(true);

        const data = {
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            download_link: formData.downloadLink,
            showInStore: formData.showInStore,
            genre: formData.genre || null,
            release_date: formData.release_date || null,
            developer: formData.developer || null,
            publisher: formData.publisher || null,
            platforms: formData.platforms || null,
            website: formData.website || null,
            trailer_link: formData.trailer_link || null,
            multiplayer: formData.multiplayer,
            iconHash: formData.iconHash,
            bannerHash: formData.bannerHash,
        }

        try {
            const res = await fetch(endpoint + '/games', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setSuccess('Game created successfully!');
                setFormData({
                    name: '',
                    description: '',
                    price: '',
                    downloadLink: '',
                    iconHash: '',
                    bannerHash: '',
                    showInStore: true,
                    genre: '',
                    release_date: '',
                    developer: '',
                    publisher: '',
                    platforms: '',
                    website: '',
                    trailer_link: '',
                    multiplayer: false,
                });
            } else {
                const err = await res.json();
                setErrors({ submit: err.message || 'Failed to create game.' });
            }
        } catch (err: any) {
            setErrors({ submit: err.message || 'Failed to create game.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="container"
            style={{
                padding: "32px",
                backgroundColor: "#3c3c3c",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                maxWidth: 500,
                margin: "40px auto"
            }}
        >
            <h1 style={{ textAlign: "center", marginBottom: 24 }}>
                <span style={{
                    color: "#fff",
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: 1
                }}>Submit a Game</span>
            </h1>
            <form onSubmit={handleSubmit} className="game-form">
                <div className="form-row">
                    <label htmlFor="name">
                        Name <span className="required">*</span>
                    </label>
                    <input
                        id="name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="dark-input"
                    />
                </div>
                {errors.name && <span className="error">{errors.name}</span>}
                <div className="form-row">
                    <label htmlFor="description">
                        Description <span className="required">*</span>
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        required
                        rows={4}
                        className="dark-input"
                        style={{ resize: "vertical" }}
                    />
                </div>
                {errors.description && <span className="error">{errors.description}</span>}
                <div className="form-row">
                    <label htmlFor="price">
                        Price <span className="required">*</span>
                    </label>
                    <input
                        id="price"
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        min={0}
                        step="any"
                        className="dark-input"
                    />
                </div>
                {errors.price && <span className="error">{errors.price}</span>}
                <div className="form-row">
                    <label htmlFor="downloadLink">
                        Download Link <span className="required">*</span>
                    </label>
                    <input
                        id="downloadLink"
                        type="url"
                        name="downloadLink"
                        value={formData.downloadLink}
                        onChange={handleChange}
                        required
                        className="dark-input"
                    />
                </div>
                {errors.downloadLink && <span className="error">{errors.downloadLink}</span>}
                <div className="form-row">
                    <label htmlFor="image">
                        Game Icon <span className="required">*</span>
                    </label>
                    <input
                        id="image"
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleImageUpload}
                        required
                        className="dark-input"
                    />
                    {formData.iconHash && (
                        <span style={{ color: "#3cbf7f" }}>Uploaded! Hash: {formData.iconHash}</span>
                    )}
                </div>
                {errors.iconHash && <span className="error">{errors.iconHash}</span>}
                <div className="form-row">
                    <label htmlFor="banner">
                        Banner <span className="required">*</span>
                    </label>
                    <input
                        id="banner"
                        type="file"
                        name="banner"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        required
                        className="dark-input"
                    />
                    {formData.bannerHash && (
                        <span style={{ color: "#3cbf7f" }}>Uploaded! Hash: {formData.bannerHash}</span>
                    )}
                </div>
                {errors.bannerHash && <span className="error">{errors.bannerHash}</span>}
                <div className="form-row">
                    <label htmlFor="showInStore">
                        Show in Store
                    </label>
                    <input
                        id="showInStore"
                        type="checkbox"
                        name="showInStore"
                        checked={formData.showInStore}
                        onChange={e => setFormData({ ...formData, showInStore: e.target.checked })}
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="genre">Genre</label>
                    <input
                        id="genre"
                        type="text"
                        name="genre"
                        value={formData.genre}
                        onChange={handleChange}
                        className="dark-input"
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="release_date">Release Date</label>
                    <input
                        id="release_date"
                        type="date"
                        name="release_date"
                        value={formData.release_date}
                        onChange={handleChange}
                        className="dark-input"
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="developer">Developer</label>
                    <input
                        id="developer"
                        type="text"
                        name="developer"
                        value={formData.developer}
                        onChange={handleChange}
                        className="dark-input"
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="publisher">Publisher</label>
                    <input
                        id="publisher"
                        type="text"
                        name="publisher"
                        value={formData.publisher}
                        onChange={handleChange}
                        className="dark-input"
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="platforms">Platforms</label>
                    <input
                        id="platforms"
                        type="text"
                        name="platforms"
                        value={formData.platforms}
                        onChange={handleChange}
                        className="dark-input"
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="website">Website</label>
                    <input
                        id="website"
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="dark-input"
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="trailer_link">Trailer Link</label>
                    <input
                        id="trailer_link"
                        type="url"
                        name="trailer_link"
                        value={formData.trailer_link}
                        onChange={handleChange}
                        className="dark-input"
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="multiplayer">Multiplayer</label>
                    <input
                        id="multiplayer"
                        type="checkbox"
                        name="multiplayer"
                        checked={formData.multiplayer}
                        onChange={e => setFormData({ ...formData, multiplayer: e.target.checked })}
                    />
                </div>
                {errors.submit && <span className="error">{errors.submit}</span>}
                {success && <span style={{ color: "#3cbf7f", fontWeight: 600 }}>{success}</span>}
                <button type="submit" style={{ marginTop: 10 }} disabled={loading}>
                    {loading ? "Submitting..." : "Submit"}
                </button>
            </form>
        </div>
    );
};

export default GameForm;