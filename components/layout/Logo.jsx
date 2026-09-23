import React from "react";

const Logo = ({ size = "md", className = "", markOnly = false }) => {
    const sizes = { sm: 28, md: 40, lg: 56, xl: 80 };
    const height = sizes[size] || sizes.md;

    return (
        <div
            className={`logo-container ${className}`}
            style={{ display: "flex", alignItems: "center", height }}
        >
            <img
                src={markOnly ? "/otto-mark.svg" : "/otto-logo.svg"}
                alt="Otto"
                width={markOnly ? height : Math.round(height * 2.67)}
                height={height}
                style={{
                    display: "block",
                    height: "100%",
                    width: "auto",
                    maxWidth: "100%",
                    objectFit: "contain",
                }}
            />
        </div>
    );
};

export default Logo;
