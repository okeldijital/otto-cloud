import React, { useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';

const EntityForm = ({ isOpen, onClose, title, children, onSubmit, isSubmitting, error }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/70 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="entity-form w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col bg-surface border border-border rounded-xl shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-4 px-lg py-4 border-b border-border bg-surface">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">Edit record</p>
                        <h2 className="mt-1 text-lg font-semibold tracking-tight text-text-primary truncate">{title}</h2>
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="entity-form-body flex-1 overflow-y-auto p-lg custom-scrollbar">
                        {error && (
                            <div className="mb-lg flex items-start gap-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                <div>{error}</div>
                            </div>
                        )}
                        {children}
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-surface px-lg py-4">
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

            <style>{`
                .entity-form-body input:not([type="file"]),
                .entity-form-body select,
                .entity-form-body textarea {
                    width: 100%;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    background: var(--color-surface-elevated);
                    color: var(--color-text-primary);
                    outline: none;
                    transition: border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease, background-color var(--motion-fast) ease;
                    color-scheme: dark;
                }

                .entity-form-body input:not([type="file"]),
                .entity-form-body select {
                    min-height: 40px;
                    padding: 0.55rem 0.75rem;
                }

                .entity-form-body textarea {
                    min-height: 100px;
                    padding: 0.7rem 0.75rem;
                    resize: vertical;
                }

                .entity-form-body input::placeholder,
                .entity-form-body textarea::placeholder {
                    color: var(--color-text-secondary);
                }

                .entity-form-body input:not([type="file"]):focus,
                .entity-form-body select:focus,
                .entity-form-body textarea:focus {
                    border-color: var(--color-accent);
                    box-shadow: var(--ring-accent);
                    background: var(--color-surface);
                }

                .entity-form-body input[type="file"] {
                    width: 100%;
                    padding: 0.35rem;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    background: var(--color-surface-elevated);
                    color: var(--color-text-primary);
                    color-scheme: dark;
                    cursor: pointer;
                }

                .entity-form-body input[type="file"]::file-selector-button {
                    margin-right: 0.75rem;
                    padding: 0.45rem 0.7rem;
                    border: 0;
                    border-radius: var(--radius-sm);
                    background: var(--color-accent);
                    color: #05080a;
                    font-weight: 600;
                    cursor: pointer;
                }

                .entity-form-body input[type="file"]::file-selector-button:hover {
                    filter: brightness(1.08);
                }

                .entity-form-body select option {
                    background: var(--color-surface-elevated);
                    color: var(--color-text-primary);
                }

                .entity-form-body label {
                    color: var(--color-text-secondary);
                }

                .entity-form-body .input {
                    background: var(--color-surface-elevated);
                    color: var(--color-text-primary);
                    border-color: var(--color-border);
                }
            `}</style>
        </div>
    );
};

export default EntityForm;
