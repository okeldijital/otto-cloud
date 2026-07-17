import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from './Button';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Delete', confirmVariant = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-overlay backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-md w-full max-w-sm p-lg shadow-lg animate-[slideUp_0.15s_ease-out]">
                <div className="flex justify-between items-start mb-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                            <AlertTriangle size={20} />
                        </div>
                        <h3 className="text-h3 font-semibold text-text-primary m-0">{title}</h3>
                    </div>
                </div>

                <p className="text-small text-text-secondary mb-lg leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant={confirmVariant} onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ConfirmDialog;
