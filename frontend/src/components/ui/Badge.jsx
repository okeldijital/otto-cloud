import React from 'react';

const Badge = ({
    children,
    variant = 'neutral',
    size = 'md',
    className = ''
}) => {
    const variants = {
        neutral: 'badge-neutral',
        primary: 'badge-primary',
        success: 'badge-success',
        warn: 'badge-warn',
        critical: 'badge-critical',
        ghost: 'badge-ghost'
    };

    const sizes = {
        sm: 'badge-sm',
        md: 'badge-md',
        lg: 'badge-lg'
    };

    return (
        <span className={`badge ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
