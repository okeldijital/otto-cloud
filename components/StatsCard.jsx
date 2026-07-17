import React from 'react';

const StatsCard = ({ title, value, icon, trend }) => {
    return (
        <div className="bg-premium-glass border border-border rounded-xl p-lg shadow-sm flex items-start gap-lg">
            <div className="flex-1 min-w-0">
                <h3 className="text-2xs font-bold text-text-secondary uppercase tracking-widest mb-1">{title}</h3>
                <div className="text-h2 font-extrabold text-text-primary truncate">{value}</div>
                {trend !== undefined && (
                    <div className={`text-xs font-semibold mt-1 ${trend > 0 ? 'text-success' : 'text-danger'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </div>
                )}
            </div>
            {icon && <div className="flex-shrink-0 p-md bg-surface-elevated rounded-lg text-accent">{icon}</div>}
        </div>
    );
};

export default StatsCard;
