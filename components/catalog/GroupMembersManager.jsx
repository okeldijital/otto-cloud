import React, { useState, useEffect } from 'react';
import { User, X, Plus, Search } from 'lucide-react';
import partyClient from '../../api/partyClient';
import { CatalogService } from '../../services/catalog';

function useDebounced(value, delayMs = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delayMs);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delayMs]);
    return debouncedValue;
}

export default function GroupMembersManager({ artist, onUpdate }) {
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [role, setRole] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const debouncedSearch = useDebounced(searchTerm);

    useEffect(() => {
        if (!debouncedSearch.trim()) {
            setSearchResults([]);
            return;
        }

        const search = async () => {
            setIsSearching(true);
            try {
                // Search specifically for individual artists
                const data = await partyClient.search(debouncedSearch, 10, 'artist');
                // Filter to ensure we only get solo artists (though backend search might return groups too, we filter here)
                // Note: The search endpoint returns objects with 'kind' or 'artist_kind'.
                const items = (data.items || data.results || []).filter(item =>
                    item.entity_type === 'artist' &&
                    (item.artist_kind === 'solo' || item.kind === 'solo' || !item.kind)
                );

                // Remove already existing members from results
                const existingIds = new Set((artist.members || []).map(m => m.id));
                const filtered = items.filter(item => !existingIds.has(item.id));

                setSearchResults(filtered);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        };

        search();
    }, [debouncedSearch, artist.members]);

    const handleAddMember = async () => {
        if (!selectedMember) return;
        setIsSubmitting(true);
        try {
            await CatalogService.addGroupMember(artist.id, {
                member_id: selectedMember.id,
                role: role.trim()
            });
            onUpdate();
            handleCancelAdd();
        } catch (err) {
            console.error("Failed to add member", err);
            alert("Failed to add member to group.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateMember = async () => {
        if (!searchTerm.trim()) return;
        setIsSubmitting(true);
        try {
            // Create a new individual artist
            const newArtist = await partyClient.create({
                entity_type: 'artist',
                display_name: searchTerm.trim(),
                artist_kind: 'solo'
            });

            await CatalogService.addGroupMember(artist.id, {
                member_id: newArtist.id,
                role: role.trim()
            });
            onUpdate();
            handleCancelAdd();
        } catch (err) {
            console.error("Failed to create and add member", err);
            alert("Failed to create new member.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;
        try {
            await CatalogService.removeGroupMember(artist.id, memberId);
            onUpdate();
        } catch (err) {
            console.error("Failed to remove member", err);
            alert("Failed to remove member.");
        }
    };

    const handleCancelAdd = () => {
        setIsAdding(false);
        setSearchTerm('');
        setSelectedMember(null);
        setRole('');
        setSearchResults([]);
    };

    return (
        <div className="group-members-manager">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Group Members</h3>
                <button
                    className="btn-secondary btn-sm"
                    onClick={() => setIsAdding(true)}
                    disabled={isAdding}
                    style={{ gap: 6 }}
                >
                    <Plus size={16} /> Add Member
                </button>
            </div>

            <div className="members-list" style={{ display: 'grid', gap: 8 }}>
                {(artist.members || []).map(member => (
                    <div key={member.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: '#f8fafc',
                        borderRadius: 10, border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} color="#64748b" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{member.name}</div>
                                {member.role && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{member.role}</div>}
                            </div>
                        </div>
                        <button
                            className="ghost-btn icon-only"
                            onClick={() => handleRemoveMember(member.id)}
                            style={{ color: '#ef4444' }}
                            title="Remove member"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}

                {artist.members?.length === 0 && !isAdding && (
                    <div className="empty-state" style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'center', color: '#94a3b8' }}>
                        No members linked to this group yet.
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="add-member-form panel" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--primary-color)', background: 'var(--surface-color)' }}>
                    <div className="form-title" style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Add New Member</div>

                    {!selectedMember ? (
                        <div className="member-search">
                            <div className="search-input-wrapper" style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    className="input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search for an artist..."
                                    style={{ paddingLeft: 32 }}
                                    autoFocus
                                />
                            </div>

                            {/* Search Results */}
                            {searchTerm && (
                                <div className="search-results" style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                                    {isSearching ? (
                                        <div style={{ padding: 8, fontSize: '0.8rem', color: '#94a3b8' }}>Searching...</div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map(res => (
                                            <button
                                                key={res.id}
                                                className="ghost-btn"
                                                style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0 }}
                                                onClick={() => setSelectedMember(res)}
                                            >
                                                {res.display_name || res.name}
                                            </button>
                                        ))
                                    ) : (
                                        <button
                                            className="ghost-btn"
                                            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--primary-color)', borderRadius: 0 }}
                                            onClick={() => setSelectedMember({ isNew: true, name: searchTerm })}
                                        >
                                            <Plus size={14} style={{ marginRight: 6 }} /> Create "{searchTerm}"
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="member-config">
                            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                                <span style={{ color: '#64748b' }}>Selected:</span>
                                <span style={{ fontWeight: 600 }}>{selectedMember.name || selectedMember.display_name}</span>
                                {selectedMember.isNew && <span className="status-badge">NEW</span>}
                                <button className="ghost-btn icon-only" onClick={() => setSelectedMember(null)} style={{ padding: 2 }}><X size={14} /></button>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.875rem' }}>Role (Optional)</label>
                                <input
                                    className="input"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    placeholder="e.g. Vocalist, Guitarist"
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <button className="btn-secondary btn-sm" onClick={handleCancelAdd} disabled={isSubmitting}>Cancel</button>
                                <button
                                    className="btn-primary btn-sm"
                                    onClick={selectedMember.isNew ? handleCreateMember : handleAddMember}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : 'Add Member'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!selectedMember && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button className="btn-secondary btn-sm" onClick={handleCancelAdd}>Cancel</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
