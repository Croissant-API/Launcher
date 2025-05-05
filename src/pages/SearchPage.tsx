import { endpoint, url } from "../config/config";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

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
        <div className="container">
            <div style={{ marginBottom: 24, color: "#fff" }}>
                Search results for <strong>{query}</strong>
            </div>
            <h1 style={{ color: "#fff" }}>Users</h1>
            <div
                style={{
                    width: "90vw",
                    margin: "0 auto",
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 18,
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    padding: 0,
                }}
            >
                {users.length === 0 && (
                    <div style={{ color: "#ccc", marginTop: 16, gridColumn: "1 / -1", textAlign: "center" }}>
                        No users found.
                    </div>
                )}
                {users.map((user, idx) => (
                    <div
                        key={user.id || idx}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            background: "#232323",
                            borderRadius: 8,
                            padding: 16,
                            position: "relative",
                            cursor: "pointer",
                            userSelect: "none",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                            border: "2px solid #444",
                            transition: "transform 0.1s, box-shadow 0.1s",
                        }}
                        tabIndex={0}
                        onClick={() => window.location.href = `/profile?user=${user.id}`}
                        onMouseOver={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.28)")}
                        onMouseOut={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)")}
                    >
                        <img
                            src={url + "/avatar/" + user.id}
                            alt="User Avatar"
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: "50%",
                                marginBottom: 12,
                                border: "2px solid #888",
                                background: "#1a1a1a",
                                objectFit: "cover",
                            }}
                        />
                        <div style={{
                            fontWeight: 700,
                            color: "#fff",
                            fontSize: 16,
                            marginBottom: 4,
                            textAlign: "center",
                            width: "100%",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}>
                            {user.global_name || user.username}
                        </div>
                        <div style={{
                            color: "#aaa",
                            fontSize: 14,
                            textAlign: "center",
                            width: "100%",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}>
                            @{user.username}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
