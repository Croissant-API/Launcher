import React, { Component } from "react";
import { Link } from "react-router-dom";
import { endpoint, url } from "../config/config";
import fetchMe from "../utils/fetchMe";

export interface Inventory {
    user_id: string;
    inventory: InventoryItem[];
}

export interface InventoryItem {
    user_id: string;
    item_id: string;
    amount: number;
}

export interface Item {
    iconHash: string;
    itemId: string;
    name: string;
    description: string;
    amount: number;
    price?: number;
    owner?: string;
    showInStore?: boolean;
    deleted?: boolean;
}

interface State {
    items: Item[];
    loading: boolean;
    error: string | null;
    hoveredItemId: string | null;
    tooltip: { x: number; y: number; item: Item } | null;
    contextMenu: { x: number; y: number; item: Item } | null;
    prompt: { 
        message: string; 
        resolve: (value: { confirmed: boolean, amount?: number }) => void; 
        maxAmount?: number;
        amount?: number;
    } | null;
    selectedItem?: Item | null;
    ownerUser?: any | null; // Add this line
}

export default class extends Component<{}, State> {
    state: State = {
        items: [],
        loading: true,
        error: null,
        hoveredItemId: null,
        tooltip: null,
        contextMenu: null,
        prompt: null,
        selectedItem: null,
    };

    componentDidMount() {
        this.refreshInventory();
        window.addEventListener("click", this.handleGlobalClick);
    }

