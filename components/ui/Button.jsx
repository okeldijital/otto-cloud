import React from 'react';

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
        primary: 'bg-gradient-to-r from-accent to-[#2563eb] text-white shadow-glow hover:brightness-110 hover:shadow-[0_0_25px_rgba(14,165,233,0.3)]',
        secondary: 'bg-white/5 backdrop-blur-md text-text-primary border border-white/10 hover:bg-white/10',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5',
        danger: 'bg-danger/80 text-white hover:bg-danger shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]',
        orange: 'bg-warning/80 text-white hover:bg-warning shadow-[0_0_15px_rgba(245,158,11,0.2)]'
    };

    const sizes = {
        sm: 'px-4 py-1.5 text-xs',
        md: 'px-6 py-2.5 text-sm',
        lg: 'px-8 py-3.5 text-base'
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
