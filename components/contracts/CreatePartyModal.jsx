import React, { useState, useEffect } from 'react';
import partyClient from '../../api/partyClient';
import { X, Search, Check, User, Users, Building, Plus } from 'lucide-react';
import Button from '../ui/Button';

const TYPES = [
    { id: 'artist_solo', label: 'Artist (Individual)', type: 'artist', kind: 'solo', icon: User },
    { id: 'artist_group', label: 'Artist (Group)', type: 'artist', kind: 'group', icon: Users },
    { id: 'organization', label: 'Organization', type: 'organization', kind: null, icon: Building },
    { id: 'individual', label: 'Individual (Non-Artist)', type: 'individual', kind: null, icon: User },
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

    useEffect(() => {
        if (initialName) setName(initialName);
        // If initialName is provided, we might be creating a group from a suggestion
        if (initialName) setSelectedType('artist_group');
    }, [initialName]);

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-md bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-surface border border-border w-full max-w-[480px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="px-xl py-lg border-b border-border flex justify-between items-center bg-surface-elevated/20">
                    <div>
                        <h3 className="text-lg font-bold text-text-primary tracking-tight">Create New Party</h3>
                        <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mt-0.5">
                            {step === 1 ? 'Step 1: Entity Type' : 'Step 2: Details & Identity'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-text-secondary">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-xl overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-lg p-md bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs font-bold flex items-center gap-2">
                             <X size={14} /> {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="flex flex-col gap-md">
                            <div className="text-sm font-semibold text-text-primary mb-1">What kind of entity are you adding?</div>
                            <div className="grid grid-cols-1 gap-3">
                                {TYPES.map(t => {
                                    const Icon = t.icon;
                                    const isActive = selectedType === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedType(t.id)}
                                            className={`flex items-center gap-4 p-md rounded-xl border-2 transition-all text-left ${
                                                isActive 
                                                ? 'border-accent bg-accent/5 ring-4 ring-accent/10' 
                                                : 'border-border bg-surface-elevated/5 hover:border-border-strong'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary'}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <div className={`text-sm font-bold ${isActive ? 'text-accent' : 'text-text-primary'}`}>{t.label}</div>
                                                <div className="text-[10px] text-text-secondary opacity-60 uppercase tracking-wider font-bold">Type: {t.type}</div>
                                            </div>
                                            {isActive && <Check size={18} className="text-accent" />}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-xl flex justify-end">
                                <Button variant="primary" onClick={handleNext} className="px-lg">Continue</Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col gap-xl">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                                    {selectedType === 'organization' ? 'Organization Name' : 'Legal / Display Name'}
                                </label>
                                <input
                                    className="w-full bg-surface-elevated border border-border rounded-xl p-md text-sm text-text-primary focus:ring-2 focus:ring-accent/50 outline-none transition-all placeholder:text-text-secondary/30"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={selectedType === 'organization' ? 'e.g. Sony Music' : 'e.g. John Doe'}
                                    autoFocus
                                />
                            </div>

                            {selectedType === 'artist_group' && (
                                <div className="flex flex-col gap-md">
                                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                                        <Users size={14} /> Group Members
                                    </label>
                                    <div className="p-md bg-surface-elevated/20 border border-border rounded-xl flex flex-col gap-3 min-h-[100px]">
                                        <div className="flex flex-wrap gap-2">
                                            {members.map(m => (
                                                <div key={m.id} className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-xs font-bold border border-accent/20">
                                                    <span>{m.display_name || m.name}</span>
                                                    <button type="button" onClick={() => removeMember(m.id)} className="hover:text-danger transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            {members.length === 0 && !memberQuery && (
                                                <div className="text-xs text-text-secondary opacity-40 italic py-1">No members added yet...</div>
                                            )}
                                        </div>
                                        
                                        <div className="relative mt-2 border-t border-border pt-3">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary opacity-40" />
                                                <input
                                                    value={memberQuery}
                                                    onChange={e => setMemberQuery(e.target.value)}
                                                    placeholder="Search to add member..."
                                                    className="w-full bg-transparent border-none text-xs text-text-primary focus:ring-0 outline-none pl-9"
                                                />
                                            </div>
                                            
                                            {memberResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1 max-h-[180px] overflow-y-auto">
                                                    {memberResults.map(r => (
                                                        <button 
                                                            key={r.id} 
                                                            onClick={() => addMember(r)} 
                                                            className="w-full px-md py-2 text-left text-xs hover:bg-surface-elevated transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                                                        >
                                                            <div className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center flex-shrink-0">
                                                                <User size={12} />
                                                            </div>
                                                            <span className="font-medium">{r.display_name || r.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-lg">
                                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                <Button 
                                    variant="primary" 
                                    disabled={!name.trim() || isSubmitting} 
                                    onClick={handleCreate}
                                    className="min-w-[140px]"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Party'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
