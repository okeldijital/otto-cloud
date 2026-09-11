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
            <style>{`
                .entity-form .form-group > label {
                    display: block;
                    margin-bottom: 0.5rem;
                    color: var(--color-text-primary);
                    font-weight: 500;
                }
                .entity-form .form-group > input:not([type="file"]),
                .entity-form .form-group > select,
                .entity-form .form-group > textarea {
                    width: 100%;
                    border: 1px solid var(--color-border);
                    border-radius: 0.75rem;
                    background: var(--color-surface-elevated);
                    color: var(--color-text-primary);
                    outline: none;
                    transition: border-color 140ms ease, box-shadow 140ms ease;
                    color-scheme: dark;
                }
                .entity-form .form-group > input:not([type="file"]),
                .entity-form .form-group > select {
                    min-height: 44px;
                    padding: 0.65rem 0.8rem;
                }
                .entity-form .form-group > textarea {
                    min-height: 100px;
                    padding: 0.75rem 0.8rem;
                    resize: vertical;
                }
                .entity-form .form-group > input::placeholder,
                .entity-form .form-group > textarea::placeholder {
                    color: var(--color-text-secondary);
                }
                .entity-form .form-group > input:not([type="file"]):focus,
                .entity-form .form-group > select:focus,
                .entity-form .form-group > textarea:focus {
                    border-color: var(--color-accent);
                    box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.14);
                }
                .entity-form .form-group > input[type="file"] {
                    width: 100%;
                    padding: 0.45rem;
                    border: 1px solid var(--color-border);
                    border-radius: 0.75rem;
                    background: var(--color-surface-elevated);
                    color: var(--color-text-primary);
                    color-scheme: dark;
                    cursor: pointer;
                }
                .entity-form .form-group > input[type="file"]::file-selector-button {
                    margin-right: 0.75rem;
                    padding: 0.5rem 0.8rem;
                    border: 0;
                    border-radius: 0.5rem;
                    background: var(--color-accent);
                    color: #05080a;
                    font-weight: 600;
                    cursor: pointer;
                }
                .entity-form .form-group > input[type="file"]::file-selector-button:hover {
                    filter: brightness(1.08);
                }
                .entity-form .form-group > select option {
                    background: var(--color-surface-elevated);
                    color: var(--color-text-primary);
                }
            `}</style>
            <div
                className="entity-form bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-2xl overflow-hidden flex flex-col max-h-full animate-in fade-in zoom-in-95 duration-200"
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
                    className="flex flex-col flex-1 overflow-hidden"
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
