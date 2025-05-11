import React, { useEffect, useState } from "react";
import { endpoint, url } from "../config/config";
import { Link } from "react-router-dom";
import Inventory from "../components/Inventory";

export interface ShopItem {
    itemId: string;
    name: string;
    description: string;
    price: number;
    stock?: number; // optionnel, si le backend le fournit,
    iconHash: string;
}

// Define the InventoryHandle interface for the ref
interface InventoryHandle {
    reload: () => void;
}

type Props = {
    userId: string;
    isMe: boolean;
    refreshKey?: number;
};

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

type ProfileProps = {
    user: string; // userId
};

function ProfileShop({ ownerId, onBuySuccess }: { ownerId: string; onBuySuccess: () => void }) {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Tooltip and prompt state
    const [tooltip, setTooltip] = useState<{ x: number; y: number; item: ShopItem } | null>(null);
    const [prompt, setPrompt] = useState<{
        message: string;
        resolve: (value: { confirmed: boolean; amount?: number }) => void;
        maxAmount?: number;
        amount?: number;
        item?: ShopItem;
    } | null>(null);
    const [promptOwnerUser, setPromptOwnerUser] = useState<any | null>(null);
    const [alert, setAlert] = useState<{ message: string } | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(endpoint + "/items", {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + (localStorage.getItem("token") || ""),
            },
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch shop items");
                return res.json();
            })
            .then(data => {
                setItems(data.filter((item: any) => item.owner === ownerId));
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [ownerId]);

    // Tooltip handlers
    const handleMouseEnter = (e: React.MouseEvent, item: ShopItem) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setTooltip({
            x: rect.right + 8,
            y: rect.top,
            item,
        });
    };
    const handleMouseLeave = () => setTooltip(null);

    // Prompt logic (adapted from Shop copy)
    const customPrompt = async (message: string, maxAmount?: number, item?: ShopItem) => {
        let ownerUser: any = null;
        if (item && (item as any).owner) {
            try {
                const res = await fetch(endpoint + "/users/" + (item as any).owner);
                if (res.ok) ownerUser = await res.json();
            } catch {}
        }
        setPrompt({ message, resolve: () => {}, maxAmount, amount: 1, item });
        setPromptOwnerUser(ownerUser);
        return new Promise<{ confirmed: boolean; amount?: number }>((resolve) => {
            setPrompt({ message, resolve, maxAmount, amount: 1, item });
            setPromptOwnerUser(ownerUser);
        });
    };

    const handlePromptResult = (confirmed: boolean) => {
        if (prompt) {
            const { amount } = prompt;
            prompt.resolve({ confirmed, amount });
            setPrompt(null);
            setPromptOwnerUser(null);
        }
    };

    const handlePromptAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(1, Math.min(Number(e.target.value), prompt?.maxAmount || Number.MAX_SAFE_INTEGER));
        setPrompt(prev => prev ? { ...prev, amount: value } : null);
    };

    // Buy logic
    const handleBuy = async (item: ShopItem) => {
        const maxAmount = item.stock ?? undefined;
        const result = await customPrompt(
            `Buy how many "${item.name}"?\nPrice: ${item.price} each${maxAmount ? `\nStock: ${maxAmount}` : ""}`,
            maxAmount,
            item
        );
        if (result.confirmed && result.amount && result.amount > 0) {
            fetch(endpoint + "/items/buy/" + item.itemId, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + (localStorage.getItem("token") || ""),
                },
                body: JSON.stringify({
                    amount: result.amount,
                }),
            })
                .then(async (res) => {
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || "Failed to buy item");
                    return data;
                })
                .then(() => {
                    // Refresh items
                    // setLoading(true);
                    fetch(endpoint + "/items", {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: "Bearer " + (localStorage.getItem("token") || ""),
                        },
                    })
                        .then(res => res.json())
                        .then(data => setItems(data.filter((item: any) => item.owner === ownerId)))
                        .finally(() => setLoading(false));
                    onBuySuccess();
                })
                .catch((err) => {
                    setAlert({ message: err.message });
                });
        }
    };

    const columns = 3;
    const minRows = 6;
    const totalItems = items.length;
    const rows = Math.max(minRows, Math.ceil(totalItems / columns));
    const totalCells = rows * columns;
    const emptyCells = totalCells - totalItems;

    if (loading) return <p>Loading shop...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;
    if (!items.length) return <p>No items created by this user.</p>;

    return (
        <div className="profile-shop-section">
            <h2 className="profile-shop-title">Shop</h2>
            <div
                className="inventory-grid"
                style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                }}
            >
                {items.map(item => (
                    <div
                        key={item.itemId}
                        className="inventory-item"
                        tabIndex={0}
                        draggable={false}
                        onMouseEnter={e => handleMouseEnter(e, item)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleBuy(item)}
                        style={{ cursor: "pointer" }}
                    >
                        <img
                            src={url + "/items-icons/" + item.iconHash}
                            alt={item.name}
                            className="inventory-item-img"
                            draggable={false}
                        />
                    </div>
                ))}
                {Array.from({ length: emptyCells }).map((_, idx) => (
                    <div
                        key={`empty-${idx}`}
                        className="inventory-item-empty"
                        draggable={false}
                    />
                ))}
            </div>
            {/* Tooltip overlay */}
            {tooltip && (
                <div className="shop-tooltip" style={{ left: tooltip.x, top: tooltip.y, position: "fixed", zIndex: 1000 }}>
                    <div className="shop-tooltip-name">{tooltip.item.name}</div>
                    <div className="shop-tooltip-desc">{tooltip.item.description}</div>
                    <div className="shop-tooltip-price">
                        Price: {tooltip.item.price}
                        <img src="./credit.png" className="shop-credit-icon" />
                        {tooltip.item.stock !== undefined && (
                            <span className="shop-tooltip-stock">
                                Stock: {tooltip.item.stock}
                            </span>
                        )}
                    </div>
                </div>
            )}
            {/* Buy prompt overlay */}
            {prompt && (
                <div className="shop-prompt-overlay">
                    <div className="shop-prompt">
                        {prompt.item && (
                            <div className="shop-prompt-item-details">
                                <img
                                    src={url + "/items-icons/" + prompt.item.iconHash}
                                    alt={prompt.item.name}
                                    className="shop-prompt-item-img"
                                />
                                <div className="shop-prompt-item-info">
                                    <div className="shop-prompt-item-name">{prompt.item.name}</div>
                                    <div className="shop-prompt-item-desc">{prompt.item.description}</div>
                                    <div className="shop-prompt-item-price">
                                        Price: {prompt.item.price}
                                        <img src="./credit.png" className="shop-credit-icon" />
                                        {prompt.item.stock !== undefined && (
                                            <span className="shop-prompt-item-stock">
                                                Stock: {prompt.item.stock}
                                            </span>
                                        )}
                                    </div>
                                    {(prompt.item as any).owner && promptOwnerUser && (
                                        <div className="shop-prompt-item-owner">
                                            Creator:{" "}
                                            <Link
                                                to={`/launcher/profile?user=${(prompt.item as any).owner}`}
                                                className="shop-prompt-owner-link"
                                            >
                                                <img
                                                    className="shop-prompt-owner-avatar"
                                                    src={url + "/avatar/" + (prompt.item as any).owner}
                                                />
                                                {promptOwnerUser.global_name || promptOwnerUser.username}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="shop-prompt-message">{prompt.message}</div>
                        {prompt.maxAmount !== 1 && (
                            <div className="shop-prompt-amount">
                                <input
                                    type="number"
                                    min={1}
                                    max={prompt.maxAmount || undefined}
                                    value={prompt.amount}
                                    onChange={handlePromptAmountChange}
                                    className="shop-prompt-amount-input"
                                />
                                {prompt.maxAmount && (
                                    <span className="shop-prompt-amount-max">/ {prompt.maxAmount}</span>
                                )}
                                {prompt.item && (
                                    <span className="shop-prompt-amount-total">
                                        Total: {(prompt.amount || 1) * (prompt.item.price || 0)}
                                        <img src="./credit.png" className="shop-credit-icon" />
                                    </span>
                                )}
                            </div>
                        )}
                        <button
                            className="shop-prompt-buy-btn"
                            onClick={() => handlePromptResult(true)}
                        >
                            Buy
                        </button>
                        <button
                            className="shop-prompt-cancel-btn"
                            onClick={() => handlePromptResult(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {/* Alert overlay */}
            {alert && (
                <div className="shop-alert-overlay">
                    <div className="shop-alert">
                        <div className="shop-alert-message">{alert.message}</div>
                        <button
                            className="shop-alert-ok-btn"
                            onClick={() => setAlert(null)}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Profile({ user }: ProfileProps) {
    const [profile, setProfile] = useState<DiscordUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCurrentUser, setIsCurrentUser] = useState(false);

    // Add a state to trigger inventory reload
    const [inventoryReloadFlag, setInventoryReloadFlag] = useState(0);

    const userId = user === "me" ? window.me.userId : user;

    useEffect(() => {
        setIsCurrentUser(user === "me");
    }, [user]);

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
    }, [userId]);

    if (loading) return <div className="container"><p>Loading profile...</p></div>;
    if (error) return <div className="container"><p style={{ color: "red" }}>{error}</p></div>;
    if (!profile) return <div className="container"><p>No profile found.</p></div>;

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
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    width: "100%",
                    gap: 0,
                }}
            >
                <div style={{ flex: "0 0 70%" }}>
                    <div className="profile-shop-section">
                        <h2 className="profile-inventory-title">Inventory</h2>
                        {/* Pass inventoryReloadFlag as a prop */}
                        <Inventory userId={userId} isMe={userId == window.me.userId} reloadFlag={inventoryReloadFlag} />
                    </div>
                </div>
                <div style={{ flex: "0 0 30%" }}>
                    {/* Increment inventoryReloadFlag after buy */}
                    <ProfileShop
                        ownerId={profile.id}
                        onBuySuccess={() => setInventoryReloadFlag(f => f + 1)}
                    />
                </div>
            </div>
        </div>
    );
}
