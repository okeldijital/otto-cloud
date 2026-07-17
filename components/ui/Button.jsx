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
        primary: 'bg-gradient-to-r from-accent to-accent/80 text-text-primary shadow-glow hover:brightness-110 hover:shadow-accent',
        secondary: 'bg-surface-elevated backdrop-blur-md text-text-primary border border-border hover:bg-white/10',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated',
        danger: 'bg-danger/80 text-text-primary hover:bg-danger shadow-danger hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]',
        orange: 'bg-warning/80 text-text-primary hover:bg-warning shadow-warning'
    };

    const sizes = {
        sm: 'px-md py-1.5 text-xs',
        md: 'px-lg py-2.5 text-small',
        lg: 'px-xl py-3.5 text-body'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 font-bold transition-all duration-normal active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-full focus:outline-none ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...props}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                Icon && <Icon size={size === 'sm' ? 14 : 18} />
            )}
            {children}
        </button>
    );
};

export default Button;
