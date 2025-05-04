import React, { Component } from "react";
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";

import Navbar from "./components/Navbar";

import NotFound from "./pages/NotFound";
import Library from "./pages/Library";
import Shop from "./pages/Shop";
import Credits from "./pages/Credits";
import Lobby from "./pages/Lobby";
import Inventory from "./pages/Inventory";
import Profile from "./pages/Profile";
import SearchPage from "./pages/SearchPage";

import "./styles/main.css";
import { useParams } from "react-router-dom";

function ProfileWrapper() {
  const { userId } = useParams();
  return <Profile user={userId ?? ""} />;
}

export default class extends Component {
  render() {
    return (
      <BrowserRouter>
        <div>
          <Navbar />
          <main style={{ position: "fixed", top: "6rem", bottom: "0", left: "0", right: "0", overflowY: "auto" }}>
            <Routes>
              <Route path="/" element={<Library />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/buy-credits" element={<Credits />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/profile/@me" element={<Profile user="me" />} />
              <Route path="/profile/:userId" element={<ProfileWrapper />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Lobby />
          {/* <Footer /> */}
        </div>
      </BrowserRouter>
    );
  }
}