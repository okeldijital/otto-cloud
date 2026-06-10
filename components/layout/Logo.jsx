"use client";
import React from 'react';

const Logo = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: { height: 48 },
        md: { height: 80 },
        lg: { height: 120 },
        xl: { height: 160 }
    };

    const config = sizes[size] || sizes.md;

    return (
        <div className={`logo-container ${className}`} style={{ display: 'flex', alignItems: 'center' }}>
            <img
                src="/otto-logo.png"
                alt="OTTO OS"
                style={{
                    height: `${config.height}px`,
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
};

export default Logo;
