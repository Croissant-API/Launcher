
import React, { Component } from "react";
import { Link } from 'react-router-dom';

export default class extends Component {
    componentDidMount() {
        document.title = "Home Page | Croissant";
        document.getElementById("my-balance")!.innerText = window.me.balance.toString();
    }
    render() {
        return (
            <div style={{position: "fixed", zIndex: 1, width: "100%", backgroundColor: "white", top: "calc(7rem - 5px)", right: "0"}}>
                <header>
                    <style>
                        {`
                            main {
                                margin-top: 2rem;
                            }
                        `}
                    </style>
                    {/* <h1>Croissant Inventory System</h1> */}
                    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="links-group">
                            <Link to="/dev-zone_my-games">My Games</Link>
                            <Link to="/dev-zone_my-items">My Items</Link>
                            <Link to="/dev-zone_create-game">Create Game</Link>
                            <Link to="/dev-zone_create-item">Create Item</Link>
                        </div>
                    </nav>
                </header>
            </div>
        );
    }
}