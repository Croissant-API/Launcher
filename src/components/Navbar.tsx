import React, { Component } from "react";
import { Link } from 'react-router-dom';
import SearchBar from "./Searchbar";
import '../styles/Navbar.css';

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
                        <div className="navbar-links-group">
                            <Link to="/">Library</Link>
                            <Link to="/shop">Shop</Link>
                            <Link to="/buy-credits">Credits</Link>
                            <Link to="/inventory">Inventory</Link> | 
                            <Link to="/dev-zone">Create</Link>
                        </div>
                        <SearchBar />
                        <div className="navbar-user-group">
                            <div className="navbar-credits">
                                <img src="./credit.png" className="navbar-credit-img"/>
                                <div className="navbar-balance">
                                    <span id="my-balance">0</span>
                                </div>
                            </div>
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