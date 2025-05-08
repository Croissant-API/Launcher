import React, { Component } from "react";
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";

import Navbar from "./components/Navbar";

import NotFound from "./pages/NotFound";
import Library from "./pages/Library";
import Shop from "./pages/Shop";
import Credits from "./pages/Credits";
import Lobby from "./pages/Lobby";
import Profile from "./pages/Profile";
import SearchPage from "./pages/SearchPage";
import CreateGame from "./pages/Devzone/CreateGame";
import CreateItem from "./pages/Devzone/CreateItem";
import MyGames from "./pages/Devzone/MyGames";
import MyItems from "./pages/Devzone/MyItems";
import GamePage from "./pages/GamePage";

import "./main.css";
import { useParams, useLocation } from "react-router-dom";

function ProfileWrapper() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const user = params.get("user") || "";
  return <Profile user={user} />;
}

export default class extends Component {
  render() {
    return (
      <BrowserRouter>
        <div>
          <Navbar />
          <main style={{ position: "fixed", left: 0, right: 0, top: "7rem", bottom: 0 }}>
            {/* <div style={{ width: "100%", height: "100%", overflow: "auto" }}> */}
            <Routes>
              <Route path="/launcher/" element={<Library />} />
              <Route path="/launcher/shop" element={<Shop />} />
              <Route path="/launcher/buy-credits" element={<Credits />} />
              <Route path="/launcher/profile" element={<ProfileWrapper />} />
              <Route path="/launcher/search" element={<SearchPage />} />
              <Route path="/launcher/dev-zone_create-game" element={<CreateGame />} />
              <Route path="/launcher/dev-zone_create-item" element={<CreateItem />} />
              <Route path="/launcher/dev-zone_my-games" element={<MyGames />} />
              <Route path="/launcher/dev-zone_my-items" element={<MyItems />} />
              <Route path="/launcher/game" element={<GamePage />} />
              <Route path="/launcher/*" element={<NotFound />} />
            </Routes>
            {/* </div> */}
          </main>
          <Lobby />
          {/* <Footer /> */}
        </div>
      </BrowserRouter>
    );
  }
}