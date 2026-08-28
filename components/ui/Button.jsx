import React from 'react';

/** @type {import('react').FC<{ children?: any; onClick?: any; type?: string; variant?: string; size?: string; disabled?: boolean; className?: string; icon?: any; loading?: boolean; fullWidth?: boolean; [key: string]: any }>} */
const Button = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
    icon: Icon = null,
    loading = false,
    fullWidth = false,
    ...props
}) => {
    const variants = {
        primary: 'bg-accent text-[#0A0A0C] hover:brightness-110',
        secondary: 'bg-surface-elevated text-text-primary border border-border hover:bg-surface',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated',
        danger: 'bg-danger text-text-primary hover:brightness-110',
        orange: 'bg-warning text-[#0A0A0C] hover:brightness-110'
    };

    const sizes = {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-5 py-3 text-base'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...props}
        >
            {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
                Icon && <Icon size={size === 'sm' ? 14 : 18} />
            )}
            {children}
        </button>
    );
};

export default Button;
