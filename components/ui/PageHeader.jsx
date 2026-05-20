import React from 'react';

const PageHeader = ({
    title,
    subtitle,
    actions,
    breadcrumb,
    className = ''
}) => {
    return (
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-md mb-xl ${className}`}>
            <div className="flex-1 min-w-0">
                {breadcrumb && <div className="text-xs text-text-secondary mb-2 hover:text-text-primary transition-colors cursor-default">{breadcrumb}</div>}
                <h1 className="text-3xl font-extrabold text-text-primary tracking-tight truncate">{title}</h1>
                {subtitle && <p className="text-sm text-text-secondary mt-1 max-w-2xl">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-sm flex-shrink-0">{actions}</div>}
        </div>
    );
};

export default PageHeader;
