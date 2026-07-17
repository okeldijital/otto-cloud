import React from 'react';

const Input = ({
    label,
    error,
    className = '',
    type = 'text',
    id,
    ...props
}) => {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && (
                <label 
                    htmlFor={id}
                    className="text-2xs font-bold text-text-secondary uppercase tracking-widest"
                >
                    {label}
                </label>
            )}
            <input
                id={id}
                type={type}
                className={`w-full bg-surface-elevated border rounded-xl px-md py-2.5 text-small text-text-primary placeholder:text-text-secondary/30 transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 ${error ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent/40'}`}
                {...props}
            />
            {error && <p className="text-2xs font-bold text-danger mt-1">{error}</p>}
        </div>
    );
};

export const Select = ({
    label,
    error,
    children,
    className = '',
    id,
    ...props
}) => {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && (
                <label 
                    htmlFor={id}
                    className="text-2xs font-bold text-text-secondary uppercase tracking-widest"
                >
                    {label}
                </label>
            )}
            <div className="relative group">
                <select
                    id={id}
                    className={`w-full bg-surface-elevated border rounded-xl px-md py-2.5 text-small text-text-primary appearance-none transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer ${error ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent/40 group-hover:bg-surface-elevated/10'}`}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-md top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary group-hover:text-text-primary transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                    </svg>
                </div>
            </div>
            {error && <p className="text-2xs font-bold text-danger mt-1">{error}</p>}
        </div>
    );
};

export const Textarea = ({
    label,
    error,
    className = '',
    id,
    ...props
}) => {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && (
                <label 
                    htmlFor={id}
                    className="text-2xs font-bold text-text-secondary uppercase tracking-widest"
                >
                    {label}
                </label>
            )}
            <textarea
                id={id}
                className={`w-full bg-surface-elevated border rounded-xl px-md py-2.5 text-small text-text-primary placeholder:text-text-secondary/30 transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 min-h-[100px] resize-y ${error ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent/40'}`}
                {...props}
            />
            {error && <p className="text-2xs font-bold text-danger mt-1">{error}</p>}
        </div>
    );
};

export default Input;
