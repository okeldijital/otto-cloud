import React from 'react';

const Badge = ({
    children,
    variant = 'neutral',
    size = 'md',
    className = ''
}) => {
    const variants = {
        neutral: 'bg-white/5 text-text-secondary border border-white/10 shadow-sm',
        primary: 'bg-accent/10 text-accent border border-accent/30 shadow-[0_0_10px_rgba(14,165,233,0.1)]',
        success: 'bg-success/10 text-success border border-success/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
        warn: 'bg-warning/10 text-warning border border-warning/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
        critical: 'bg-danger/10 text-danger border border-danger/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
        ghost: 'bg-transparent text-text-secondary border border-transparent hover:bg-white/5 hover:border-white/10'
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-[10px] uppercase tracking-wider',
        md: 'px-2.5 py-1 text-xs uppercase tracking-wider',
        lg: 'px-3 py-1.5 text-sm uppercase tracking-wider'
    };

    return (
        <span className={`inline-flex items-center font-bold rounded-full transition-all duration-fast ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
