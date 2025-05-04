import { endpoint } from "../config/config";
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
        .then(data => setUsers(data.users || []))
        .catch(() => setUsers([]));
    }, [query]);

    return (
        <div className="container">
            Search results for <strong>{query}</strong>
            <h1>Users</h1>
            <div className="user-list">
                {users.length === 0 && <div>No users found.</div>}
                {users.map((user, idx) => (
                    <div className="user-card" key={user.id || idx}>
                        <img src={user.avatar || "https://via.placeholder.com/150"} alt="User Avatar" />
                        <h2>{user.username}</h2>
                        <p>{user.description || "No description."}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
