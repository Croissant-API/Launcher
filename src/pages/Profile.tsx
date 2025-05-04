import React, { useEffect, useState } from "react";
import { endpoint, url } from "../config/config";
import { Link } from "react-router-dom";

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
            <div className="container" style={{ maxWidth: 500, margin: "40px auto", padding: 32, background: "#232323", borderRadius: 12, color: "#fff", border: "2px solid #bcbcbc" }}>
                <button
                    onClick={handleBackToInventory}
                    style={{
                        marginBottom: 24,
                        padding: "8px 20px",
                        background: "#bcbcbc",
                        color: "#232323",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 16,
                    }}
                >
                    ← Back to Inventory
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <img
                        src={url + "/items-icons/" + selectedItem.itemId + ".png"}
                        alt={selectedItem.name}
                        style={{
                            width: 96,
                            height: 96,
                            objectFit: "contain",
                            imageRendering: "pixelated",
                            background: "#1a1a1a",
                            borderRadius: 8,
                            border: "2px solid #888",
                        }}
                    />
                    <div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{selectedItem.name}</div>
                        <div style={{ color: "#bcbcbc", marginBottom: 16 }}>{selectedItem.description}</div>
                        <div style={{ fontWeight: 600, fontSize: 18 }}>Quantity: x{selectedItem.amount}</div>
                        {selectedItem.price !== undefined && (
                            <div style={{ color: "#bcbcbc", marginTop: 8 }}>Price: {selectedItem.price}</div>
                        )}
                        {selectedItem.owner && ownerUser && (
                            <div style={{ color: "#bcbcbc", marginTop: 8 }}>
                                Creator:{" "}
                                <Link
                                    to={`/profile/${selectedItem.owner}`}
                                    style={{
                                        color: "white",
                                        textDecoration: "underline",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                    }}
                                >
                                    <img style={{
                                        width: 24,
                                        position: "relative",
                                        borderRadius: "50%",
                                        marginRight: 8,
                                        top: 6,
                                    }} src={url + "/avatar/" + selectedItem.owner }/>
                                    {ownerUser.global_name || ownerUser.username}
                                </Link>
                            </div>
                        )}
                        {selectedItem.showInStore !== undefined && (
                            <div style={{ color: "#bcbcbc", marginTop: 8 }}>
                                Show in Store: {selectedItem.showInStore ? "Yes" : "No"}
                            </div>
                        )}
                        {selectedItem.deleted !== undefined && (
                            <div style={{ color: "#bcbcbc", marginTop: 8 }}>
                                Deleted: {selectedItem.deleted ? "Yes" : "No"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
                <img
                    src={
                        profile.avatar
                            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`
                            : "https://cdn.discordapp.com/embed/avatars/0.png"
                    }
                    alt={profile.username}
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: "50%",
                        border: "3px solid #bcbcbc",
                        background: "#232323",
                        objectFit: "cover",
                    }}
                />
                <div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>
                        {profile.global_name || profile.username}
                    </div>
                </div>
            </div>
            <h2 style={{ marginBottom: 12 }}>Inventory</h2>
            {inventoryLoading ? (
                <p>Loading inventory...</p>
            ) : (
                <div
                    style={{
                        width: "100%",
                        maxWidth: 900,
                        minHeight: 6 * 20,
                        maxHeight: 6 * 74,
                        overflowY: items.length > 48 ? "auto" : "hidden",
                        display: "grid",
                        gridTemplateColumns: `repeat(8, 1fr)`,
                        gap: 8,
                        padding: 16,
                        background: "#222",
                        border: "4px solid #bcbcbc",
                        borderRadius: 8,
                    }}
                >
                    {items.length === 0 && (
                        <div style={{ gridColumn: "span 8", color: "#bcbcbc", textAlign: "center" }}>
                            No items in inventory.
                        </div>
                    )}
                    {items.map(item => (
                        <div
                            key={item.itemId}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                background: "#1a1a1a",
                                borderRadius: 4,
                                padding: 8,
                                position: "relative",
                                minHeight: 64,
                                userSelect: "none",
                                cursor: "pointer",
                            }}
                            onMouseEnter={e => handleMouseEnter(e, item)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleItemClick(item)}
                        >
                            <img
                                src={url + "/items-icons/" + item.itemId + ".png"}
                                alt={item.name}
                                style={{
                                    width: 48,
                                    height: 48,
                                    objectFit: "contain",
                                    marginBottom: 4,
                                    imageRendering: "pixelated",
                                    pointerEvents: "none",
                                    userSelect: "none",
                                }}
                                draggable={false}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: 6,
                                    right: 8,
                                    background: "rgba(0,0,0,0.7)",
                                    borderRadius: 6,
                                    padding: "2px 6px",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#fff",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                    pointerEvents: "none",
                                    userSelect: "none",
                                }}
                            >
                                x{item.amount}
                            </div>
                        </div>
                    ))}
                    {/* Fill empty cells to keep grid shape */}
                    {Array.from({ length: Math.max(0, 48 - items.length) }).map((_, idx) => (
                        <div
                            key={`empty-${idx}`}
                            style={{
                                background: "#1a1a1a",
                                borderRadius: 4,
                                minHeight: 64,
                            }}
                            draggable={false}
                        />
                    ))}
                </div>
            )}
            {/* Tooltip */}
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
                </div>
            )}
        </div>
    );
}
