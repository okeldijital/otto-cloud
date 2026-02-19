import React, { useState, useEffect } from 'react';
import partyClient from '../../api/partyClient';
import { X, Search } from 'lucide-react';

const TYPES = [
    { id: 'artist_solo', label: 'Artist (Individual)', type: 'artist', kind: 'solo' },
    { id: 'artist_group', label: 'Artist (Group)', type: 'artist', kind: 'group' },
    { id: 'organization', label: 'Organization', type: 'organization', kind: null },
    { id: 'individual', label: 'Individual (Non-Artist)', type: 'individual', kind: null },
];

function useDebounced(value, delayMs = 250) {
    const [out, setOut] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setOut(value), delayMs);
        return () => clearTimeout(id);
    }, [value, delayMs]);
    return out;
}

export default function CreatePartyModal({
    isOpen,
    onClose,
    onCreated,
    initialName = '',
}) {
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState('artist_solo'); // ID from TYPES
    const [name, setName] = useState(initialName);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Group Member Logic
    const [members, setMembers] = useState([]);
    const [memberQuery, setMemberQuery] = useState('');
    const [memberResults, setMemberResults] = useState([]);
    const debouncedMemberQuery = useDebounced(memberQuery);

    if (!isOpen) return null;

    useEffect(() => {
        if (!debouncedMemberQuery.trim()) {
            setMemberResults([]);
            return;
        }
        let alive = true;
        partyClient.search(debouncedMemberQuery, 5, 'artist,individual')
            .then(res => {
                if (!alive) return;
                const items = Array.isArray(res?.results || res?.items || res) ? (res.results || res.items || res) : [];
                // Filter out already selected
                const selectedIds = new Set(members.map(m => m.id));
                setMemberResults(items.filter(x => !selectedIds.has(x.id)));
            })
            .catch(console.error);
        return () => { alive = false; };
    }, [debouncedMemberQuery, members]);

    const handleNext = () => {
        setStep(2);
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const typeConfig = TYPES.find(t => t.id === selectedType);
            const payload = {
                entity_type: typeConfig.type,
                display_name: name,
                artist_kind: typeConfig.kind,
                // Add members if group
                member_ids: typeConfig.kind === 'group' ? members.map(m => m.id) : undefined,
            };

            const created = await partyClient.create(payload);
            onCreated(created);
            onClose();
        } catch (err) {
            console.error('Failed to create party:', err);
            setError('Failed to create party. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addMember = (m) => {
        setMembers(prev => [...prev, m]);
        setMemberQuery('');
        setMemberResults([]);
    };

    const removeMember = (id) => {
        setMembers(prev => prev.filter(m => m.id !== id));
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="panel" style={{ width: 440, padding: 0, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Create New Party</h3>
                    <button type="button" className="ghost-btn" onClick={onClose} style={{ padding: 4 }}>✕</button>
                </div>

                <div style={{ padding: 20, overflowY: 'auto' }}>
                    {error && <div className="error-message" style={{ marginBottom: 16, color: 'var(--danger-color)' }}>{error}</div>}

                    {step === 1 && (
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div className="strong" style={{ marginBottom: 4 }}>What applies best?</div>
                            {TYPES.map(t => (
                                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', background: selectedType === t.id ? 'var(--surface-color-hover)' : 'transparent' }}>
                                    <input
                                        type="radio"
                                        name="partyType"
                                        checked={selectedType === t.id}
                                        onChange={() => setSelectedType(t.id)}
                                    />
                                    <span>{t.label}</span>
                                </label>
                            ))}
                            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" onClick={handleNext}>Next</button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div className="form-group">
                                <label className="strong" style={{ display: 'block', marginBottom: 6 }}>
                                    {selectedType === 'organization' ? 'Organization Name' : 'Name'}
                                </label>
                                <input
                                    className="input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter name..."
                                    autoFocus
                                />
                            </div>

                            {selectedType === 'artist_group' && (
                                <div className="form-group" style={{ display: 'grid', gap: 8 }}>
                                    <label className="strong">Group Members</label>
                                    <div className="input-box" style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, display: 'grid', gap: 8 }}>
                                        {members.map(m => (
                                            <div key={m.id} className="chip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '4px 8px', borderRadius: 4 }}>
                                                <span>{m.display_name || m.name}</span>
                                                <button type="button" className="ghost-btn" onClick={() => removeMember(m.id)} style={{ padding: 0, height: 'auto' }}><X size={12} /></button>
                                            </div>
                                        ))}
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                value={memberQuery}
                                                onChange={e => setMemberQuery(e.target.value)}
                                                placeholder="Add member (search artist)..."
                                                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none' }}
                                            />
                                            {memberResults.length > 0 && (
                                                <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'white', border: '1px solid #e5e7eb', borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
                                                    {memberResults.map(r => (
                                                        <div key={r.id} className="dropdown-item" onClick={() => addMember(r)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}>
                                                            {r.display_name || r.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <button type="button" className="ghost-btn" onClick={() => setStep(1)}>Back</button>
                                <button type="button" className="btn primary" disabled={!name.trim() || isSubmitting} onClick={handleCreate}>
                                    {isSubmitting ? 'Creating...' : 'Create Party'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
