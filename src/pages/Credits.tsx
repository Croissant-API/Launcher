import React, { Component } from "react";

export default class extends Component {
    render(): React.ReactNode {
        return (
            <div
                className="container"
                style={{
                    maxWidth: 600,
                    margin: "48px auto",
                    padding: 36,
                    background: "linear-gradient(135deg, #23232a 0%, #18181c 100%)",
                    borderRadius: 18,
                    boxShadow: "0 4px 32px rgba(0,0,0,0.22)",
                }}
            >
                <h1
                    style={{
                        textAlign: "center",
                        marginBottom: 40,
                        fontWeight: 800,
                        fontSize: 38,
                        color: "#fff",
                        letterSpacing: 1,
                        textShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    }}
                >
                    Buy Credits
                </h1>
                <div
                    className="credits-images"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 24,
                    }}
                >
                    {[
                        {
                            img: "./credits/tier1.png",
                            alt: "Credit 1",
                            credits: "200 Credits",
                            price: "0.99€",
                        },
                        {
                            img: "./credits/tier2.png",
                            alt: "Credit 2",
                            credits: "400 Credits",
                            price: "1.99€",
                        },
                        {
                            img: "./credits/tier3.png",
                            alt: "Credit 3",
                            credits: "1000 Credits",
                            price: "4.99€",
                        },
                        {
                            img: "./credits/tier4.png",
                            alt: "Credit 4",
                            credits: "2000 Credits",
                            price: "9.99€",
                        },
                    ].map((tier, i) => (
                        <div
                            key={tier.credits}
                            className="credit-tier"
                            style={{
                                background: "rgba(35,35,42,0.98)",
                                borderRadius: 12,
                                padding: 24,
                                textAlign: "center",
                                boxShadow: "0 2px 12px rgba(0,0,0,0.16)",
                                transition: "transform 0.15s, box-shadow 0.15s",
                                cursor: "pointer",
                                border: "2px solid #282834",
                                marginBottom: 12,
                            }}
                            onMouseOver={e => {
                                (e.currentTarget as HTMLDivElement).style.transform = "scale(1.04)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow =
                                    "0 6px 24px rgba(0,0,0,0.22)";
                            }}
                            onMouseOut={e => {
                                (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                                (e.currentTarget as HTMLDivElement).style.boxShadow =
                                    "0 2px 12px rgba(0,0,0,0.16)";
                            }}
                        >
                            <img
                                src={tier.img}
                                alt={tier.alt}
                                style={{
                                    // width: 64,
                                    height: 64,
                                    marginBottom: 16,
                                    filter: "drop-shadow(0 2px 8px #0006)",
                                }}
                            />
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: 22,
                                    marginBottom: 6,
                                    color: "#fff",
                                    letterSpacing: 0.5,
                                }}
                            >
                                {tier.credits}
                            </div>
                            <div
                                style={{
                                    color: "#ffd700",
                                    fontSize: 17,
                                    fontWeight: 600,
                                    marginBottom: 2,
                                }}
                            >
                                {tier.price}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}
