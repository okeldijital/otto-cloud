import React from 'react';

const Card = ({
    children,
    title,
    subtitle,
    footer,
    headerAction,
    className = '',
    contentClassName = '',
    headerClassName = '',
    noPadding = false,
    ...props
}) => {
    return (
        <div className={`bg-premium-glass border border-white/5 rounded-[24px] shadow-sm hover:shadow-glass hover:border-white/10 transition-all duration-300 backdrop-blur-xl flex flex-col overflow-hidden ${className}`} {...props}>
            {(title || subtitle || headerAction) && (
                <div className={`px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] ${headerClassName}`}>
                    <div className="overflow-hidden">
                        {title && <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest truncate">{title}</h3>}
                        {subtitle && <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>}
                    </div>
                    {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
                </div>
            )}
            <div className={`${noPadding ? 'p-0' : 'p-md'} flex-1 ${contentClassName}`}>
                {children}
            </div>
            {footer && <div className="px-md py-3 border-t border-border bg-surface-elevated/10 text-xs text-text-secondary">{footer}</div>}
        </div>
    );
};

export default Card;
