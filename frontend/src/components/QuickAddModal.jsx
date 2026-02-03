import React, { useState } from 'react';
import { Plus, X, Search, Loader2 } from 'lucide-react';
import { CatalogService } from '../services/catalog';
import { CRMService } from '../services/crm';
import { DocumentsService } from '../services/operations';

const QuickAddModal = ({ isOpen, onClose, entityType, onAdd, initialName = '' }) => {
    const [name, setName] = useState(initialName);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            let result;
            if (entityType === 'contact') {
                const [firstName, ...lastNames] = name.split(' ');
                result = await CRMService.createContact({
                    first_name: firstName,
                    last_name: lastNames.join(' ') || '.',
                    email: ''
                });
                onAdd({ id: result.id, name: `${result.first_name} ${result.last_name}` });
            } else if (entityType === 'distributor') {
                result = await CRMService.createCompany({
                    name: name,
                    type: 'Distributor'
                });
                onAdd({ id: result.id, name: result.name });
            } else {
                // For Catalog items: labels, artists, works, pros, publishers, releases
                const payload = {};
                if (entityType === 'works' || entityType === 'releases' || entityType === 'tracks') {
                    payload.title = name;
                } else {
                    payload.name = name;
                }

                result = await CatalogService.create(entityType, payload);
                onAdd(result);
            }
            onClose();
        } catch (err) {
            console.error(`Quick add failed for ${entityType}:`, err);
            setError(err.response?.data?.detail || 'Failed to create entry');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getEntityLabel = () => {
        const labels = {
            'artists': 'Artist',
            'labels': 'Label',
            'publishers': 'Publisher',
            'pros': 'PRO',
            'works': 'Musical Work',
            'contact': 'Contact',
            'distributor': 'Distributor'
        };
        return labels[entityType] || entityType;
    };

    return (
        <div className="quick-add-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="quick-add-modal" style={{
                background: 'white',
                width: '100%',
                maxWidth: '400px',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                        Quick Add {getEntityLabel()}
                    </h3>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            display: 'flex',
                            transition: 'all 0.2s'
                        }} className="close-hover">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            borderRadius: '8px',
                            color: '#b91c1c',
                            fontSize: '0.875rem',
                            marginBottom: '1rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#475569',
                            marginBottom: '0.5rem'
                        }}>
                            {getEntityLabel()} Name
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (name.trim() && !isSubmitting) {
                                        handleSubmit(e);
                                    }
                                }
                            }}
                            required
                            placeholder={`e.g. New ${getEntityLabel()}`}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            className="input-focus"
                        />
                        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                            You can add full details later from the {getEntityLabel()}s page.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#475569',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSubmit(e);
                            }}
                            disabled={isSubmitting || !name.trim()}
                            style={{
                                flex: 2,
                                padding: '0.75rem',
                                background: 'var(--primary-color)',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {isSubmitting ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                            {isSubmitting ? 'Adding...' : `Add ${getEntityLabel()}`}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .close-hover:hover { background: #f1f5f9; color: #475569 !important; }
                .input-focus:focus { border-color: var(--primary-color) !important; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default QuickAddModal;
