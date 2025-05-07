import React, { Component } from "react";
import { endpoint, url } from "../config/config";
import fetchMe from "../utils/fetchMe";
import { Link } from "react-router-dom";

interface State {
    games: any[];
    loading: boolean;
    error: string | null;
    prompt: {
        message: string;
        resolve: (value: { confirmed: boolean }) => void;
        item?: any;
    } | null;
    alert?: { message: string } | null;
}

export default class extends Component<{}, State> {
    state: State = {
        games: [],
        loading: true,
        error: null,
        prompt: null,
        alert: null,
    };

    componentDidMount() {
        this.fetchGames();
    }

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
                this.setState({ games: data, loading: false });
            })
            .catch((err) => {
                this.setState({ error: err.message, loading: false });
            });
    };

    customPrompt = async (message: string, item?: any) => {
        this.setState({ prompt: { message, resolve: () => {}, item } });
        return new Promise<{ confirmed: boolean }>((resolve) => {
            this.setState({ prompt: { message, resolve, item } });
        });
    };

    handlePromptResult = (confirmed: boolean) => {
        if (this.state.prompt) {
            this.state.prompt.resolve({ confirmed });
            this.setState({ prompt: null });
        }
    };

    handleBuyGame = async (game: any) => {
        const result = await this.customPrompt(
            `Buy "${game.name}"?\nPrice: ${game.price}`,
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
        const { loading, error, prompt, games = [] } = this.state;

        // Shop skeleton cards for loading
        const skeletons = Array.from({ length: 3 }).map((_, i) => (
            <div
                key={i}
                className="shop-game-modern-card shop-blur"
                style={{
                    width: 420,
                    background: "var(--background-medium)",
                    borderRadius: 16,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: 24,
                    border: "2px solid var(--border-color)",
                    filter: "blur(0.5px) grayscale(0.2) brightness(0.8)",
                    pointerEvents: "none",
                }}
            >
                <div style={{ position: "relative", width: "100%", height: 160, background: "#18181c" }}>
                    <div className="skeleton-banner" />
                    <div className="skeleton-icon" style={{ left: 32, bottom: -48, position: "absolute" }} />
                </div>
                <div style={{
                    padding: "56px 32px 24px 32px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    position: "relative",
                    minHeight: 160,
                }}>
                    <div className="skeleton-title" style={{ width: "60%" }} />
                    <div className="skeleton-desc" style={{ width: "90%" }} />
                    <div className="skeleton-properties" style={{ width: "40%", height: 32 }} />
                </div>
            </div>
        ));

        return (
            <div className="shop-root">
                <div className="shop-games-section" style={{ padding: 0, background: "none", border: "none", boxShadow: "none" }}>
                    {loading && (
                        <div style={{ position: "relative" }}>
                            <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "32px",
                                justifyContent: "center",
                                marginTop: 24,
                                filter: "blur(0.5px) grayscale(0.2) brightness(0.8)",
                                pointerEvents: "none",
                            }}>
                                {skeletons}
                            </div>
                            <div className="gamepage-loading-overlay">
                                <div className="inventory-loading-spinner" />
                            </div>
                        </div>
                    )}
                    {error && <div className="shop-error">{error}</div>}
                    {games.length === 0 && !loading && !error && (
                        <div className="shop-games-empty">No games available.</div>
                    )}
                    {!loading && (
                        <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "32px",
                            justifyContent: "center",
                            marginTop: 24,
                        }}>
                            {games
                                .slice()
                                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                                .map((game: any) => (
                                    <div
                                        key={game.gameId}
                                        className="shop-game-modern-card"
                                        style={{
                                            width: 420,
                                            background: "var(--background-medium)",
                                            borderRadius: 16,
                                            boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                                            overflow: "hidden",
                                            position: "relative",
                                            display: "flex",
                                            flexDirection: "column",
                                            marginBottom: 24,
                                            border: "2px solid var(--border-color)",
                                        }}
                                    >
                                        <div style={{ position: "relative", width: "100%", height: 160, background: "#18181c" }}>
                                            {game.bannerHash && (
                                                <img
                                                    src={url + "/banners-icons/" + game.bannerHash}
                                                    alt="banner"
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        opacity: 0.22,
                                                        position: "absolute",
                                                        left: 0,
                                                        top: 0,
                                                        zIndex: 0,
                                                    }}
                                                />
                                            )}
                                            <img
                                                src={url + "/games-icons/" + game.iconHash}
                                                alt={game.name}
                                                style={{
                                                    width: 96,
                                                    height: 96,
                                                    objectFit: "contain",
                                                    borderRadius: 16,
                                                    background: "#23232a",
                                                    border: "2px solid #888",
                                                    position: "absolute",
                                                    left: 32,
                                                    bottom: -48,
                                                    zIndex: 2,
                                                    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                                                }}
                                            />
                                        </div>
                                        <div style={{
                                            padding: "56px 32px 24px 32px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 8,
                                            position: "relative",
                                            minHeight: 160,
                                        }}>
                                            <div style={{
                                                fontSize: 22,
                                                fontWeight: 700,
                                                marginBottom: 4,
                                                color: "var(--text-color-primary)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}>
                                                <Link
                                                    to={`/game?gameId=${game.gameId}`}
                                                    className="shop-game-link"
                                                    style={{ color: "white", textDecoration: "none" }}
                                                >
                                                    {game.name}
                                                </Link>
                                                <span style={{
                                                    fontSize: 15,
                                                    color: "var(--text-color-secondary)",
                                                    fontWeight: 400,
                                                    marginLeft: 8,
                                                }}>
                                                    {game.genre}
                                                </span>
                                            </div>
                                            <div style={{
                                                color: "var(--text-color-secondary)",
                                                fontSize: 15,
                                                marginBottom: 6,
                                                minHeight: 38,
                                                maxHeight: 38,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}>
                                                {game.description}
                                            </div>
                                            <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 18,
                                                marginTop: 8,
                                                marginBottom: 8,
                                            }}>
                                                <div style={{
                                                    color: "var(--gold-color)",
                                                    fontWeight: 700,
                                                    fontSize: 18,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                }}>
                                                    {game.price}
                                                    <img src="./credit.png" className="shop-credit-icon" alt="credits" />
                                                </div>
                                                <div style={{
                                                    color: "var(--text-color-secondary)",
                                                    fontSize: 15,
                                                }}>
                                                    Rating: {game.rating ?? "N/A"}
                                                </div>
                                            </div>
                                            <div style={{
                                                display: "flex",
                                                gap: 12,
                                                marginTop: 12,
                                            }}>
                                                <button
                                                    className="shop-game-buy-btn"
                                                    style={{
                                                        padding: "10px 32px",
                                                        fontSize: 16,
                                                        borderRadius: 8,
                                                        fontWeight: 700,
                                                        background: "#4caf50",
                                                        color: "var(--text-color-primary)",
                                                        border: "none",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => this.handleBuyGame(game)}
                                                >
                                                    Buy
                                                </button>
                                                <Link
                                                    to={`/launcher/game?gameId=${game.gameId}`}
                                                    className="shop-game-view-btn"
                                                    style={{
                                                        padding: "10px 32px",
                                                        fontSize: 16,
                                                        borderRadius: 8,
                                                        fontWeight: 700,
                                                        background: "#1976d2",
                                                        color: "var(--text-color-primary)",
                                                        textDecoration: "none",
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
                {/* Prompt overlay for games */}
                {prompt && (
                    <div className="shop-prompt-overlay">
                        <div className="shop-prompt">
                            <div className="shop-prompt-message">{prompt.message}</div>
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
                {/* Alert overlay */}
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