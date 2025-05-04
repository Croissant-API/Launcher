
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
            <div style={{position: "fixed", zIndex: 1, width: "100%", backgroundColor: "white", top: "2rem"}}>
                <header>
                    {/* <h1>Croissant Inventory System</h1> */}
                    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="links-group">
                            <Link to="/">Library</Link>
                            <Link to="/shop">Shop</Link>
                            <Link to="/buy-credits">Credits</Link>
                            <Link to="/inventory">Inventory</Link>
                            {/* <Link to="/lobby">Lobby</Link> */}
                        </div>
                        <SearchBar />
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="credits" style={{ display: 'flex', alignItems: 'center', marginRight: '1rem', gap: '4px' }}>
                                <img src="/credit.png" style={{width: '24px', height:'24px', marginLeft: "4px" }}/>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <span id="my-balance">0</span>
                                    <span style={{marginLeft: "4px"}}>Credits</span>
                                </div>
                            </div>
                            <button className="method delete"
                            onClick={() => {
                                localStorage.removeItem("token");
                                localStorage.removeItem("verificationKey");
                                location.reload();
                            }}
                            >Log off</button>
                            <Link to="/profile/@me">
                                <img 
                                style={{width: '32px', height:'32px', marginLeft: "16px", borderRadius: "50%"}}
                                src={`https://croissant-api.fr/avatar/${window.me.userId}`}
                                />
                            </Link>
                        </div>
                    </nav>
                </header>
            </div>
        );
    }
}