import React, { Component } from "react";
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";

import "./styles/main.css";

export default class extends Component {
  render() {
    return (
      <BrowserRouter>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#18181b",
            userSelect: "none",
          }}
        >
          <div
            style={{
              background: "#23232a",
              padding: "40px 32px",
              borderRadius: "12px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: "320px",
            }}
          >
            <h1 style={{ color: "#fff", marginBottom: "32px" }}>Login</h1>
            <div
              style={{
              background: "#5865F2",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(88,101,242,0.15)",
              transition: "background 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              userSelect: "none",
              }}
              onClick={() => {
                console.log("Login with Discord clicked");
                window.electron?.window?.openLogin?.();
              // TODO: Implement Discord OAuth logic here
              }}
            >
              <span
              className="fab fa-discord"
              style={{ fontSize: "20px", verticalAlign: "middle" }}
              aria-hidden="true"
              />
              Connect with Discord
            </div>
          </div>
        </div>
      </BrowserRouter>
    );
  }
}