"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import ArtistDocumentsPanel from '@/components/catalog/ArtistDocumentsPanel';
import ArtistFinancialsPanel from '@/components/catalog/ArtistFinancialsPanel';

/** @type {import('react').FC<{ children?: any; title?: any; subtitle?: any; footer?: any; headerAction?: any; className?: string; contentClassName?: string; headerClassName?: string; noPadding?: boolean }>} */
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
    const pathname = usePathname();
    const artistMatch = pathname?.match(/^\/catalog\/artists\/(\d+)$/);
    const isLegacyArtistPlaceholder = React.isValidElement(children) && children.type === 'p' && typeof children.props.children === 'string';

    // The Artist detail page still contains legacy placeholder Card bodies.
    // Replace only those exact placeholders. The real Documents/Financials panels
    // also use Card internally and must render normally to avoid recursive renders.
    if (artistMatch && title === 'Documents' && isLegacyArtistPlaceholder && children.props.children.includes('Document management coming')) {
        return <ArtistDocumentsPanel artistId={artistMatch[1]} />;
    }
    if (artistMatch && title === 'Financials' && isLegacyArtistPlaceholder && children.props.children.includes('Artist financial history')) {
        return <ArtistFinancialsPanel artistId={artistMatch[1]} />;
    }

    return (
        <div className={`bg-premium-glass border border-border rounded-xl shadow-sm hover:shadow-glass hover:border-border transition-all duration-slow backdrop-blur-xl flex flex-col overflow-hidden ${className}`} {...props}>
            {(title || subtitle || headerAction) && (
                <div className={`px-lg py-5 border-b border-border flex items-center justify-between bg-surface ${headerClassName}`}>
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
            {footer && <div className="px-md py-3 border-t border-border bg-surface-elevated/10 text-2xs text-text-secondary">{footer}</div>}
        </div>
    );
};

export default Card;
