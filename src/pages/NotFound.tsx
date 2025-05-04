import React, { Component } from "react";

export default class extends Component {
    componentDidMount() {
        document.title = "Page not found | Croissant";
    }
    render(): React.ReactNode {
        return (
            <div className="container">
                <h2>Oops! The page you are looking for does not exist.</h2>
                <div className="indent">
                    <p>It seems that the page you were trying to reach is either unavailable or does not exist.</p>
                    <p>Please check the URL for any mistakes or return to the homepage to continue exploring our services.</p>
                </div>
                <h3>What can you do?</h3>
                <div className="indent">
                    <p>Try the following options:</p>
                    <ul>
                        <li><a href="/">Return to Home</a></li>
                        <li><a href="/contact">Contact Support</a></li>
                        <li><a href="/api-docs">View API Documentation</a></li>
                    </ul>
                </div>
            </div>
        );
    }
}