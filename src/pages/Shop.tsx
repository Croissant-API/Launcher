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
    promptOwnerUser?: any | null; // <-- Add this line
    games: any[]; // Ajouté pour la liste des jeux
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
        games: [], // Ajouté pour la liste des jeux
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
                const res = await fetch(endpoint +"/users/" + (item as any).owner);
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
            this.setState({ prompt: null, promptOwnerUser: null }); // clear owner
        }
    };

    handlePromptAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(1, Math.min(Number(e.target.value), this.state.prompt?.maxAmount || Number.MAX_SAFE_INTEGER));
        this.setState(prev => ({
            prompt: prev.prompt ? { ...prev.prompt, amount: value } : null
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
        const columns = 4; // Fewer columns for a shop look
        const minRows = 4;
        const totalItems = items.length;
        const rows = Math.max(minRows, Math.ceil(totalItems / columns));
        const totalCells = rows * columns;
        const emptyCells = totalCells - totalItems;

        return (
            <div style={{ padding: "32px 0", verticalAlign: "middle", background: "#121212" }}>
                <h1 style={{ textAlign: "center", color: "#fff", marginBottom: 32 }}>Shop</h1>
                <div style={{
                    display: "flex",
                    gap: 32,
                    alignItems: "flex-start",
                    justifyContent: "center",
                    maxWidth: 1600,
                    margin: "0 auto",
                    width: "90vw", // Ajouté ici
                    minWidth: 600, // Ajouté ici
                }}>
                    {/* Section Items */}
                    <div style={{
                        flex: 1,
                        minWidth: 320,
                        // maxWidth: 400,
                        maxHeight: "60vh",
                        background: "#232323",
                        borderRadius: 12,
                        padding: 24,
                        color: "#fff",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                        border: "2px solid #bcbcbc",
                        overflowY: "scroll",
                        height: "fit-content"
                    }}>
                        <h2 style={{ color: "#fff", marginBottom: 16 }}>Items</h2>
                        {loading && <p style={{ textAlign: "center", color: "#fff" }}>Loading...</p>}
                        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
                        {!loading && !error && (
                            <div
                                style={{
                                    margin: "0 auto",
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${columns}, 120px)`,
                                    gap: 18,
                                    justifyContent: "center",
                                }}
                            >
                                {items.filter(i=>i.itemId).map((item) => (
                                    <div
                                        key={item.itemId}
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
                                        }}
                                        tabIndex={0}
                                        draggable={false}
                                        onMouseEnter={(e) => this.handleMouseEnter(e, item)}
                                        onMouseLeave={this.handleMouseLeave}
                                        onClick={() => this.handleBuy(item)}
                                    >
                                        <img
                                            src={url + "/items-icons/" + item.iconHash}
                                            alt={item.name}
                                            style={{
                                                width: 64,
                                                height: 64,
                                                objectFit: "contain",
                                                marginBottom: 8,
                                                imageRendering: "pixelated",
                                                pointerEvents: "none",
                                                userSelect: "none",
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
                                        {item.stock !== undefined && (
                                            <div style={{
                                                color: "#bcbcbc",
                                                fontSize: 13,
                                                textAlign: "center"
                                            }}>Stock: {item.stock}</div>
                                        )}
                                    </div>
                                ))}
                                {Array.from({ length: emptyCells }).map((_, idx) => (
                                    <div
                                        key={`empty-${idx}`}
                                        style={{
                                            background: "none",
                                            borderRadius: 8,
                                            minHeight: 100,
                                        }}
                                        draggable={false}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Section Jeux */}
                    <div style={{
                        flex: 1,
                        minWidth: 320,
                        // maxWidth: 400,
                        maxHeight: "60vh",
                        background: "#232323",
                        borderRadius: 12,
                        padding: 24,
                        color: "#fff",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                        border: "2px solid #bcbcbc",
                        overflowY: "scroll",
                        height: "fit-content"
                    }}>
                        <h2 style={{ color: "#fff", marginBottom: 16 }}>Games</h2>
                        {games.length === 0 ? (
                            <div style={{ color: "#bcbcbc" }}>No games available.</div>
                        ) : (
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                {games
                                    .slice() // pour ne pas muter le state
                                    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                                    .map((game: any) => (
                                    <li
                                        key={game.gameId}
                                        style={{
                                            marginBottom: 18,
                                            padding: 0,
                                            background: "#181818",
                                            borderRadius: 8,
                                            border: "1px solid #444",
                                            boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                                            position: "relative",
                                            overflow: "hidden",
                                            minHeight: 120,
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        {/* Banner as background */}
                                        {game.bannerHash && (
                                            <img
                                                src={url + "/banners-icons/" + game.bannerHash}
                                                alt="banner"
                                                style={{
                                                    position: "absolute",
                                                    left: 0,
                                                    top: 0,
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    opacity: 0.18,
                                                    zIndex: 0,
                                                    pointerEvents: "none",
                                                }}
                                            />
                                        )}
                                        {/* Game icon at the side */}
                                        <img
                                            src={url + "/games-icons/" + game.iconHash}
                                            alt={game.name}
                                            style={{
                                                width: 64,
                                                height: 64,
                                                objectFit: "contain",
                                                borderRadius: 8,
                                                margin: "0 20px",
                                                background: "#222",
                                                zIndex: 1,
                                            }}
                                        />
                                        {/* Game info */}
                                        <div style={{ zIndex: 1, flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{game.name}</div>
                                            <div style={{ color: "#bcbcbc", marginBottom: 6 }}>{game.description}</div>
                                            <div style={{ color: "#ffd700", fontWeight: 700 }}>
                                                Price: {game.price}
                                                <img src="./credit.png" style={{ width: '18px', height: '18px', position: 'relative', marginLeft: '4px', top: '4px' }} />
                                            </div>
                                            <div style={{ color: "#bcbcbc", marginTop: 4 }}>
                                                Rating: {game.rating ?? "N/A"}
                                            </div>
                                        </div>
                                        {/* Buy button */}
                                        <button
                                            style={{
                                                marginRight: 24,
                                                padding: "8px 20px",
                                                background: "#4caf50",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 4,
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                fontSize: 15,
                                                zIndex: 2,
                                            }}
                                            onClick={() => this.handleBuyGame(game)}
                                        >
                                            Buy
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                {/* Tooltip et Prompt inchangés */}
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
                            {tooltip.item.stock !== undefined && (
                                <span style={{ color: "#bcbcbc", marginLeft: 8 }}>
                                    Stock: {tooltip.item.stock}
                                </span>
                            )}
                        </div>
                    </div>
                )}
                {prompt && (
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
                        <div
                            style={{
                                background: "#232323",
                                border: "1px solid #888",
                                borderRadius: 8,
                                padding: 32,
                                minWidth: 300,
                                color: "#fff",
                                boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                                textAlign: "center",
                            }}
                        >
                            {/* Item details at the top */}
                            {prompt.item && (
                                <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
                                    <img
                                        src={url + "/items-icons/" + prompt.item.itemId + ".png"}
                                        alt={prompt.item.name}
                                        style={{
                                            width: 64,
                                            height: 64,
                                            objectFit: "contain",
                                            imageRendering: "pixelated",
                                            background: "#1a1a1a",
                                            borderRadius: 8,
                                            border: "2px solid #888",
                                        }}
                                    />
                                    <div style={{ textAlign: "left" }}>
                                        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{prompt.item.name}</div>
                                        <div style={{ color: "#bcbcbc", marginBottom: 8 }}>{prompt.item.description}</div>
                                        <div style={{ color: "#ffd700", fontWeight: 700 }}>
                                            Price: {prompt.item.price}<img src="./credit.png" style={{width: '18px', height: '18px', position: 'relative', marginLeft: '4px', top: '4px'}}/>
                                            {prompt.item.stock !== undefined && (
                                                <span style={{ color: "#bcbcbc", marginLeft: 8 }}>
                                                    Stock: {prompt.item.stock}
                                                </span>
                                            )}
                                        </div>
                                        {/* Owner info */}
                                        {(prompt.item as any).owner && this.state.promptOwnerUser && (
                                            <div style={{ color: "#bcbcbc", marginTop: 8 }}>
                                                Creator:{" "}
                                                <Link
                                                    to={`/profile?user=${(prompt.item as any).owner}`}
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
                                                    }} src={url + "/avatar/" + (prompt.item as any).owner }/>
                                                    {this.state.promptOwnerUser.global_name || this.state.promptOwnerUser.username}
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div style={{ marginBottom: 24, fontSize: 18 }}>{prompt.message}</div>
                            {prompt.maxAmount !== 1 && (
                                <div style={{ marginBottom: 24 }}>
                                    <input
                                        type="number"
                                        min={1}
                                        max={prompt.maxAmount || undefined}
                                        value={prompt.amount}
                                        onChange={this.handlePromptAmountChange}
                                        style={{
                                            width: 80,
                                            fontSize: 16,
                                            padding: "4px 8px",
                                            borderRadius: 4,
                                            border: "1px solid #888",
                                            marginRight: 8,
                                            textAlign: "center",
                                        }}
                                    />
                                    {prompt.maxAmount && (
                                        <span style={{ color: "#bcbcbc" }}>/ {prompt.maxAmount}</span>
                                    )}
                                    {prompt.item && (
                                        <span style={{ color: "#ffd700", marginLeft: 8 }}>
                                            Total: {(prompt.amount || 1) * (prompt.item.price || 0)}<img src="./credit.png" style={{width: '18px', height: '18px', position: 'relative', marginLeft: '4px', top: '4px'}}/>
                                        </span>
                                    )}
                                </div>
                            )}
                            <button
                                style={{
                                    marginRight: 16,
                                    padding: "8px 24px",
                                    background: "#4caf50",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 4,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontSize: 16,
                                }}
                                onClick={() => this.handlePromptResult(true)}
                            >
                                Buy
                            </button>
                            <button
                                style={{
                                    padding: "8px 24px",
                                    background: "#f44336",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 4,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontSize: 16,
                                }}
                                onClick={() => this.handlePromptResult(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                {this.state.alert && (
                    <div
                        style={{
                            position: "fixed",
                            left: 0,
                            top: 0,
                            width: "100vw",
                            height: "100vh",
                            background: "rgba(0,0,0,0.5)",
                            zIndex: 4000,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <div
                            style={{
                                background: "#232323",
                                border: "1px solid #888",
                                borderRadius: 8,
                                padding: 32,
                                minWidth: 300,
                                color: "#fff",
                                boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                                textAlign: "center",
                            }}
                        >
                            <div style={{ fontSize: 18, marginBottom: 24 }}>{this.state.alert.message}</div>
                            <button
                                style={{
                                    padding: "8px 24px",
                                    background: "#4caf50",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 4,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontSize: 16,
                                }}
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