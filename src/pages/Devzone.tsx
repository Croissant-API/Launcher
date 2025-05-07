import React, { Component } from "react";

export default class Devzone extends Component {
    render(): React.ReactNode {
        return (
            <>
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
