import React, { useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';

const EntityForm = ({ isOpen, onClose, title, children, onSubmit, isSubmitting, error }) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
            <div
                className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-2xl overflow-hidden flex flex-col max-h-full animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
                    <button
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form
                    onSubmit={onSubmit}
                    className="flex flex-col flex-1 overflow-hidden [&_.input]:border [&_.input]:border-border [&_.input]:bg-surface-elevated [&_.input]:text-text-primary [&_.input]:placeholder:text-text-secondary [&_.input]:outline-none [&_.input]:focus:border-accent [&_.input]:focus:ring-1 [&_.input]:focus:ring-accent/50 [&_.form-group>label]:text-text-primary [&_.form-group>label]:font-medium [&_.form-group>label]:mb-2 [&_.form-group>input]:w-full [&_.form-group>input]:rounded-xl [&_.form-group>input]:border [&_.form-group>input]:border-border [&_.form-group>input]:bg-surface-elevated [&_.form-group>input]:text-text-primary [&_.form-group>input]:placeholder:text-text-secondary [&_.form-group>input]:outline-none [&_.form-group>input]:transition-colors [&_.form-group>input]:focus:border-accent [&_.form-group>input]:focus:ring-1 [&_.form-group>input]:focus:ring-accent/30 [&_.form-group>select]:w-full [&_.form-group>select]:rounded-xl [&_.form-group>select]:border [&_.form-group>select]:border-border [&_.form-group>select]:bg-surface-elevated [&_.form-group>select]:text-text-primary [&_.form-group>select]:outline-none [&_.form-group>select]:focus:border-accent [&_.form-group>select]:focus:ring-1 [&_.form-group>select]:focus:ring-accent/30 [&_.form-group>textarea]:w-full [&_.form-group>textarea]:rounded-xl [&_.form-group>textarea]:border [&_.form-group>textarea]:border-border [&_.form-group>textarea]:bg-surface-elevated [&_.form-group>textarea]:text-text-primary [&_.form-group>textarea]:placeholder:text-text-secondary [&_.form-group>textarea]:outline-none [&_.form-group>textarea]:resize-y [&_.form-group>textarea]:focus:border-accent [&_.form-group>textarea]:focus:ring-1 [&_.form-group>textarea]:focus:ring-accent/30 [&_.form-group>input[type=file]]:cursor-pointer [&_.form-group>input[type=file]]:p-2 [&_.form-group>input[type=file]]:file:mr-3 [&_.form-group>input[type=file]]:file:rounded-lg [&_.form-group>input[type=file]]:file:border-0 [&_.form-group>input[type=file]]:file:bg-accent [&_.form-group>input[type=file]]:file:px-3 [&_.form-group>input[type=file]]:file:py-2 [&_.form-group>input[type=file]]:file:font-semibold [&_.form-group>input[type=file]]:file:text-black"
                >
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        {error && (
                            <div className="mb-6 bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm flex items-start gap-3">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <div>{error}</div>
                            </div>
                        )}
                        {children}
                    </div>

                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-3 shrink-0">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EntityForm;
