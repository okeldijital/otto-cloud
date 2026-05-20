import React from 'react';
import logoImg from '../../assets/logo.png';

const Logo = ({ size = 'md', className = '' }) => {
    // Height focused sizing
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
                src={logoImg}
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
