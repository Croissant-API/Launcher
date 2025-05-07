import { endpoint, url } from "../config/config";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/SearchPage.css";

export default function SearchPage() {
    const location = useLocation();
    const [users, setUsers] = useState<any[]>([]);

    const queryStringToJSON = (qs?: string) => {
        qs = qs || location.search.slice(1);

        var pairs = qs.split('&');
        var result: { [key: string]: any } = {};
        pairs.forEach(function(p) {
            var pair = p.split('=');
            var key = pair[0];
            var value = decodeURIComponent(pair[1] || '');

            if( result[key] ) {
                if( Object.prototype.toString.call( result[key] ) === '[object Array]' ) {
                    result[key].push( value );
                } else {
                    result[key] = [ result[key], value ];
                }
            } else {
                result[key] = value;
            }
        });

        return JSON.parse(JSON.stringify(result));
    };

    const { query } = queryStringToJSON() || "";

    useEffect(() => {
        if (!query) return;
        fetch(endpoint + `/users/search?q=${encodeURIComponent(query)}`,{
            method: "GET",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
            },
        })
        .then(res => res.json())
        .then(data => setUsers(data || []))
        .catch(() => setUsers([]));
    }, [query]);

    return (
        <div className="search-container">
            <div className="search-header">
                Search results for <strong>{query}</strong>
            </div>
            <h1 className="search-title">Users</h1>
            <div className="search-users-grid">
                {users.length === 0 && (
                    <div className="search-no-users">
                        No users found.
                    </div>
                )}
                {users.map((user, idx) => (
                    <div
                        key={user.id || idx}
                        className="search-user-card"
                        tabIndex={0}
                        onClick={() => window.location.href = `/profile?user=${user.id}`}
                        onMouseOver={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.28)")}
                        onMouseOut={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)")}
                    >
                        <img
                            src={url + "/avatar/" + user.id}
                            alt="User Avatar"
                            className="search-user-avatar"
                        />
                        <div className="search-user-name">
                            {user.global_name || user.username}
                        </div>
                        <div className="search-user-username">
                            @{user.username}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
