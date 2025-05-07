import React, { Component } from "react";
import { Link } from 'react-router-dom';
import SearchBar from "./Searchbar";

export default class extends Component {
    componentDidMount() {
        document.title = "Home Page | Croissant";
        document.getElementById("my-balance")!.innerText = window.me.balance.toString();
    }
    render() {
        return (
            <div className="navbar-fixed">
                <header>
                    {/* <h1>Croissant Inventory System</h1> */}
                    <nav className="navbar-nav">
                        <div className="links-group">
                            <Link to="/">Library</Link>
                            <Link to="/shop">Shop</Link>
                            <div className="create-dropdown">
                                <Link to="/dev-zone">Create</Link>
                                <div className="create-dropdown-content">
                                    <Link to="/dev-zone_my-games">My Games</Link>
                                    <Link to="/dev-zone_my-items">My Items</Link>
                                    <hr />
                                    <Link to="/dev-zone_create-game">Create Game</Link>
                                    <Link to="/dev-zone_create-item">Create Item</Link>
                                </div>
                            </div>
                        </div>
                        <SearchBar />
                        <div className="navbar-user-group">
                            <Link to="/buy-credits" style={{ textDecoration: "none" }}>
                                <div className="navbar-credits">
                                    <img src="./credit.png" className="navbar-credit-img"/>
                                    <div className="navbar-balance">
                                        <span id="my-balance">0</span>
                                    </div>
                                </div>
                            </Link>
                            <Link to="/profile?user=me">
                                <img 
                                    className="navbar-avatar"
                                    src={`https://croissant-api.fr/avatar/${window.me.userId}`}
                                />
                            </Link>
                            <button className="method navbar-logout-btn"
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("verificationKey");
                                    location.reload();
                                }}
                            ><i className="fa fa-sign-out"></i></button>
                        </div>
                    </nav>
                </header>
            </div>
        );
    }
}