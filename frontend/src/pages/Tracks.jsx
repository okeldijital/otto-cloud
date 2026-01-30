import React, { useState, useEffect } from 'react';
import { CatalogService } from '../services/catalog';
import { CRMService } from '../services/crm';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';
import { Music2, Disc, FileAudio, ExternalLink, Users } from 'lucide-react';

const Tracks = () => {
    const [tracks, setTracks] = useState([]);
    const [artists, setArtists] = useState([]);
    const [workDictionary, setWorkDictionary] = useState({});
    const [releaseDictionary, setReleaseDictionary] = useState({});

    // Filter dictionaries (for lookups in Create/Edit modal)
    const [works, setWorks] = useState([]);
    const [releases, setReleases] = useState([]);
    const [contacts, setContacts] = useState([]);
    // State for new credit input
    const [newCreditContactId, setNewCreditContactId] = useState('');
    const [newCreditRole, setNewCreditRole] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTrack, setEditingTrack] = useState(null);

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
        credits: []
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [tracksData, worksData, releasesData, artistsData] = await Promise.all([
                CatalogService.getAll('tracks'),
                CatalogService.getAll('works'),
                CatalogService.getAll('releases'),
                CatalogService.getAll('releases'),
                CatalogService.getAll('artists'),
                CRMService.getContacts()
            ]);

            // Create dictionaries for lookup
            const workDict = {};
            worksData.forEach(w => workDict[w.id] = w.title);
            setWorkDictionary(workDict);

            const releaseDict = {};
            releasesData.forEach(r => releaseDict[r.id] = r.title);
            setReleaseDictionary(releaseDict);

            setTracks(tracksData);
            setWorks(worksData);
            setReleases(releasesData);
            setArtists(artistsData);
            setContacts(contactsData);
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
            credits: track.credits || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (track) => {
        if (window.confirm(`Are you sure you want to delete track "${track.title}"?`)) {
            try {
                await CatalogService.delete('tracks', track.id);
                fetchData();
            } catch (error) {
                console.error('Delete failed:', error);
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
                await CatalogService.update('tracks', editingTrack.id, payload);
            } else {
                await CatalogService.create('tracks', payload);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save track.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'title',
            label: 'Track Title',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '6px', background: '#f5f3ff', borderRadius: '6px', color: '#7c3aed' }}>
                        <FileAudio size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{row.title}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.genre || '-'}</span>
                    </div>
                </div>
            )
        },
        { key: 'isrc_code', label: 'ISRC' },
        { key: 'duration', label: 'Duration' },
        {
            key: 'artist_ids',
            label: 'Artist(s)',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    <Users size={14} className="text-muted" />
                    {row.artist_ids?.length > 0 ? (
                        row.artist_ids.length === 1 ? (
                            artists.find(a => a.id === row.artist_ids[0])?.name || 'Unknown'
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
                        {workDictionary[row.work_id] || 'Unknown Work'}
                    </div>
                ) : <span className="text-muted">-</span>
            )
        }
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tracks</h1>
                    <p className="page-subtitle">Master recordings and audio assets</p>
                </div>
                <button className="btn-primary" onClick={handleCreate}>
                    <FileAudio size={18} /> Add Track
                </button>
            </div>

            <DataTable
                columns={columns}
                data={tracks}
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
                <div className="form-group">
                    <label>Track Title</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Artist(s)</label>
                    <Autocomplete
                        options={artists}
                        value={formData.artist_ids}
                        onChange={(val) => setFormData({ ...formData, artist_ids: val })}
                        placeholder="Select Artist(s)..."
                        multiple={true}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>ISRC Code</label>
                        <input
                            type="text"
                            value={formData.isrc_code}
                            onChange={(e) => setFormData({ ...formData, isrc_code: e.target.value })}
                            placeholder="US-XXX-24-00001"
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label>Duration</label>
                        <input
                            type="text"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            placeholder="03:45"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>Genre</label>
                        <input
                            type="text"
                            value={formData.genre}
                            onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label>Release Date</label>
                        <input
                            type="date"
                            value={formData.release_date}
                            onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                        />
                    </div>
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
                            options={releases}
                            value={formData.release_id}
                            onChange={(val) => setFormData({ ...formData, release_id: val })}
                            placeholder="Select Release..."
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label>Underlying Work</label>
                        <Autocomplete
                            options={works}
                            value={formData.work_id}
                            onChange={(val) => setFormData({ ...formData, work_id: val })}
                            placeholder="Select Work..."
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Credits (Musicians, Engineers)</label>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {formData.credits.map((credit, index) => (
                            <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                <div style={{ flex: 1, padding: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.875rem' }}>
                                    {contacts.find(c => c.id == credit.contact_id)?.first_name} {contacts.find(c => c.id == credit.contact_id)?.last_name}
                                </div>
                                <div style={{ flex: 1, padding: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.875rem' }}>
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
                                >
                                    &times;
                                </button>
                            </div>
                        ))}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <select
                                value={newCreditContactId}
                                onChange={(e) => setNewCreditContactId(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <option value="">Select Contact...</option>
                                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="Role (e.g. Guitar)"
                                value={newCreditRole}
                                onChange={(e) => setNewCreditRole(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={!newCreditContactId || !newCreditRole}
                                onClick={() => {
                                    if (newCreditContactId && newCreditRole) {
                                        setFormData({
                                            ...formData,
                                            credits: [...formData.credits, { contact_id: parseInt(newCreditContactId), role: newCreditRole }]
                                        });
                                        setNewCreditContactId('');
                                        setNewCreditRole('');
                                    }
                                }}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            </EntityForm>
        </div >
    );
};

export default Tracks;
