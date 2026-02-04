import React from 'react';

const PageHeader = ({
    title,
    subtitle,
    actions,
    breadcrumb,
    className = ''
}) => {
    return (
        <div className={`page-header ${className}`}>
            <div>
                {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="header-actions">{actions}</div>}
        </div>
    );
};

export default PageHeader;
