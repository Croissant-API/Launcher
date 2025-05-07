import React, { useEffect, useState } from "react";
import { endpoint, url } from "../config/config";
import { Link } from "react-router-dom";
import "../styles/Profile.css";

interface DiscordUser {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    global_name?: string;
    banner?: string | null;
    accent_color?: number | null;
    banner_color?: string | null;
}

interface Item {
    itemId: string;
    name: string;
    description: string;
    amount: number;
    price?: number;
    owner?: string;
    showInStore?: boolean;
    deleted?: boolean;
    iconHash?: string | null;
}

type ProfileProps = {
    user: string; // userId
};

export default function Profile({ user }: ProfileProps) {
    const [profile, setProfile] = useState<DiscordUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [tooltip, setTooltip] = useState<{
        x: number;
        y: number;
        item: Item;
    } | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [ownerUser, setOwnerUser] = useState<DiscordUser | null>(null);

    const userId = user === "me" ? window.me.userId : user;

    useEffect(() => {
        setLoading(true);
        fetch(endpoint + "/users/" + userId)
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch profile");
                return res.json();
            })
            .then(setProfile)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [user]);

    useEffect(() => {
        setInventoryLoading(true);
        fetch(endpoint + "/inventory/" + userId, {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + (localStorage.getItem("token") || ""),
            },
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch inventory");
                return res.json();
            })
            .then(setItems)
            .catch(() => setItems([]))
            .finally(() => setInventoryLoading(false));
    }, [user]);

    // Tooltip handlers
    const handleMouseEnter = (e: React.MouseEvent, item: Item) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setTooltip({
            x: rect.right + 8,
            y: rect.top,
            item,
        });
    };

    const handleMouseLeave = () => setTooltip(null);

    // Handle item click to fetch details
    const handleItemClick = async (item: Item) => {
        try {
            const res = await fetch(`${endpoint}/items/${item.itemId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + (localStorage.getItem("token") || ""),
                },
            });
            if (!res.ok) throw new Error("Failed to fetch item details");
            const details = await res.json();
            setSelectedItem({
                ...item,
                ...details,
                amount: item.amount, // keep inventory amount
            });
            setTooltip(null);
        } catch {
            setSelectedItem(item); // fallback
            setTooltip(null);
        }
    };

    const handleBackToInventory = () => setSelectedItem(null);

    // Fetch creator info when selectedItem changes
    useEffect(() => {
        if (selectedItem && selectedItem.owner) {
            fetch(endpoint + "/users/" + selectedItem.owner)
                .then(res => res.ok ? res.json() : null)
                .then(setOwnerUser)
                .catch(() => setOwnerUser(null));
        } else {
            setOwnerUser(null);
        }
    }, [selectedItem]);

    if (loading) return <div className="container"><p>Loading profile...</p></div>;
    if (error) return <div className="container"><p style={{ color: "red" }}>{error}</p></div>;
    if (!profile) return <div className="container"><p>No profile found.</p></div>;

    // Show item details if selected
    if (selectedItem) {
        return (
            <div className="profile-details-container">
                <button
                    onClick={handleBackToInventory}
                    className="profile-back-btn"
                >
                    ← Back to Inventory
                </button>
                <div className="profile-details-main">
                    <img
                        src={url + "/items-icons/" + selectedItem.iconHash}
                        alt={selectedItem.name}
                        className="profile-details-img"
                    />
                    <div>
                        <div className="profile-details-name">{selectedItem.name}</div>
                        <div className="profile-details-desc">{selectedItem.description}</div>
                        <div className="profile-details-qty">Quantity: x{selectedItem.amount}</div>
                        {selectedItem.price !== undefined && (
                            <div className="profile-details-price">Price: {selectedItem.price}</div>
                        )}
                        {selectedItem.owner && ownerUser && (
                            <div className="profile-details-creator">
                                Creator:{" "}
                                <Link
                                    to={`/profile?user=${selectedItem.owner}`}
                                    className="profile-details-creator-link"
                                >
                                    <img className="profile-details-creator-avatar"
                                        src={url + "/avatar/" + selectedItem.owner }/>
                                    {ownerUser.global_name || ownerUser.username}
                                </Link>
                            </div>
                        )}
                        {selectedItem.showInStore !== undefined && (
                            <div className="profile-details-store">
                                Show in Store: {selectedItem.showInStore ? "Yes" : "No"}
                            </div>
                        )}
                        {selectedItem.deleted !== undefined && (
                            <div className="profile-details-deleted">
                                Deleted: {selectedItem.deleted ? "Yes" : "No"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-root">
            <div className="profile-header">
                <img
                    src={
                        profile.avatar
                            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`
                            : "https://cdn.discordapp.com/embed/avatars/0.png"
                    }
                    alt={profile.username}
                    className="profile-avatar"
                />
                <div>
                    <div className="profile-name">
                        {profile.global_name || profile.username}
                    </div>
                </div>
            </div>
            <h2 className="profile-inventory-title">Inventory</h2>
            {inventoryLoading ? (
                <p>Loading inventory...</p>
            ) : (
                <div className="profile-inventory-grid">
                    {items.length === 0 && (
                        <div className="profile-inventory-empty">
                            No items in inventory.
                        </div>
                    )}
                    {items.map(item => (
                        <div
                            key={item.itemId}
                            className="profile-inventory-item"
                            onMouseEnter={e => handleMouseEnter(e, item)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleItemClick(item)}
                        >
                            <img
                                src={url + "/items-icons/" + item.iconHash}
                                alt={item.name}
                                className="profile-inventory-img"
                                draggable={false}
                            />
                            <div className="profile-inventory-qty">
                                x{item.amount}
                            </div>
                        </div>
                    ))}
                    {/* Fill empty cells to keep grid shape */}
                    {Array.from({ length: Math.max(0, 48 - items.length) }).map((_, idx) => (
                        <div
                            key={`empty-${idx}`}
                            className="profile-inventory-empty-cell"
                            draggable={false}
                        />
                    ))}
                </div>
            )}
            {/* Tooltip */}
            {tooltip && (
                <div
                    className="profile-tooltip"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                    }}
                >
                    <div className="profile-tooltip-name">{tooltip.item.name}</div>
                    <div className="profile-tooltip-desc">{tooltip.item.description}</div>
                </div>
            )}
        </div>
    );
}
