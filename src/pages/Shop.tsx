import React, { Component } from "react";
import { endpoint, url } from "../config/config";
import fetchMe from "../utils/fetchMe";
import { Link } from "react-router-dom";
import "../styles/Shop.css"; // Ajout de l'import du CSS

export interface ShopItem {
    itemId: string;
    name: string;
    description: string;
    price: number;
    stock?: number; // optionnel, si le backend le fournit,
    iconHash: string;
}

interface State {
    items: ShopItem[];
    loading: boolean;
    error: string | null;
    tooltip: { x: number; y: number; item: ShopItem } | null;
    prompt: {
        message: string;
        resolve: (value: { confirmed: boolean; amount?: number }) => void;
        maxAmount?: number;
        amount?: number;
        item?: ShopItem;
    } | null;
    promptOwnerUser?: any | null;
    games: any[];
    alert?: { message: string } | null;
}

export default class extends Component<{}, State> {
    state: State = {
        items: [],
        loading: true,
        error: null,
        tooltip: null,
        prompt: null,
        promptOwnerUser: null,
        games: [],
        alert: null,
    };

    componentDidMount() {
        this.fetchShopItems();
        this.fetchGames();
    }

    fetchShopItems = () => {
        fetch(endpoint + "/items", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token") || "",
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch shop items");
                return res.json();
            })
            .then((data) => {
                this.setState({ items: data, loading: false });
            })
            .catch((err) => {
                this.setState({ error: err.message, loading: false });
            });
        fetchMe(() => {
            document.getElementById("my-balance")!.innerText = window.me.balance.toString();
        });
    };

    fetchGames = () => {
        fetch(endpoint + "/games", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token") || "",
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch games");
                return res.json();
            })
            .then((data) => {
                this.setState({ games: data });
            })
            .catch((err) => {
                // Optionnel : afficher une erreur pour les jeux
            });
    };

    handleMouseEnter = (e: React.MouseEvent, item: ShopItem) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        this.setState({
            tooltip: {
                x: rect.right + 8,
                y: rect.top,
                item,
            },
        });
    };

    handleMouseLeave = () => {
        this.setState({ tooltip: null });
    };

    customPrompt = async (message: string, maxAmount?: number, item?: ShopItem) => {
        let ownerUser: any = null;
        if (item && (item as any).owner) {
            try {
                const res = await fetch(endpoint + "/users/" + (item as any).owner);
                if (res.ok) ownerUser = await res.json();
            } catch {}
        }
        this.setState({ prompt: { message, resolve: () => {}, maxAmount, amount: 1, item }, promptOwnerUser: ownerUser });
        return new Promise<{ confirmed: boolean; amount?: number }>((resolve) => {
            this.setState({ prompt: { message, resolve, maxAmount, amount: 1, item }, promptOwnerUser: ownerUser });
        });
    };

    handlePromptResult = (confirmed: boolean) => {
        if (this.state.prompt) {
            const { amount } = this.state.prompt;
            this.state.prompt.resolve({ confirmed, amount });
            this.setState({ prompt: null, promptOwnerUser: null });
        }
    };

    handlePromptAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(1, Math.min(Number(e.target.value), this.state.prompt?.maxAmount || Number.MAX_SAFE_INTEGER));
        this.setState((prev) => ({
            prompt: prev.prompt ? { ...prev.prompt, amount: value } : null,
        }));
    };

    handleBuy = async (item: ShopItem) => {
        const maxAmount = item.stock ?? undefined;
        const result = await this.customPrompt(
            `Buy how many "${item.name}"?\nPrice: ${item.price} each${maxAmount ? `\nStock: ${maxAmount}` : ""}`,
            maxAmount,
            item
        );
        if (result.confirmed && result.amount && result.amount > 0) {
            fetch(endpoint + "/items/buy/" + item.itemId, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + localStorage.getItem("token") || "",
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
                    this.fetchShopItems();
                    fetchMe(() => {
                        document.getElementById("my-balance")!.innerText = window.me.balance.toString();
                    });
                })
                .catch((err) => {
                    this.setState({ alert: { message: err.message } });
                });
        }
    };

    handleBuyGame = async (game: any) => {
        const result = await this.customPrompt(
            `Buy "${game.name}"?\nPrice: ${game.price}`,
            1,
            game
        );
        if (result.confirmed) {
            fetch(endpoint + "/games/" + game.gameId + "/buy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + localStorage.getItem("token") || "",
                },
            })
                .then(async (res) => {
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || "Failed to buy game");
                    return data;
                })
                .then(() => {
                    this.fetchGames();
                    fetchMe(() => {
                        document.getElementById("my-balance")!.innerText = window.me.balance.toString();
                    });
                })
                .catch((err) => {
                    this.setState({ alert: { message: err.message } });
                });
        }
    };

    render(): React.ReactNode {
        const { items, loading, error, tooltip, prompt, games = [] } = this.state;
        const columns = 4;
        const minRows = 4;
        const totalItems = items.length;
        const rows = Math.max(minRows, Math.ceil(totalItems / columns));
        const totalCells = rows * columns;
        const emptyCells = totalCells - totalItems;

        return (
            <div className="shop-root">
                <h1 className="shop-title">Shop</h1>
                <div className="shop-sections">
                    <div className="shop-items-section">
                        <h2 className="shop-section-title">Items</h2>
                        {loading && <p className="shop-loading">Loading...</p>}
                        {error && <p className="shop-error">{error}</p>}
                        {!loading && !error && (
                            <div
                                className="shop-items-grid"
                                style={{
                                    gridTemplateColumns: `repeat(${columns}, 120px)`,
                                }}
                            >
                                {items.filter((i) => i.itemId).map((item) => (
                                    <div
                                        key={item.itemId}
                                        className="shop-item-card"
                                        tabIndex={0}
                                        draggable={false}
                                        onMouseEnter={(e) => this.handleMouseEnter(e, item)}
                                        onMouseLeave={this.handleMouseLeave}
                                        onClick={() => this.handleBuy(item)}
                                    >
                                        <img
                                            src={url + "/items-icons/" + item.iconHash}
                                            alt={item.name}
                                            className="shop-item-img"
                                            draggable={false}
                                        />
                                        <div className="shop-item-name">{item.name}</div>
                                        <div className="shop-item-price">
                                            {item.price}
                                            <img src="./credit.png" className="shop-credit-icon" />
                                        </div>
                                        {item.stock !== undefined && (
                                            <div className="shop-item-stock">Stock: {item.stock}</div>
                                        )}
                                    </div>
                                ))}
                                {Array.from({ length: emptyCells }).map((_, idx) => (
                                    <div
                                        key={`empty-${idx}`}
                                        className="shop-item-empty"
                                        draggable={false}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="shop-games-section">
                        <h2 className="shop-section-title">Games</h2>
                        {games.length === 0 ? (
                            <div className="shop-games-empty">No games available.</div>
                        ) : (
                            <ul className="shop-games-list">
                                {games
                                    .slice()
                                    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                                    .map((game: any) => (
                                        <li
                                            key={game.gameId}
                                            className="shop-game-card"
                                        >
                                            {game.bannerHash && (
                                                <img
                                                    src={url + "/banners-icons/" + game.bannerHash}
                                                    alt="banner"
                                                    className="shop-game-banner"
                                                />
                                            )}
                                            <img
                                                src={url + "/games-icons/" + game.iconHash}
                                                alt={game.name}
                                                className="shop-game-icon"
                                            />
                                            <div className="shop-game-info">
                                                <div className="shop-game-name">
                                                    <Link
                                                        to={`/game/${game.gameId}`}
                                                        className="shop-game-link"
                                                    >
                                                        {game.name}
                                                    </Link>
                                                </div>
                                                <div className="shop-game-desc">{game.description}</div>
                                                <div className="shop-game-price">
                                                    Price: {game.price}
                                                    <img src="./credit.png" className="shop-credit-icon" />
                                                </div>
                                                <div className="shop-game-rating">
                                                    Rating: {game.rating ?? "N/A"}
                                                </div>
                                            </div>
                                            <button
                                                className="shop-game-buy-btn"
                                                onClick={() => this.handleBuyGame(game)}
                                            >
                                                Buy
                                            </button>
                                            <Link
                                                to={`/game/${game.gameId}`}
                                                className="shop-game-view-btn"
                                            >
                                                View
                                            </Link>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>
                {tooltip && (
                    <div className="shop-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
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
                {prompt && (
                    <div className="shop-prompt-overlay">
                        <div className="shop-prompt">
                            {prompt.item && (
                                <div className="shop-prompt-item-details">
                                    <img
                                        src={url + "/items-icons/" + prompt.item.itemId + ".png"}
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
                                        {(prompt.item as any).owner && this.state.promptOwnerUser && (
                                            <div className="shop-prompt-item-owner">
                                                Creator:{" "}
                                                <Link
                                                    to={`/profile?user=${(prompt.item as any).owner}`}
                                                    className="shop-prompt-owner-link"
                                                >
                                                    <img
                                                        className="shop-prompt-owner-avatar"
                                                        src={url + "/avatar/" + (prompt.item as any).owner}
                                                    />
                                                    {this.state.promptOwnerUser.global_name || this.state.promptOwnerUser.username}
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
                                        onChange={this.handlePromptAmountChange}
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
                                onClick={() => this.handlePromptResult(true)}
                            >
                                Buy
                            </button>
                            <button
                                className="shop-prompt-cancel-btn"
                                onClick={() => this.handlePromptResult(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                {this.state.alert && (
                    <div className="shop-alert-overlay">
                        <div className="shop-alert">
                            <div className="shop-alert-message">{this.state.alert.message}</div>
                            <button
                                className="shop-alert-ok-btn"
                                onClick={() => this.setState({ alert: null })}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}