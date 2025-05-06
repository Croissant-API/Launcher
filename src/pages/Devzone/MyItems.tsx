import React, { useEffect, useState } from 'react';
import '../../styles/GameForm.css';
import { endpoint, url } from '../../config/config';
import DevNavbar from '../../components/DevNavbar';

type Item = {
    itemId: string;
    name: string;
    description: string;
    price: number;
    showInStore: boolean;
    iconHash?: string;
};

const MyItems = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>(null);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<any>({});
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; item: Item } | null>(null);

    // Fetch items on mount
    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const res = await fetch(endpoint + '/items/@mine', {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    setItems(Array.isArray(data) ? data : data.items || []);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    // Start editing an item
    const handleEdit = (item: Item) => {
        setEditingId(item.itemId);
        setFormData({
            name: item.name,
            description: item.description,
            price: item.price.toString(),
            showInStore: !!item.showInStore, // Ensure boolean value
            iconHash: item.iconHash || '',
        });
        setIconFile(null);
        setErrors({});
        setSuccess(null);
    };

    // Cancel editing
    const handleCancel = () => {
        setEditingId(null);
        setFormData(null);
        setIconFile(null);
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
        if (iconFile) {
            const iconData = new FormData();
            iconData.append('icon', iconFile);
            try {
                const res = await fetch(url + '/upload/item-icon', {
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

        const data = {
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            showInStore: !!formData.showInStore, // Ensure boolean is sent
            ...(iconHash && { iconHash }),
        };

        try {
            const res = await fetch(endpoint + `/items/update/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setSuccess('Item updated successfully!');
                // Update local list
                setItems(items =>
                    items.map(item =>
                        item.itemId === editingId ? { ...item, ...data } : item
                    )
                );
                setEditingId(null);
                setFormData(null);
                setIconFile(null);
            } else {
                const err = await res.json();
                setErrors({ submit: err.message || 'Failed to update item.' });
            }
        } catch (err: any) {
            setErrors({ submit: err.message || 'Failed to update item.' });
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
                    }}>My Items</span>
                </h1>
                {loading ? (
                    <div style={{ color: "#fff", textAlign: "center" }}>Loading...</div>
                ) : (
                    <>
                        {items.length === 0 && (
                            <div style={{ color: "#fff", textAlign: "center" }}>No items found.</div>
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
                            {items.map(item => (
                                <div key={`item-${item.itemId}`}
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
                                            item,
                                        });
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                    onClick={() => handleEdit(item)}
                                >
                                    <img
                                        src={item.iconHash ? url + "/items-icons/" + item.iconHash : undefined}
                                        alt={item.name}
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
                                    }}>{item.name}</div>
                                    <div style={{
                                        color: "#ffd700",
                                        fontWeight: 700,
                                        fontSize: 15,
                                        marginBottom: 2,
                                        textAlign: "center"
                                    }}>{item.price}<img src="./credit.png" style={{width: '18px', height: '18px', position: 'relative', marginLeft: '4px', top: '4px'}}/></div>
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
                                            handleEdit(item);
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                            {Array.from({ length: Math.max(0, 6 * Math.ceil(items.length / 6) - items.length) }).map((_, idx) => (
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
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.item.name}</div>
                                <div style={{ color: "#bcbcbc" }}>{tooltip.item.description}</div>
                                <div style={{ marginTop: 8, color: "#ffd700" }}>
                                    Price: {tooltip.item.price}<img src="./credit.png" style={{width: '18px', height: '18px', position: 'relative', marginLeft: '4px', top: '4px'}}/>
                                    <span style={{ color: "#bcbcbc", marginLeft: 8 }}>
                                        Show in Store: {tooltip.item.showInStore ? "Yes" : "No"}
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
                                        minWidth: 340,
                                        color: "#fff",
                                        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                                        textAlign: "center",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 12,
                                    }}
                                >
                                    <h2 style={{ marginBottom: 12 }}>Edit Item</h2>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Name"
                                        style={{ marginBottom: 6, width: "100%" }}
                                        required
                                    />
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Description"
                                        rows={2}
                                        style={{ marginBottom: 6, width: "100%" }}
                                        required
                                    />
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="Price"
                                        min={0}
                                        style={{ marginBottom: 6, width: "100%" }}
                                        required
                                    />
                                    <label style={{ color: "#fff", marginBottom: 6 }}>
                                        <input
                                            type="checkbox"
                                            name="showInStore"
                                            checked={formData.showInStore}
                                            onChange={handleChange}
                                            style={{ marginRight: 6 }}
                                        />
                                        Show in Store
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleIconChange}
                                        style={{ marginBottom: 6, width: "100%" }}
                                    />
                                    {errors.submit && <div style={{ color: "red", marginBottom: 6 }}>{errors.submit}</div>}
                                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                                        <button type="submit" disabled={submitting} style={{ background: "#3cbf7f" }}>
                                            {submitting ? "Saving..." : "Save"}
                                        </button>
                                        <button type="button" onClick={handleCancel} disabled={submitting}>
                                            Cancel
                                        </button>
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

export default MyItems;