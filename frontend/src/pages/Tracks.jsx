import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { NetworkService } from '../services/network';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';
import { Music2, Disc, FileAudio, ExternalLink, Users, ChevronLeft, Download, Plus, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import Input, { Select, Textarea } from '../components/ui/Input';
import Card from '../components/ui/Card';
import { formatDurationForSave, formatDurationForDisplay } from '../utils/formatters';
import { confirmAction } from '../lib/tauri';

const Tracks = () => {
    const [tracks, setTracks] = useState([]);
    const [artists, setArtists] = useState([]);
    const [workDictionary, setWorkDictionary] = useState({});
    const [releaseDictionary, setReleaseDictionary] = useState({});

    // Filter dictionaries (for lookups in Create/Edit modal)
    const [works, setWorks] = useState([]);
    const [releases, setReleases] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [labels, setLabels] = useState([]);
    const [distributors, setDistributors] = useState([]);

    // State for new credit input
    const [newCreditContactId, setNewCreditContactId] = useState('');
    const [newCreditArtistId, setNewCreditArtistId] = useState('');
    const [newCreditLabelId, setNewCreditLabelId] = useState('');
    const [newCreditOrgId, setNewCreditOrgId] = useState('');
    const [newCreditType, setNewCreditType] = useState('individual'); // 'individual', 'artist', 'label', 'organization'
    const [newCreditRole, setNewCreditRole] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTrack, setEditingTrack] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'unassigned', 'assigned'

    const initialFormState = {
        title: '',
        isrc_code: '',
        duration: '',
        genre: '',
        release_date: '',
        release_id: '',
        work_id: '',
        streaming_link: '',
        artist_ids: [],
        secondary_release_ids: [],
        credits: []
    };
    const [formData, setFormData] = useState(initialFormState);

    const [combinedArtistOptions, setCombinedArtistOptions] = useState([]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [tracksData, worksData, releasesData, artistsData, contactsData, labelsData, organizationsData] = await Promise.all([
                CatalogService.getAll('tracks'),
                CatalogService.getAll('works'),
                CatalogService.getAll('releases'),
                CatalogService.getAll('artists'),
                NetworkService.getIndividuals(),
                CatalogService.getAll('labels'),
                NetworkService.getOrganizations()
            ]);

            // Create dictionaries for lookup
            const workDict = {};
            (worksData || []).forEach(w => workDict[w.id] = w.title);
            setWorkDictionary(workDict);

            const releaseDict = {};
            (releasesData || []).forEach(r => releaseDict[r.id] = r.title);
            setReleaseDictionary(releaseDict);

            setTracks(tracksData || []);
            setWorks(worksData || []);
            setReleases(releasesData || []);
            setArtists(artistsData || []);
            setContacts(contactsData || []);
            setLabels(labelsData || []);
            setDistributors(organizationsData || []);

            // Combine artists and contacts for selection
            const combined = [
                ...(artistsData || []).map(a => ({
                    ...a,
                    id: `artist_${a.id}`,
                    label: a.display_name || a.aka || a.name || 'Unknown Artist',
                    type: 'artist'
                })),
                ...(contactsData || []).map(c => ({
                    ...c,
                    id: `contact_${c.id}`,
                    label: `${c.first_name} ${c.last_name} (Contact)`,
                    name: `${c.first_name} ${c.last_name}`,
                    type: 'contact'
                }))
            ];
            setCombinedArtistOptions(combined);
        } catch (error) {
            console.error('Failed to fetch tracks data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = () => {
        setEditingTrack(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleEdit = (track) => {
        setEditingTrack(track);
        setFormData({
            title: track.title || '',
            isrc_code: track.isrc_code || '',
            duration: track.duration || '',
            genre: track.genre || '',
            release_date: track.release_date || '',
            release_id: track.release_id || '',
            work_id: track.work_id || '',
            streaming_link: track.streaming_link || '',
            artist_ids: (track.artist_ids || []).map(id => `artist_${id}`),
            secondary_release_ids: track.secondary_release_ids || [],
            credits: track.credits || []
        });
        setIsModalOpen(true);
    };

    // Auto-populate credits and date when Release matches
    useEffect(() => {
        if (!isModalOpen || !formData.release_id) return;

        // Find the release info
        const release = (releases || []).find(r => r.id == formData.release_id);

        if (release) {
            setFormData(prev => {
                const updates = {};
                let hasUpdates = false;

                // Auto credits
                if (release.credits && release.credits.length > 0) {
                    // Only update if credits are empty to prevent overwriting user work
                    if (!prev.credits || prev.credits.length === 0) {
                        updates.credits = [...release.credits];
                        hasUpdates = true;
                    }
                }

                // Auto date
                if (release.release_date) {
                    // Only update if date is empty
                    if (!prev.release_date) {
                        updates.release_date = release.release_date;
                        hasUpdates = true;
                    }
                }

                // Auto streaming link - "Always pull... unlike date"
                if (release.streaming_link) {
                    // Update if empty OR if we are switching to a new release
                    // (Ensure we don't overwrite if user is just editing track and release is unchanged)
                    const isSameReleaseAsOriginal = editingTrack && editingTrack.release_id == formData.release_id;
                    const shouldUpdate = !prev.streaming_link || !isSameReleaseAsOriginal;

                    if (shouldUpdate) {
                        updates.streaming_link = release.streaming_link;
                        hasUpdates = true;
                    }
                }

                if (hasUpdates) {
                    return { ...prev, ...updates };
                }
                return prev;
            });
        }
    }, [formData.release_id, isModalOpen, releases]);

    const handleDelete = async (track) => {
        if (await confirmAction(`Are you sure you want to delete track "${track.title}"?`, 'Delete Track')) {
            try {
                await CatalogService.delete('tracks', track.id);
                fetchData();
            } catch (error) {
                console.error('Delete failed:', error);
                alert(error.response?.data?.detail || 'Failed to delete track');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Clean payload
            const payload = { ...formData };
            if (!payload.release_id || payload.release_id === '' || payload.release_id === '0') {
                payload.release_id = null;
            }

            if (!payload.work_id || payload.work_id === '' || payload.work_id === '0') {
                payload.work_id = null;
            }

            // Handle empty strings for optional fields
            if (!payload.duration) payload.duration = null;
            if (!payload.release_date) payload.release_date = null;
            if (!payload.isrc_code) payload.isrc_code = null;
            if (!payload.genre) payload.genre = null;
            if (!payload.streaming_link) payload.streaming_link = null;

            // Process artist_ids (handle mixed artist/contact selection)
            const finalArtistIds = [];
            for (const uid of payload.artist_ids) {
                if (typeof uid === 'string' && uid.startsWith('artist_')) {
                    finalArtistIds.push(parseInt(uid.replace('artist_', '')));
                } else if (typeof uid === 'string' && uid.startsWith('contact_')) {
                    // It's a contact - check if artist exists or create new
                    const contactId = uid.replace('contact_', '');
                    const contact = contacts.find(c => c.id == contactId);
                    if (contact) {
                        const name = `${contact.first_name} ${contact.last_name}`;
                        // Check if artist already exists with this name (case insensitive)
                        const existingArtist = artists.find(a =>
                            (a.name || '').toLowerCase() === name.toLowerCase() ||
                            (a.display_name || '').toLowerCase() === name.toLowerCase()
                        );

                        if (existingArtist) {
                            finalArtistIds.push(existingArtist.id);
                        } else {
                            // Create new artist for this contact
                            try {
                                // Simple creation with name. Backend handles defaults.
                                const newArt = await CatalogService.create('artists', { name: name });
                                finalArtistIds.push(newArt.id);
                            } catch (err) {
                                console.error(`Failed to auto-create artist for contact ${name}`, err);
                                // Fallback: Ignore this one to prevent breaking entire save? 
                                // Or alert user? Let's log and alert but try to proceed with others.
                                alert(`Could not create artist profile for contact "${name}": ${err.message}`);
                            }
                        }
                    }
                } else if (typeof uid === 'number') {
                    // Should be covered by artist_ prefix, but handle raw numbers just in case
                    finalArtistIds.push(uid);
                }
            }
            payload.artist_ids = finalArtistIds;

            if (editingTrack) {
                const payloadToSave = {
                    ...payload,
                    duration: formatDurationForSave(payload.duration)
                };
                await CatalogService.update('tracks', editingTrack.id, payloadToSave);
            } else {
                const payloadToCreate = {
                    ...payload,
                    duration: formatDurationForSave(payload.duration)
                };
                await CatalogService.create('tracks', payloadToCreate);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Save failed:', error);
            const errorDetail = error.response?.data?.detail;
            const errorMessage = typeof errorDetail === 'object'
                ? JSON.stringify(errorDetail, null, 2)
                : (errorDetail || error.message || 'Failed to save track.');
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'title',
            label: 'Track Title',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                        <FileAudio size={16} />
                    </div>
                    <div className="flex flex-col">
                        <Link to={`/catalog/tracks/${row.id}`} className="font-bold text-accent hover:text-white transition-colors">
                            {row.title}
                        </Link>
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">{row.genre || '-'}</span>
                    </div>
                </div>
            )
        },
        { key: 'isrc_code', label: 'ISRC', sortable: true },
        {
            key: 'duration',
            label: 'Duration',
            sortable: true,
            render: (row) => formatDurationForDisplay(row.duration)
        },
        {
            key: 'artist_ids',
            label: 'Artist(s)',
            render: (row) => (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Users size={14} className="opacity-50" />
                    {row.artist_ids?.length > 0 ? (
                        row.artist_ids.length === 1 ? (
                            (() => {
                                const a = (artists || []).find(art => art.id === row.artist_ids[0]);
                                return a ? (a.display_name || a.aka || a.name) : 'Unknown';
                            })()
                        ) : `${row.artist_ids.length} Artists`
                    ) : 'Various'}
                </div>
            )
        },
        {
            key: 'release_id',
            label: 'Release',
            render: (row) => (
                row.release_id ? (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Disc size={14} className="opacity-50" />
                        {releaseDictionary[row.release_id] || 'Unknown Release'}
                    </div>
                ) : <span className="text-text-secondary/50">-</span>
            )
        },
        {
            key: 'work_id',
            label: 'Underlying Work',
            render: (row) => (
                row.work_id ? (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Music2 size={14} className="opacity-50" />
                        <Link to={`/catalog/works/${row.work_id}`} className="text-accent hover:text-white transition-colors font-medium">
                            {workDictionary[row.work_id] || 'Unknown Work'}
                        </Link>
                    </div>
                ) : <span className="text-text-secondary/50">-</span>
            )
        }
    ];

    const filteredTracks = (tracks || []).filter(track => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
            (track.title?.toLowerCase().includes(searchLower)) ||
            (track.isrc_code?.toLowerCase().includes(searchLower)) ||
            (track.genre?.toLowerCase().includes(searchLower))
        );

        if (!matchesSearch) return false;

        if (filterType === 'unassigned') {
            return !track.release_id;
        }
        if (filterType === 'assigned') {
            return !!track.release_id;
        }
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <PageHeader
                title="Tracks"
                subtitle="Master recordings and audio assets"
                breadcrumb={
                    <Link to="/catalog" className="inline-flex items-center gap-1 text-text-secondary hover:text-white transition-colors font-bold text-sm mb-2">
                        <ChevronLeft size={16} /> Back to Catalog
                    </Link>
                }
                actions={
                    <div className="flex gap-3 items-center">
                        <div className="relative min-w-[250px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 h-10 rounded-xl border border-white/10 bg-white/5 text-white text-sm outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-text-secondary/50"
                                placeholder="Quick search tracks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="min-w-[150px]">
                            <Select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All Tracks</option>
                                <option value="unassigned">Unassigned (No Release)</option>
                                <option value="assigned">Assigned (Has Release)</option>
                            </Select>
                        </div>
                        <Button className="btn-primary" onClick={handleCreate} icon={Plus}>
                            Add Track
                        </Button>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                data={filteredTracks}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTrack ? 'Edit Track' : 'New Track'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <Input
                    label="Track Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                />

                <div className="mb-6">
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Artist(s)</label>
                    <Autocomplete
                        options={combinedArtistOptions}
                        value={formData.artist_ids}
                        onChange={(val) => setFormData({ ...formData, artist_ids: val })}
                        placeholder="Select Artist(s) or Contact(s)..."
                        labelKey="label"
                        multiple={true}
                        allowQuickAdd={true}
                        quickAddType="artists"
                    />
                </div>

                <div className="form-row">
                    <Input
                        label="ISRC Code"
                        value={formData.isrc_code}
                        onChange={(e) => setFormData({ ...formData, isrc_code: e.target.value })}
                        placeholder="US-XXX-24-00001"
                        required
                    />
                    <Input
                        label="Duration"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        placeholder="03:45"
                        required
                    />
                </div>

                <div className="form-row">
                    <Input
                        label="Genre"
                        value={formData.genre}
                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    />
                    <Input
                        label="Release Date"
                        type="date"
                        value={formData.release_date}
                        onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Streaming Link</label>
                    <div className="relative">
                        <Input
                            type="url"
                            value={formData.streaming_link}
                            onChange={(e) => setFormData({ ...formData, streaming_link: e.target.value })}
                            placeholder="https://spotify.com/..."
                            className="pr-10"
                        />
                        <div className="absolute right-3 top-[38px] text-text-secondary opacity-50">
                            <ExternalLink size={16} />
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h4 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Relationships</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Linked Release</label>
                            <Autocomplete
                                options={releases || []}
                                value={formData.release_id}
                                onChange={(val) => setFormData({ ...formData, release_id: val })}
                                placeholder="Select Release..."
                                labelKey="title"
                                allowQuickAdd={true}
                                quickAddType="releases"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Also On (Additional Releases)</label>
                            <Autocomplete
                                options={(releases || []).filter(r => r.id !== formData.release_id)}
                                value={formData.secondary_release_ids}
                                onChange={(val) => setFormData({ ...formData, secondary_release_ids: val })}
                                placeholder="Select other releases..."
                                labelKey="title"
                                allowQuickAdd={false}
                                multiple={true}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Underlying Work</label>
                        <Autocomplete
                            options={works || []}
                            value={formData.work_id}
                            onChange={(val) => setFormData({ ...formData, work_id: val })}
                            placeholder="Select Work..."
                            labelKey="title"
                            allowQuickAdd={true}
                            quickAddType="works"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Credits (Musicians, Engineers)</h4>
                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                        {formData.credits.map((credit, index) => {
                            if (!credit) return null;
                            let name = 'Unknown';
                            if (credit.artist_id) {
                                const artist = (artists || []).find(a => a.id == credit.artist_id);
                                name = artist ? (artist.display_name || artist.name) : `Artist #${credit.artist_id}`;
                            } else if (credit.contact_id) {
                                const contact = (contacts || []).find(c => c.id == credit.contact_id);
                                name = contact ? `${contact.first_name} ${contact.last_name}` : `Contact #${credit.contact_id}`;
                            } else if (credit.label_id) {
                                const label = (labels || []).find(l => l.id == credit.label_id);
                                name = label ? label.name : `Label #${credit.label_id}`;
                            } else if (credit.organization_id) {
                                const org = (distributors || []).find(o => o.id == credit.organization_id);
                                name = org ? org.name : `Org #${credit.organization_id}`;
                            }

                            return (
                                <div key={index} className="flex items-center gap-3 mb-3 bg-white/5 p-4 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                                    <div className="px-2 py-1 bg-white/10 rounded text-[9px] font-bold text-text-secondary uppercase tracking-widest w-20 text-center">
                                        {credit.artist_id ? 'Artist' : credit.label_id ? 'Label' : credit.organization_id ? 'Org' : 'Contact'}
                                    </div>
                                    <div className="flex-1 font-bold text-sm text-white">
                                        {name}
                                    </div>
                                    <div className="flex-1 text-sm text-text-secondary">
                                        {credit.role}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newCredits = [...formData.credits];
                                            newCredits.splice(index, 1);
                                            setFormData({ ...formData, credits: newCredits });
                                        }}
                                        className="text-danger hover:text-white p-1.5 rounded-lg hover:bg-danger/20 transition-all opacity-0 group-hover:opacity-100"
                                        title="Remove"
                                    >
                                        <Plus className="rotate-45" size={16} />
                                    </button>
                                </div>
                            );
                        })}

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                <div className="w-full sm:w-40">
                                    <Select
                                        value={newCreditType}
                                        onChange={(e) => {
                                            setNewCreditType(e.target.value);
                                            setNewCreditContactId('');
                                            setNewCreditArtistId('');
                                            setNewCreditLabelId('');
                                            setNewCreditOrgId('');
                                        }}
                                    >
                                        <option value="individual">Contact</option>
                                        <option value="artist">Artist</option>
                                        <option value="label">Label</option>
                                        <option value="organization">Organization</option>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    {newCreditType === 'artist' ? (
                                        <Autocomplete
                                            options={(artists || []).map(a => ({ id: a.id, name: a.display_name || a.name }))}
                                            value={newCreditArtistId}
                                            onChange={(val) => setNewCreditArtistId(val)}
                                            placeholder="Select Artist..."
                                            allowQuickAdd={false}
                                        />
                                    ) : newCreditType === 'label' ? (
                                        <Autocomplete
                                            options={(labels || []).map(l => ({ id: l.id, name: l.name }))}
                                            value={newCreditLabelId}
                                            onChange={(val) => setNewCreditLabelId(val)}
                                            placeholder="Select Label..."
                                            allowQuickAdd={false}
                                        />
                                    ) : newCreditType === 'organization' ? (
                                        <Autocomplete
                                            options={(distributors || []).map(o => ({ id: o.id, name: o.name }))}
                                            value={newCreditOrgId}
                                            onChange={(val) => setNewCreditOrgId(val)}
                                            placeholder="Select Organization..."
                                            allowQuickAdd={false}
                                        />
                                    ) : (
                                        <Autocomplete
                                            options={(contacts || []).map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }))}
                                            value={newCreditContactId}
                                            onChange={(val) => setNewCreditContactId(val)}
                                            placeholder="Select Contact..."
                                            allowQuickAdd={true}
                                            quickAddType="individual"
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Role (e.g. Guitar)"
                                        value={newCreditRole}
                                        onChange={(e) => setNewCreditRole(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={(!newCreditContactId && !newCreditArtistId && !newCreditLabelId && !newCreditOrgId) || !newCreditRole}
                                    onClick={() => {
                                        if ((newCreditContactId || newCreditArtistId || newCreditLabelId || newCreditOrgId) && newCreditRole) {
                                            const newCredit = { role: newCreditRole };
                                            if (newCreditType === 'artist') {
                                                newCredit.artist_id = parseInt(newCreditArtistId);
                                            } else if (newCreditType === 'label') {
                                                newCredit.label_id = parseInt(newCreditLabelId);
                                            } else if (newCreditType === 'organization') {
                                                newCredit.organization_id = parseInt(newCreditOrgId);
                                            } else {
                                                newCredit.contact_id = parseInt(newCreditContactId);
                                            }

                                            setFormData({
                                                ...formData,
                                                credits: [...formData.credits, newCredit]
                                            });
                                            setNewCreditContactId('');
                                            setNewCreditArtistId('');
                                            setNewCreditLabelId('');
                                            setNewCreditOrgId('');
                                            setNewCreditRole('');
                                        }
                                    }}
                                    className="bg-accent hover:bg-accent/90 text-[#0f1115] disabled:bg-white/5 disabled:text-text-secondary disabled:cursor-not-allowed rounded-xl px-5 flex items-center justify-center transition-all shadow-glow hover:shadow-accent/40"
                                    title="Add Credit"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </EntityForm>
        </div >
    );
};

export default Tracks;
