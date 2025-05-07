import React, { Component } from "react";

export default class extends Component {
    render(): React.ReactNode {
        return (
            <div className="credits-container">
                <h1 className="credits-title">
                    Buy Credits
                </h1>
                <div className="credits-images">
                    {[
                        {
                            img: "./credits/tier1.png",
                            alt: "Credit 1",
                            credits: "200",
                            price: "0.99€",
                        },
                        {
                            img: "./credits/tier2.png",
                            alt: "Credit 2",
                            credits: "400",
                            price: "1.99€",
                        },
                        {
                            img: "./credits/tier3.png",
                            alt: "Credit 3",
                            credits: "1000",
                            price: "4.99€",
                        },
                        {
                            img: "./credits/tier4.png",
                            alt: "Credit 4",
                            credits: "2000",
                            price: "9.99€",
                        },
                    ].map((tier, i) => (
                        <div
                            key={tier.credits}
                            className="credit-tier"
                            tabIndex={0}
                        >
                            <img
                                src={tier.img}
                                alt={tier.alt}
                                className="credit-tier-img"
                            />
                            <div className="credit-tier-credits">
                                {tier.credits} <img src="./credit.png" className="credit-icon navbar-credit-img" style={{position: "relative", top: "4px"}}/>
                            </div>
                            <div className="credit-tier-price">
                                {tier.price}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}
