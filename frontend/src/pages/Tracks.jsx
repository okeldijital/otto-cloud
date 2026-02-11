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
            artist_ids: track.artist_ids || [],
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
            alert(error.response?.data?.detail || 'Failed to save track.');
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '6px', background: '#f5f3ff', borderRadius: '6px', color: '#7c3aed' }}>
                        <FileAudio size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link to={`/catalog/tracks/${row.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}>
                            {row.title}
                        </Link>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.genre || '-'}</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    <Users size={14} className="text-muted" />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                        <Disc size={14} className="text-muted" />
                        {releaseDictionary[row.release_id] || 'Unknown Release'}
                    </div>
                ) : <span className="text-muted">-</span>
            )
        },
        {
            key: 'work_id',
            label: 'Underlying Work',
            render: (row) => (
                row.work_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                        <Music2 size={14} className="text-muted" />
                        <Link to={`/catalog/works/${row.work_id}`} style={{ fontWeight: 500, color: 'var(--primary-color)', textDecoration: 'none' }}>
                            {workDictionary[row.work_id] || 'Unknown Work'}
                        </Link>
                    </div>
                ) : <span className="text-muted">-</span>
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
        <div className="entity-page">
            <Link to="/catalog" className="back-link">
                <ChevronLeft size={16} /> Back to Catalog
            </Link>
            <PageHeader
                title="Tracks"
                subtitle="Master recordings and audio assets"
                breadcrumb={
                    <Link to="/catalog" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
                        <ChevronLeft size={16} /> Back to Catalog
                    </Link>
                }
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="relative" style={{ minWidth: '250px' }}>
                            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', outline: 'none' }}
                                placeholder="Quick search tracks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ minWidth: '150px' }}>
                            <select
                                className="input"
                                style={{ height: '40px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', padding: '0 1rem', color: 'var(--text-color)' }}
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All Tracks</option>
                                <option value="unassigned">Unassigned (No Release)</option>
                                <option value="assigned">Assigned (Has Release)</option>
                            </select>
                        </div>
                        <Button className="btn-primary" onClick={handleCreate} icon={FileAudio}>
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

                <div className="form-group">
                    <label>Artist(s)</label>
                    <Autocomplete
                        options={(artists || []).map(a => ({ ...a, name: a.display_name || a.aka || a.name }))}
                        value={formData.artist_ids}
                        onChange={(val) => setFormData({ ...formData, artist_ids: val })}
                        placeholder="Select Artist(s)..."
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
                    />
                    <Input
                        label="Duration"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        placeholder="03:45"
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

                <div className="form-group">
                    <label>Streaming Link</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="url"
                            value={formData.streaming_link}
                            onChange={(e) => setFormData({ ...formData, streaming_link: e.target.value })}
                            placeholder="https://spotify.com/..."
                            style={{ paddingRight: '2rem' }}
                        />
                        <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                            <ExternalLink size={14} />
                        </div>
                    </div>
                </div>

                <div className="form-section-title">Relationships</div>

                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>Linked Release</label>
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
                    <div className="form-group flex-1">
                        <label>Also On (Additional Releases)</label>
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
                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>Underlying Work</label>
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

                <div className="form-group">
                    <label>Credits (Musicians, Engineers)</label>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
                                <div key={index} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center', background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ padding: '0.25rem 0.5rem', background: '#e2e8f0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', width: '80px', textAlign: 'center' }}>
                                        {credit.artist_id ? 'Artist' : credit.label_id ? 'Label' : credit.organization_id ? 'Org' : 'Contact'}
                                    </div>
                                    <div style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem', color: '#1e293b' }}>
                                        {name}
                                    </div>
                                    <div style={{ flex: 1, fontSize: '0.875rem', color: '#64748b' }}>
                                        {credit.role}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newCredits = [...formData.credits];
                                            newCredits.splice(index, 1);
                                            setFormData({ ...formData, credits: newCredits });
                                        }}
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                                        title="Remove"
                                    >
                                        &times;
                                    </button>
                                </div>
                            );
                        })}

                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '110px' }}>
                                    <select
                                        className="input"
                                        value={newCreditType}
                                        onChange={(e) => {
                                            setNewCreditType(e.target.value);
                                            setNewCreditContactId('');
                                            setNewCreditArtistId('');
                                            setNewCreditLabelId('');
                                            setNewCreditOrgId('');
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
                                    >
                                        <option value="individual">Contact</option>
                                        <option value="artist">Artist</option>
                                        <option value="label">Label</option>
                                        <option value="organization">Organization</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
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
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Role (e.g. Guitar)"
                                    value={newCreditRole}
                                    onChange={(e) => setNewCreditRole(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    className="btn-secondary"
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
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px' }}
                                    title="Add Credit"
                                >
                                    <Plus size={16} />
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
