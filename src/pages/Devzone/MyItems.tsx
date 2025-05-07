import React, { useEffect, useState } from 'react';
import { endpoint, url } from '../../config/config';

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
            <div className="myitems-container">
                <h1 className="myitems-title">
                    <span className="myitems-title-span">My Items</span>
                </h1>
                {loading ? (
                    <div className="myitems-loading">Loading...</div>
                ) : (
                    <>
                        {items.length === 0 && (
                            <div className="myitems-empty">No items found.</div>
                        )}
                        <div className="myitems-grid">
                            {items.map(item => (
                                <div key={`item-${item.itemId}`}
                                    className="myitems-card"
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
                                        className="myitems-card-icon"
                                        draggable={false}
                                    />
                                    <div className="myitems-card-name">{item.name}</div>
                                    <div className="myitems-card-price">
                                        {item.price}
                                        <img src="./credit.png" className="myitems-card-credit" />
                                    </div>
                                    <button
                                        className="myitems-card-editbtn"
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
                                <div key={`empty-${idx}`} className="myitems-card-empty" />
                            ))}
                        </div>
                        {tooltip && (
                            <div
                                className="myitems-tooltip"
                                style={{
                                    left: tooltip.x,
                                    top: tooltip.y,
                                }}
                            >
                                <div className="myitems-tooltip-title">{tooltip.item.name}</div>
                                <div className="myitems-tooltip-desc">{tooltip.item.description}</div>
                                <div className="myitems-tooltip-price">
                                    Price: {tooltip.item.price}
                                    <img src="./credit.png" className="myitems-card-credit" />
                                    <span className="myitems-tooltip-store">
                                        Show in Store: {tooltip.item.showInStore ? "Yes" : "No"}
                                    </span>
                                </div>
                            </div>
                        )}
                        {editingId && (
                            <div className="myitems-modal-overlay">
                                <form
                                    onSubmit={handleSubmit}
                                    className="myitems-modal-form"
                                >
                                    <h2 className="myitems-modal-title">Edit Item</h2>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Name"
                                        className="myitems-input"
                                        required
                                    />
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Description"
                                        rows={2}
                                        className="myitems-input"
                                        required
                                    />
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="Price"
                                        min={0}
                                        className="myitems-input"
                                        required
                                    />
                                    <label className="myitems-label">
                                        <input
                                            type="checkbox"
                                            name="showInStore"
                                            checked={formData.showInStore}
                                            onChange={handleChange}
                                            className="myitems-checkbox"
                                        />
                                        Show in Store
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleIconChange}
                                        className="myitems-input"
                                    />
                                    {errors.submit && <div className="myitems-error">{errors.submit}</div>}
                                    <div className="myitems-modal-btns">
                                        <button type="submit" disabled={submitting} className="myitems-btn-save">
                                            {submitting ? "Saving..." : "Save"}
                                        </button>
                                        <button type="button" onClick={handleCancel} disabled={submitting} className="myitems-btn-cancel">
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