    refreshInventory = () => {
        fetch(endpoint + "/inventory/@me", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token") || "",
            },
        })
        .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch inventory");
            return res.json();
        })
        .then((data) => {
            this.setState({ items: [...data] , loading: false });
        })
        .catch((err) => {
            this.setState({ error: err.message, loading: false });
        });
        fetchMe(() => {
            console.log("Fetched inventory for user: " + window.me.userId);
            document.getElementById("my-balance")!.innerText = window.me.balance.toString();
        });
    }


    componentWillUnmount() {
        window.removeEventListener("click", this.handleGlobalClick);
    }

    handleGlobalClick = () => {
        if (this.state.contextMenu) {
            this.setState({ contextMenu: null });
        }
    };

    handleMouseEnter = (e: React.MouseEvent, item: Item) => {
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

    handleContextMenu = (e: React.MouseEvent, item: Item) => {
        e.preventDefault();
        this.setState({
            contextMenu: {
                x: e.clientX,
                y: e.clientY,
                item,
            },
        });
    };

    customPrompt = (message: string, maxAmount?: number) => {
        this.setState({ contextMenu: null });
        return new Promise<{ confirmed: boolean, amount?: number }>((resolve) => {
            this.setState({ prompt: { message, resolve, maxAmount, amount: 1 } });
        });
    };

    handlePromptResult = (confirmed: boolean) => {
        if (this.state.prompt) {
            const { amount } = this.state.prompt;
            this.state.prompt.resolve({ confirmed, amount });
            this.setState({ prompt: null });
        }
    };

    handlePromptAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(1, Math.min(Number(e.target.value), this.state.prompt?.maxAmount || 1));
        this.setState(prev => ({
            prompt: prev.prompt ? { ...prev.prompt, amount: value } : null
        }));
    };

    handleSell = async (item: Item) => {
        const result = await this.customPrompt(`Sell how many "${item.name}"?`, item.amount);
        if (result.confirmed && result.amount && result.amount > 0) {
            fetch(endpoint + "/items/sell/" + item.itemId, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + localStorage.getItem("token") || "",
                },
                body: JSON.stringify({
                    amount: result.amount,
                })
            })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to sell item");
                return data;
            })
            .then(() => {
                this.setState({ contextMenu: null });
                this.refreshInventory();
            })
            .catch((err) => {
                this.setState({ error: err.message });
            });
        }
    };

    handleDrop = async (item: Item) => {
        const result = await this.customPrompt(`Drop how many "${item.name}"?`, item.amount);
        if (result.confirmed && result.amount && result.amount > 0) {
            fetch(endpoint + "/items/drop/" + item.itemId, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + localStorage.getItem("token") || "",
                },
                body: JSON.stringify({
                    amount: result.amount,
                })
            })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to drop item");
                return data;
            })
            .then(() => {
                this.setState({ contextMenu: null });
                this.refreshInventory();
            })
            .catch((err) => {
                this.setState({ error: err.message });
            });
        }
    };

    handleItemClick = async (item: Item) => {
        try {
            const res = await fetch(`${endpoint}/items/${item.itemId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + (localStorage.getItem("token") || ""),
                },
            });
            if (!res.ok) throw new Error("Failed to fetch item details");
            const details = await res.json();
    
            let ownerUser = null;
            if (details.owner) {
                const userRes = await fetch(endpoint + "/users/" + details.owner);
                if (userRes.ok) {
                    ownerUser = await userRes.json();
                }
            }
    
            this.setState({
                selectedItem: {
                    ...item,
                    ...details,
                    amount: item.amount,
                },
                ownerUser,
                tooltip: null,
                contextMenu: null,
            });
        } catch (e) {
            this.setState({
                selectedItem: item,
                ownerUser: null,
                tooltip: null,
                contextMenu: null,
            });
        }
    };

    handleBackToInventory = () => {
        this.setState({ selectedItem: null, ownerUser: null });
    };

    render(): React.ReactNode {
        const { items, loading, error, tooltip, contextMenu, prompt, selectedItem } = this.state;
        const columns = 8;
        const minRows = 6;
        const totalItems = items.length;
        const rows = Math.max(minRows, Math.ceil(totalItems / columns));
        const totalCells = rows * columns;
        const emptyCells = totalCells - totalItems;

        if (selectedItem) {
            return (
                <div className="container" style={{ maxWidth: 500, margin: "40px auto", padding: 32, background: "#232323", borderRadius: 12, color: "#fff", border: "2px solid #bcbcbc" }}>
                    <button
                        onClick={this.handleBackToInventory}
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
                            src={url + "/items-icons/" + selectedItem.iconHash}
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
                                <div style={{ color: "#bcbcbc", marginTop: 8 }}>Price: {selectedItem.price} <img src="./credit.png" style={{
                                    width: "18px",
                                    position: "relative",
                                    top: "4px",
                                    marginLeft: "4px"
                                }}/></div>
                            )}
                            {selectedItem.owner && this.state.ownerUser && (
                                <div style={{ color: "#bcbcbc", marginTop: 8 }}>
                                    Creator:{" "}
                                    <Link
                                        to={`/profile?user=${selectedItem.owner}`}
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
                                        {this.state.ownerUser.global_name || this.state.ownerUser.username}
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
            <div className="container" style={{ maxWidth: 900, margin: "0 auto", position: "relative" }}>
                <h1>Inventory</h1>
                {loading && <p>Loading...</p>}
                {error && <p style={{ color: "red" }}>{error}</p>}
                {!loading && !error && (
                    <div
                        style={{
                            width: "100%",
                            maxWidth: 900,
                            minHeight: minRows * 20,
                            maxHeight: minRows * 74,
                            overflowY: rows > minRows ? "auto" : "hidden",
                            display: "grid",
                            gridTemplateColumns: `repeat(${columns}, 1fr)`,
                            gap: 8,
                            padding: 16,
                            background: "#222",
                            border: "4px solid #bcbcbc",
                            borderRadius: 8,
                        }}
                    >
                        {items.map((item) => (
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
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}
                                tabIndex={0}
                                draggable={false}
                                onMouseEnter={(e) => this.handleMouseEnter(e, item)}
                                onMouseLeave={this.handleMouseLeave}
                                onContextMenu={(e) => this.handleContextMenu(e, item)}
                                onClick={() => this.handleItemClick(item)}
                            >
                                <>
                                    <img
                                        src={url + "/items-icons/" + item.iconHash}
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
                                </>
                            </div>
                        ))}
                        {Array.from({ length: emptyCells }).map((_, idx) => (
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

                {contextMenu && (
                    <div
                        style={{
                            position: "fixed",
                            left: contextMenu.x,
                            top: contextMenu.y,
                            background: "#232323",
                            border: "1px solid #888",
                            borderRadius: 6,
                            zIndex: 2000,
                            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
                            minWidth: 120,
                            padding: "4px 0",
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                                color: "#fff",
                                fontWeight: 500,
                                borderBottom: "1px solid #444",
                                userSelect: "none",
                            }}
                            onClick={() => this.handleSell(contextMenu.item)}
                        >
                            Sell
                        </div>
                        <div
                            style={{
                                padding: "8px 16px",
                                cursor: "pointer",
                                color: "#ff4444",
                                fontWeight: 700,
                                userSelect: "none",
                            }}
                            onClick={() => this.handleDrop(contextMenu.item)}
                        >
                            Drop
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
                            <div style={{ marginBottom: 24, fontSize: 18 }}>{prompt.message}</div>
                            {prompt.maxAmount && (
                                <div style={{ marginBottom: 24 }}>
                                    <input
                                        type="number"
                                        min={1}
                                        max={prompt.maxAmount}
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
                                    <span style={{ color: "#bcbcbc" }}>/ {prompt.maxAmount}</span>
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
                                Yes
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
                                No
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
