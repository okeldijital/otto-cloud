import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const HealthBadge = ({ status, reasons = [] }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    // Normalize input
    const currentStatus = (status || 'GREEN').toUpperCase();

    // Config based on status
    const config = {
        GREEN: {
            color: '#166534',
            bg: '#dcfce7',
            icon: CheckCircle,
            label: 'Healthy'
        },
        AMBER: {
            color: '#b45309',
            bg: '#fef3c7',
            icon: AlertTriangle,
            label: 'Attention'
        },
        RED: {
            color: '#b91c1c',
            bg: '#fee2e2',
            icon: AlertCircle,
            label: 'Critical'
        },
        // Fallback
        DEFAULT: {
            color: '#475569',
            bg: '#f1f5f9',
            icon: AlertCircle,
            label: 'Unknown'
        }
    };

    const theme = config[currentStatus] || config.DEFAULT;
    const Icon = theme.icon;

    return (
        <div
            className="health-badge-wrapper"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div
                className="health-badge-pill"
                style={{
                    backgroundColor: theme.bg,
                    color: theme.color,
                    border: `1px solid ${theme.color}20`
                }}
            >
                <Icon size={12} strokeWidth={2.5} />
                <span className="health-badge-label">{theme.label}</span>
            </div>

            {/* Tooltip */}
            {showTooltip && reasons && reasons.length > 0 && (
                <div className="health-badge-tooltip">
                    <div className="tooltip-header" style={{ color: theme.color }}>
                        Issues Found ({reasons.length})
                    </div>
                    <ul className="tooltip-list">
                        {reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default HealthBadge;
