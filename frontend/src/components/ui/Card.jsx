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
        <div className={`panel ${className}`} {...props}>
            {(title || subtitle || headerAction) && (
                <div className={`panel-header ${headerClassName}`}>
                    <div>
                        {title && <h3 className="panel-title">{title}</h3>}
                        {subtitle && <p className="panel-subtitle">{subtitle}</p>}
                    </div>
                    {headerAction && <div className="panel-header-action">{headerAction}</div>}
                </div>
            )}
            <div className={`panel-content ${noPadding ? 'p-0' : 'p-4'} ${contentClassName}`}>
                {children}
            </div>
            {footer && <div className="panel-footer">{footer}</div>}
        </div>
    );
};

export default Card;
