import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Logged from "./Logged";
import Unlogged  from "./Unlogged";
import fetchMe from "./utils/fetchMe";

declare global {
  interface Window {
    electron?: {
      window?: {
        minimize?: () => void;
        maximize?: () => void;
        close?: () => void;
        onSetToken?: (token: string) => void;
        openLogin?: () => void;
      };
    };
    me: {
      userId: string;
      balance: number;
      verificationKey: string;
      username: string;
    };
  }
}

const root = createRoot(document.getElementById("root")!);
console.log("Croissant Launcher v0.1.0");
console.log("Croissant Launcher is running in " + process.env.NODE_ENV + " mode.");

async function render() {
  if(localStorage.getItem("token") === null) {
    root.render(
      <StrictMode>
        <Unlogged />
      </StrictMode>
    )
  }
  else {
    fetchMe(() => {
      root.render(
        <StrictMode>
          <Logged />
        </StrictMode>
      );
    });  
  }
}

render().catch((err) => {
  console.error("Error rendering the app:", err);
  root.render(
    <StrictMode>
      <Unlogged />
    </StrictMode>
  );
});