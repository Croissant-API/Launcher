import React, { useState, ChangeEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";

export default function Searchbar() {
    const [value, setValue] = useState("");
    const navigate = useNavigate();

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const query = encodeURIComponent(e.currentTarget.value);
            if (query) {
                navigate("/search?query=" + query);
            } else {
                navigate("/");
            }
        }
    };

    return (
        <input
            style={{
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
                width: "30%",
                boxSizing: "border-box",
                backgroundColor: "#2a2a2a",
                color: "#fff",
            }}
            placeholder="Search for games or users..."
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
        />
    );
}