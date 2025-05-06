import DevNavbar from "../components/DevNavbar";
import React, { Component } from "react";

export default class Devzone extends Component {
    render(): React.ReactNode {
        return (
            <>
                <DevNavbar />
                <div
                    className="container"
                    style={{
                        maxWidth: 600,
                        margin: "48px auto",
                        padding: 36,
                        background: "linear-gradient(135deg, #23232a 0%, #18181c 100%)",
                        borderRadius: 18,
                        boxShadow: "0 4px 32px rgba(0,0,0,0.22)",
                    }}
                >
                    <h1
                        style={{
                            textAlign: "center",
                            marginBottom: 40,
                            fontWeight: 800,
                            fontSize: 38,
                            color: "#fff",
                            letterSpacing: 1,
                            textShadow: "0 2px 8px rgba(0,0,0,0.18)",
                        }}
                    >
                        Dev Zone
                    </h1>
                    <div>Here is the Dev Zone, you can manage you games and your items.</div>
                    
                </div>
            </>

        );
    }
}
