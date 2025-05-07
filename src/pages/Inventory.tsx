import React, { Component } from "react";
import { Link } from "react-router-dom";
import { endpoint, url } from "../config/config";
import fetchMe from "../utils/fetchMe";
import "../styles/Inventory.css";

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
    ownerUser?: any | null;
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
                <div className="inventory-details-container">
                    <button
                        onClick={this.handleBackToInventory}
                        className="inventory-back-btn"
                    >
                        ← Back to Inventory
                    </button>
                    <div className="inventory-details-main">
                        <img
                            src={url + "/items-icons/" + selectedItem.iconHash}
                            alt={selectedItem.name}
                            className="inventory-details-img"
                        />
                        <div>
                            <div className="inventory-details-name">{selectedItem.name}</div>
                            <div className="inventory-details-desc">{selectedItem.description}</div>
                            <div className="inventory-details-qty">Quantity: x{selectedItem.amount}</div>
                            {selectedItem.price !== undefined && (
                                <div className="inventory-details-price">
                                    Price: {selectedItem.price} <img src="./credit.png" className="inventory-credit-icon"/>
                                </div>
                            )}
                            {selectedItem.owner && this.state.ownerUser && (
                                <div className="inventory-details-creator">
                                    Creator:{" "}
                                    <Link
                                        to={`/profile?user=${selectedItem.owner}`}
                                        className="inventory-details-creator-link"
                                    >
                                        <img className="inventory-details-creator-avatar"
                                            src={url + "/avatar/" + selectedItem.owner }/>
                                        {this.state.ownerUser.global_name || this.state.ownerUser.username}
                                    </Link>
                                </div>
                            )}
                            {selectedItem.showInStore !== undefined && (
                                <div className="inventory-details-store">
                                    Show in Store: {selectedItem.showInStore ? "Yes" : "No"}
                                </div>
                            )}
                            {selectedItem.deleted !== undefined && (
                                <div className="inventory-details-deleted">
                                    Deleted: {selectedItem.deleted ? "Yes" : "No"}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="inventory-root">
                <h1>Inventory</h1>
                {loading && <p>Loading...</p>}
                {error && <p className="inventory-error">{error}</p>}
                {!loading && !error && (
                    <div
                        className="inventory-grid"
                        style={{
                            gridTemplateColumns: `repeat(${columns}, 1fr)`,
                            overflowY: rows > minRows ? "auto" : "hidden",
                        }}
                    >
                        {items.map((item) => (
                            <div
                                key={item.itemId}
                                className="inventory-item"
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
                                        className="inventory-item-img"
                                        draggable={false}
                                    />
                                    <div className="inventory-item-qty">
                                        x{item.amount}
                                    </div>
                                </>
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
                )}

                {tooltip && (
                    <div
                        className="inventory-tooltip"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y,
                        }}
                    >
                        <div className="inventory-tooltip-name">{tooltip.item.name}</div>
                        <div className="inventory-tooltip-desc">{tooltip.item.description}</div>
                    </div>
                )}

                {contextMenu && (
                    <div
                        className="inventory-context-menu"
                        style={{
                            left: contextMenu.x,
                            top: contextMenu.y,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            className="inventory-context-sell"
                            onClick={() => this.handleSell(contextMenu.item)}
                        >
                            Sell
                        </div>
                        <div
                            className="inventory-context-drop"
                            onClick={() => this.handleDrop(contextMenu.item)}
                        >
                            Drop
                        </div>
                    </div>
                )}

                {prompt && (
                    <div className="inventory-prompt-overlay">
                        <div className="inventory-prompt">
                            <div className="inventory-prompt-message">{prompt.message}</div>
                            {prompt.maxAmount && (
                                <div className="inventory-prompt-amount">
                                    <input
                                        type="number"
                                        min={1}
                                        max={prompt.maxAmount}
                                        value={prompt.amount}
                                        onChange={this.handlePromptAmountChange}
                                        className="inventory-prompt-amount-input"
                                    />
                                    <span className="inventory-prompt-amount-max">/ {prompt.maxAmount}</span>
                                </div>
                            )}
                            <button
                                className="inventory-prompt-yes-btn"
                                onClick={() => this.handlePromptResult(true)}
                            >
                                Yes
                            </button>
                            <button
                                className="inventory-prompt-no-btn"
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
