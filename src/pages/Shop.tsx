import React, { Component } from "react";
import { endpoint, url } from "../config/config";
import fetchMe from "../utils/fetchMe";
import { Link } from "react-router-dom";

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
        const { loading, error, tooltip, prompt, games = [] } = this.state;

        return (
            <div className="shop-root">
                <h1 className="shop-title">Shop</h1>
                <div className="shop-sections">
                    {/* Items section removed for cleaner shop, only games are shown */}
                    {/* 
                    <div className="shop-items-section">
                        ...existing items code...
                    </div>
                    */}
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
                                                        to={`/game?gameId=${game.gameId}`}
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
                                                to={`/game?gameId=${game.gameId}`}
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
                {/* Tooltip and prompt logic can be kept or removed if only relevant to items */}
                {/* {tooltip && ...} */}
                {/* {prompt && ...} */}
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