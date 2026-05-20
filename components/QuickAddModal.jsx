import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Loader2, AlertCircle } from 'lucide-react';
import { CatalogService } from '../services/catalog';
import { NetworkService } from '../services/network';
import { DocumentsService } from '../services/operations';
import { formatDurationForSave } from '../utils/formatters';
import Button from './ui/Button';

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

    const filteredArtistOptions = (artistSearch.length < 2) ? [] : [
        ...artists.filter(a => (a.name || '').toLowerCase().includes(artistSearch.toLowerCase()) || (a.aka || '').toLowerCase().includes(artistSearch.toLowerCase()))
            .map(a => ({ id: a.id, name: a.aka || a.name, type: 'artist', label: a.aka || a.name })),
        ...contacts.filter(c => (`${c.first_name} ${c.last_name}`).toLowerCase().includes(artistSearch.toLowerCase()))
            .map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, type: 'contact', label: `${c.first_name} ${c.last_name} (Contact)` }))
    ].slice(0, 10);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
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
                const payload = {};
                if (['works', 'releases', 'tracks'].includes(entityType)) {
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
                    if (releaseDate) payload.release_date = releaseDate;

                    const finalArtistIds = [];
                    for (const item of selectedArtists) {
                        if (item.type === 'artist') {
                            finalArtistIds.push(item.id);
                        } else if (item.type === 'contact') {
                            const existing = artists.find(a => (a.name || '').toLowerCase() === item.name.toLowerCase());
                            if (existing) {
                                finalArtistIds.push(existing.id);
                            } else {
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
            'organization': 'Organization',
            'tracks': 'Track'
        };
        return labels[entityType] || entityType;
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div 
                className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-lg font-black text-white tracking-tight">
                        Quick Add {getEntityLabel()}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                    {error && (
                        <div className="mb-6 bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm flex items-start gap-3">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <div>{error}</div>
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                {getEntityLabel()} Name {entityType === 'artists' && '(Real Name)'}
                            </label>
                            <input
                                autoFocus={entityType !== 'artists'}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-text-secondary/30"
                                placeholder={`e.g. New ${getEntityLabel()}`}
                                required
                            />
                        </div>

                        {entityType === 'artists' && (
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                    Stage Name (AKA)
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={stageName}
                                    onChange={(e) => setStageName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-text-secondary/30"
                                    placeholder="e.g. The Weeknd"
                                />
                            </div>
                        )}

                        {entityType === 'tracks' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                            ISRC Code
                                        </label>
                                        <input
                                            type="text"
                                            value={isrcCode}
                                            onChange={(e) => setIsrcCode(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-mono"
                                            placeholder="US-XXX-24-00001"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                            Duration
                                        </label>
                                        <input
                                            type="text"
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
                                            placeholder="03:45"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                        Genre
                                    </label>
                                    <input
                                        type="text"
                                        value={genre}
                                        onChange={(e) => setGenre(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
                                        placeholder="e.g. Pop"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                        Artist(s) / Contacts
                                    </label>
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            {selectedArtists.map((art, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs font-bold">
                                                    {art.label}
                                                    <button type="button" onClick={() => {
                                                        const next = [...selectedArtists];
                                                        next.splice(idx, 1);
                                                        setSelectedArtists(next);
                                                    }} className="hover:text-white transition-colors">
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                                            <input
                                                type="text"
                                                value={artistSearch}
                                                onChange={(e) => {
                                                    setArtistSearch(e.target.value);
                                                    setShowArtistResults(true);
                                                }}
                                                onFocus={() => setShowArtistResults(true)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
                                                placeholder="Search to add artist..."
                                            />
                                            {showArtistResults && artistSearch.length >= 2 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c23] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
                                                    {filteredArtistOptions.length > 0 ? (
                                                        filteredArtistOptions.map((opt, i) => (
                                                            <div
                                                                key={`${opt.type}_${opt.id}_${i}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!selectedArtists.some(s => s.id === opt.id && s.type === opt.type)) {
                                                                        setSelectedArtists([...selectedArtists, opt]);
                                                                    }
                                                                    setArtistSearch('');
                                                                    setShowArtistResults(false);
                                                                }}
                                                                className="px-4 py-3 text-sm text-text-secondary hover:bg-white/5 hover:text-white cursor-pointer transition-colors border-b border-white/5 last:border-0"
                                                            >
                                                                {opt.label}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-xs text-text-secondary">
                                                            No results found
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                            Release Date
                                        </label>
                                        <input
                                            type="date"
                                            value={releaseDate}
                                            onChange={(e) => setReleaseDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
                                            Streaming Link
                                        </label>
                                        <input
                                            type="url"
                                            value={streamingLink}
                                            onChange={(e) => setStreamingLink(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        
                        <p className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest text-center mt-2">
                            Full details can be managed later in the main catalog
                        </p>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={
                                isSubmitting ||
                                !name.trim() ||
                                (entityType === 'tracks' && (!isrcCode.trim() || !duration.trim()))
                            }
                            className="flex-[2]"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Adding...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Plus size={16} strokeWidth={3} />
                                    Add {getEntityLabel()}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickAddModal;
