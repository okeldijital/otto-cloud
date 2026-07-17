import React from 'react';
import { useToastStore } from '../../store/useToastStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ICONS = {
    success: <CheckCircle className="text-success" size={18} />,
    danger: <AlertCircle className="text-danger" size={18} />,
    info: <Info className="text-info" size={18} />,
    warning: <AlertTriangle className="text-warning" size={18} />,
};

const BORDERS = {
    success: 'border-success/20 bg-success/5',
    danger: 'border-danger/20 bg-danger/5',
    info: 'border-info/20 bg-info/5',
    warning: 'border-warning/20 bg-warning/5',
};

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed bottom-xl right-xl z-toast flex flex-col gap-md max-w-[400px] w-full pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto flex items-start gap-4 p-md rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-right-full fade-in duration-slow ${BORDERS[toast.type] || BORDERS.info}`}
                >
                    <div className="flex-shrink-0 mt-0.5">
                        {ICONS[toast.type] || ICONS.info}
                    </div>
                    <div className="flex-1 text-sm font-medium text-text-primary leading-tight">
                        {toast.message}
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="flex-shrink-0 p-1 hover:bg-surface-elevated rounded transition-colors text-text-secondary"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}
