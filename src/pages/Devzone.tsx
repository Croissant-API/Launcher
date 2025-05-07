import DevNavbar from "../components/DevNavbar";
import React, { Component } from "react";
import "../styles/Devzone.css";

export default class Devzone extends Component {
    render(): React.ReactNode {
        return (
            <>
                <DevNavbar />
                <div className="devzone-container">
                    <h1 className="devzone-title">
                        Dev Zone
                    </h1>
                    <div>Here is the Dev Zone, you can manage you games and your items.</div>
                </div>
            </>
        );
    }
}
