import React, { useEffect, useState } from "react";
import { endpoint, url } from "../config/config";
import { Link } from "react-router-dom";
import Inventory, { Item } from "../components/Inventory";

interface DiscordUser {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    global_name?: string;
    banner?: string | null;
    accent_color?: number | null;
    banner_color?: string | null;
}

type ProfileProps = {
    user: string; // userId
};

export default function Profile({ user }: ProfileProps) {
    const [profile, setProfile] = useState<DiscordUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCurrentUser, setIsCurrentUser] = useState(false);

    const userId = user === "me" ? window.me.userId : user;

    useEffect(() => {
        setIsCurrentUser(user === "me");
    }, [user]);

    useEffect(() => {
        setLoading(true);
        fetch(endpoint + "/users/" + userId)
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch profile");
                return res.json();
            })
            .then(setProfile)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) return <div className="container"><p>Loading profile...</p></div>;
    if (error) return <div className="container"><p style={{ color: "red" }}>{error}</p></div>;
    if (!profile) return <div className="container"><p>No profile found.</p></div>;

    return (
        <div className="profile-root">
            <div className="profile-header">
                <img
                    src={
                        profile.avatar
                            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`
                            : "https://cdn.discordapp.com/embed/avatars/0.png"
                    }
                    alt={profile.username}
                    className="profile-avatar"
                />
                <div>
                    <div className="profile-name">
                        {profile.global_name || profile.username}
                    </div>
                </div>
            </div>
            <h2 className="profile-inventory-title">Inventory</h2>
            <Inventory userId={userId} isMe={userId == window.me.userId}/>
        </div>
    );
}
