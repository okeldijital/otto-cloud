import React from 'react';

const Badge = ({
    children,
    variant = 'neutral',
    size = 'md',
    className = ''
}) => {
    const variants = {
        neutral: 'bg-surface-elevated text-text-secondary border border-border shadow-sm',
        primary: 'bg-accent/10 text-accent border border-accent/30 shadow-accent',
        success: 'bg-success/10 text-success border border-success/30 shadow-success',
        warn: 'bg-warning/10 text-warning border border-warning/30 shadow-warning',
        critical: 'bg-danger/10 text-danger border border-danger/30 shadow-danger',
        ghost: 'bg-transparent text-text-secondary border border-transparent hover:bg-surface-elevated hover:border-border'
    };

    const sizes = {
        sm: 'px-sm py-0.5 text-2xs uppercase tracking-wider',
        md: 'px-md py-1 text-xs uppercase tracking-wider',
        lg: 'px-md py-1.5 text-small uppercase tracking-wider'
    };

    return (
        <span className={`inline-flex items-center font-bold rounded-full transition-all duration-fast ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
