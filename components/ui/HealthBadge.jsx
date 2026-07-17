import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const STATUS_STYLES = {
    GREEN: 'bg-success/10 text-success border-success/30 shadow-success',
    AMBER: 'bg-warning/10 text-warning border-warning/30 shadow-warning',
    RED: 'bg-danger/10 text-danger border-danger/30 shadow-danger',
    DEFAULT: 'bg-surface-elevated text-text-secondary border-border shadow-sm',
};

const STATUS_ICONS = {
    GREEN: CheckCircle,
    AMBER: AlertTriangle,
    RED: AlertCircle,
    DEFAULT: AlertCircle,
};

const STATUS_LABELS = {
    GREEN: 'Healthy',
    AMBER: 'Attention',
    RED: 'Critical',
    DEFAULT: 'Unknown',
};

const HealthBadge = ({ status, reasons = [] }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    const currentStatus = (status || 'GREEN').toUpperCase();
    const normalizedStatus = STATUS_STYLES[currentStatus] ? currentStatus : 'DEFAULT';
    const Icon = STATUS_ICONS[normalizedStatus];
    const label = STATUS_LABELS[normalizedStatus];

    return (
        <div
            className="inline-flex flex-col relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`inline-flex items-center gap-1.5 px-sm py-0.5 rounded-full border text-2xs font-bold ${STATUS_STYLES[normalizedStatus]}`}>
                <Icon size={12} strokeWidth={2.5} />
                <span>{label}</span>
            </div>

            {showTooltip && reasons && reasons.length > 0 && (
                <div className="absolute top-full mt-1 left-0 bg-surface border border-border rounded-md shadow-lg p-md z-dropdown min-w-[200px]">
                    <div className={`text-xs font-bold mb-1 ${normalizedStatus === 'GREEN' ? 'text-success' : normalizedStatus === 'AMBER' ? 'text-warning' : normalizedStatus === 'RED' ? 'text-danger' : 'text-text-secondary'}`}>
                        Issues Found ({reasons.length})
                    </div>
                    <ul className="space-y-1">
                        {reasons.map((reason, idx) => (
                            <li key={idx} className="text-xs text-text-secondary">{reason}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default HealthBadge;
