import React from 'react';

const StatsCard = ({ title, value, icon, trend }) => {
    return (
        <div className="stats-card">
            <div className="stats-content">
                <h3 className="stats-title">{title}</h3>
                <div className="stats-value">{value}</div>
                {trend && <div className={`stats-trend ${trend > 0 ? 'positive' : 'negative'}`}>
                    {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </div>}
            </div>
            {icon && <div className="stats-icon">{icon}</div>}
        </div>
    );
};

export default StatsCard;
