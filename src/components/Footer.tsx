import React, { Component } from "react";
import { Link } from "react-router-dom";

export default class extends Component {
    render(): React.ReactNode {
        return (
            <footer>
                <p>Copyright © 2025 Croissant Inventory System</p>
                <div style={{ display: 'flex', gap: '1rem', textAlign: 'center', verticalAlign: 'middle', justifyContent: 'center' }}>
                    <Link to="/tos">Terms of Service</Link>
                    <Link to="/privacy">Privacy Policy</Link>
                </div>
            </footer>
        );        
    }
}