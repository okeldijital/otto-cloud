import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Loader2 } from 'lucide-react';
import { CatalogService } from '../services/catalog';
import { NetworkService } from '../services/network';
import { DocumentsService } from '../services/operations';
import { formatDurationForSave } from '../utils/formatters';

const QuickAddModal = ({ isOpen, onClose, entityType, onAdd, initialName = '' }) => {
    const [name, setName] = useState(initialName);
    const [stageName, setStageName] = useState(entityType === 'artists' ? initialName : '');
    const [isrcCode, setIsrcCode] = useState('');
    const [duration, setDuration] = useState('');
    const [genre, setGenre] = useState('');
    const [streamingLink, setStreamingLink] = useState('');
    const [releaseDate, setReleaseDate] = useState('');
    const [artists, setArtists] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [artistSearch, setArtistSearch] = useState('');
    const [selectedArtists, setSelectedArtists] = useState([]);
    const [showArtistResults, setShowArtistResults] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && entityType === 'tracks') {
            const fetchArtists = async () => {
                try {
                    const [artistsData, contactsData] = await Promise.all([
                        CatalogService.getAll('artists'),
                        NetworkService.getIndividuals()
                    ]);
                    setArtists(artistsData || []);
                    setContacts(contactsData || []);
                } catch (e) {
                    console.error("Failed to fetch artist data for QuickAdd", e);
                }
            };
            fetchArtists();
        }
    }, [isOpen, entityType]);

    // Filtered options for artist search
    const filteredArtistOptions = (artistSearch.length < 2) ? [] : [
        ...artists.filter(a => (a.name || '').toLowerCase().includes(artistSearch.toLowerCase()) || (a.aka || '').toLowerCase().includes(artistSearch.toLowerCase()))
            .map(a => ({ id: a.id, name: a.aka || a.name, type: 'artist', label: a.aka || a.name })),
        ...contacts.filter(c => (`${c.first_name} ${c.last_name}`).toLowerCase().includes(artistSearch.toLowerCase()))
            .map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, type: 'contact', label: `${c.first_name} ${c.last_name} (Contact)` }))
    ].slice(0, 10);

    if (!isOpen) return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            let result;
            if (entityType === 'individual') {
                const [firstName, ...lastNames] = name.split(' ');
                result = await NetworkService.createIndividual({
                    first_name: firstName,
                    last_name: lastNames.join(' ') || '.',
                    email: ''
                });
                onAdd({ id: result.id, name: `${result.first_name} ${result.last_name}` });
            } else if (entityType === 'organization') {
                result = await NetworkService.createOrganization({
                    name: name,
                    org_type: 'Other'
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

                if (entityType === 'artists' && stageName) {
                    payload.aka = stageName;
                }
                if (entityType === 'tracks') {
                    payload.isrc_code = isrcCode;
                    payload.duration = formatDurationForSave(duration);
                    if (genre) payload.genre = genre;
                    if (streamingLink) payload.streaming_link = streamingLink;
                    if (genre) payload.genre = genre;
                    if (streamingLink) payload.streaming_link = streamingLink;
                    if (releaseDate) payload.release_date = releaseDate;

                    // Process selected artists
                    const finalArtistIds = [];
                    for (const item of selectedArtists) {
                        if (item.type === 'artist') {
                            finalArtistIds.push(item.id);
                        } else if (item.type === 'contact') {
                            // Check if artist already exists
                            const existing = artists.find(a => (a.name || '').toLowerCase() === item.name.toLowerCase());
                            if (existing) {
                                finalArtistIds.push(existing.id);
                            } else {
                                // Create new artist
                                try {
                                    const newArt = await CatalogService.create('artists', { name: item.name });
                                    finalArtistIds.push(newArt.id);
                                } catch (e) {
                                    console.error("Failed to auto-create artist", e);
                                }
                            }
                        }
                    }
                    payload.artist_ids = finalArtistIds;
                }

                result = await CatalogService.create(entityType, payload);
                // Return result with preferred display name
                const displayName = (entityType === 'artists' && result.aka) ? result.aka : (result.name || result.title);
                onAdd({ ...result, name: displayName });
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
            'individual': 'Individual',
            'organization': 'Organization'
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
                            {getEntityLabel()} Name {entityType === 'artists' && '(Real Name)'}
                        </label>
                        <input
                            autoFocus={entityType !== 'artists'}
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
                        {entityType === 'artists' && (
                            <div style={{ marginTop: '1rem' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: '#475569',
                                    marginBottom: '0.5rem'
                                }}>
                                    Stage Name (AKA)
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={stageName}
                                    onChange={(e) => setStageName(e.target.value)}
                                    placeholder="e.g. The Weeknd"
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
                            </div>
                        )}
                        {entityType === 'tracks' && (
                            <>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                                            ISRC Code
                                        </label>
                                        <input
                                            type="text"
                                            value={isrcCode}
                                            onChange={(e) => setIsrcCode(e.target.value)}
                                            placeholder="US-XXX-24-00001"
                                            style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                                            className="input-focus"
                                            required
                                        />
                                    </div>
                                    <div style={{ width: '120px' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                                            Duration
                                        </label>
                                        <input
                                            type="text"
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            placeholder="03:45"
                                            style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                                            className="input-focus"
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                                        Genre (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={genre}
                                        onChange={(e) => setGenre(e.target.value)}
                                        placeholder="e.g. Pop"
                                        style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                                        className="input-focus"
                                    />
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                                        Artist(s) / Contacts
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            {selectedArtists.map((art, idx) => (
                                                <div key={idx} style={{
                                                    background: '#e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '4px',
                                                    fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem'
                                                }}>
                                                    {art.label}
                                                    <button type="button" onClick={() => {
                                                        const next = [...selectedArtists];
                                                        next.splice(idx, 1);
                                                        setSelectedArtists(next);
                                                    }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#64748b' }}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                type="text"
                                                value={artistSearch}
                                                onChange={(e) => {
                                                    setArtistSearch(e.target.value);
                                                    setShowArtistResults(true);
                                                }}
                                                onFocus={() => setShowArtistResults(true)}
                                                placeholder="Search to add artist..."
                                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                                                className="input-focus"
                                            />
                                        </div>
                                        {showArtistResults && artistSearch.length >= 2 && filteredArtistOptions.length > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                                                background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto'
                                            }}>
                                                {filteredArtistOptions.map((opt, i) => (
                                                    <div
                                                        key={`${opt.type}_${opt.id}_${i}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Avoid duplicates
                                                            if (!selectedArtists.some(s => s.id === opt.id && s.type === opt.type)) {
                                                                setSelectedArtists([...selectedArtists, opt]);
                                                            }
                                                            setArtistSearch('');
                                                            setShowArtistResults(false);
                                                        }}
                                                        style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                                        onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                                                        onMouseLeave={(e) => e.target.style.background = 'white'}
                                                    >
                                                        {opt.label}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {showArtistResults && artistSearch.length >= 2 && filteredArtistOptions.length === 0 && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', fontSize: '0.875rem', color: '#64748b' }}>
                                                No results found
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                                            Release Date (Optional)
                                        </label>
                                        <input
                                            type="date"
                                            value={releaseDate}
                                            onChange={(e) => setReleaseDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                                            className="input-focus"
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                                            Streaming Link (Optional)
                                        </label>
                                        <input
                                            type="url"
                                            value={streamingLink}
                                            onChange={(e) => setStreamingLink(e.target.value)}
                                            placeholder="https://..."
                                            style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                                            className="input-focus"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
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
                            disabled={
                                isSubmitting ||
                                !name.trim() ||
                                (entityType === 'tracks' && (!isrcCode.trim() || !duration.trim()))
                            }
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
