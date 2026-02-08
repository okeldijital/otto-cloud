import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { DocumentsService } from '../services/operations';
import { NetworkService } from '../services/network';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';
import { ChevronLeft, Download, Plus } from 'lucide-react';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import Input, { Select, Textarea } from '../components/ui/Input';
import Card from '../components/ui/Card';
import HealthBadge from '../components/ui/HealthBadge';

const API_URL = BASE_URL;

const Releases = () => {
    const [releases, setReleases] = useState([]);
    const [labels, setLabels] = useState([]);
    const [artists, setArtists] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [tracks, setTracks] = useState([]);
    // State for new credit input
    const [newCreditContactId, setNewCreditContactId] = useState('');
    const [quickAddContactSearch, setQuickAddContactSearch] = useState('');
    const [newCreditRole, setNewCreditRole] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingRelease, setEditingRelease] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        catalog_number: '',
        upc_code: '',
        release_date: '',
        release_type: 'Album',
        label_id: '',
        artist_id: '',
        artist_ids: [],
        distributor_id: '',
        cover_art_url: '',
        credits: [],
        track_ids: []
    });
    const [similarReleases, setSimilarReleases] = useState([]);

    useEffect(() => {
        if (!formData.title || formData.title.length < 3 || editingRelease) {
            setSimilarReleases([]);
            return;
        }

        const matches = (releases || []).filter(r =>
            r.title.toLowerCase().includes(formData.title.toLowerCase()) &&
            r.id !== editingRelease?.id
        );
        setSimilarReleases(matches.slice(0, 3));
    }, [formData.title, releases, editingRelease]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [releasesData, labelsData, artistsData, distributorsData, contactsData, tracksData] = await Promise.all([
                CatalogService.getAll('releases'),
                CatalogService.getAll('labels'),
                CatalogService.getAll('artists'),
                NetworkService.getOrganizations(),
                NetworkService.getIndividuals(),
                CatalogService.getAll('tracks')
            ]);
            setReleases(releasesData);
            setLabels(labelsData);
            setArtists(artistsData);
            setDistributors(distributorsData);
            setContacts(contactsData);
            setTracks(tracksData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const location = useLocation();

    useEffect(() => {
        fetchData();

        // Handle direct "new" action if coming from another page (like Artist Detail)
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'new') {
            const artistId = params.get('artist_id');
            handleCreate();
            if (artistId) {
                setFormData(prev => ({
                    ...prev,
                    artist_ids: [parseInt(artistId)]
                }));
            }
        }
    }, [location.search]);
    // Note: handleCreate is called, which sets isModalOpen(true)

    const handleCreate = () => {
        setEditingRelease(null);
        setSelectedFile(null);
        setFormData({
            title: '',
            catalog_number: '',
            upc_code: '',
            release_date: '',
            release_type: 'Album',
            label_id: '',
            artist_id: '',
            artist_ids: [],
            distributor_id: '',
            cover_art_url: '',
            credits: [],
            track_ids: []
        });
        setIsModalOpen(true);
    };

    const handleEdit = async (release) => {
        setEditingRelease(release);
        setSelectedFile(null);

        // Fetch tracks for this release specifically to get the list
        let releaseTrackIds = [];
        try {
            const releaseTracks = await CatalogService.getReleaseTracks(release.id);
            releaseTrackIds = Array.isArray(releaseTracks) ? releaseTracks.map(t => t.id) : [];
        } catch (e) {
            console.error("Failed to fetch tracks for release:", e);
        }

        setFormData({
            title: release.title,
            catalog_number: release.catalog_number || '',
            upc_code: release.upc_code || '',
            release_date: release.release_date ? String(release.release_date).split('T')[0] : '',
            release_type: release.release_type || 'Album',
            label_id: release.label_id || '',
            artist_id: release.artist_id || '',
            artist_ids: release.artist_ids || (release.artist_id ? [release.artist_id] : []),
            distributor_id: release.distributor_id || '',
            cover_art_url: release.cover_art_url || '',
            credits: release.credits || [],
            track_ids: releaseTrackIds
        });
        setIsModalOpen(true);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDelete = async (release) => {
        if (await confirmAction(`Are you sure you want to delete "${release.title}"?`, 'Delete Release')) {
            try {
                await CatalogService.delete('releases', release.id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete release:', error);
                alert(error.response?.data?.detail || 'Failed to delete release');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Prepare data for submission
        const submissionData = { ...formData };
        if (submissionData.label_id === '') submissionData.label_id = null;
        if (submissionData.artist_id === '') submissionData.artist_id = null;
        if (submissionData.distributor_id === '') submissionData.distributor_id = null;
        if (submissionData.release_date === '') submissionData.release_date = null;
        if (submissionData.upc_code === '') submissionData.upc_code = null;
        if (submissionData.catalog_number === '') submissionData.catalog_number = null;

        try {
            // Upload cover art if selected
            if (selectedFile) {
                const uploadedFile = await DocumentsService.upload(selectedFile);
                submissionData.cover_art_url = uploadedFile.file_path; // Use the path returned by upload
            }

            if (editingRelease) {
                await CatalogService.update('releases', editingRelease.id, submissionData);
            } else {
                await CatalogService.create('releases', submissionData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save release:', error);
            alert('Failed to save release');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'cover_art_url',
            label: 'Art',
            render: (row) => row.cover_art_url ? (
                <img
                    src={row.cover_art_url.startsWith('http') ? row.cover_art_url : `${API_URL}${row.cover_art_url}`}
                    alt="Cover"
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                />
            ) : <div style={{ width: '40px', height: '40px', background: '#ccc', borderRadius: '4px' }} />
        },
        {
            key: 'title',
            label: 'Release Title',
            render: (row) => (
                <Link to={`/catalog/releases/${row.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}>
                    {row.title}
                </Link>
            )
        },
        {
            key: 'artist_ids',
            label: 'Artist(s)',
            render: (row) => {
                const ids = row.artist_ids || (row.artist_id ? [row.artist_id] : []);
                if (ids.length === 0) return 'Various';
                if (ids.length === 1) {
                    const artist = artists.find(a => a.id === ids[0]);
                    return artist ? (artist.display_name || artist.aka || artist.name) : 'Unknown';
                }
                return `${ids.length} Artists`;
            }
        },
        {
            key: 'label_id',
            label: 'Label',
            render: (row) => {
                const label = labels.find(l => l.id === row.label_id);
                return label ? label.name : '-';
            }
        },
        { key: 'release_type', label: 'Type' },
        { key: 'release_date', label: 'Date' },
        { key: 'catalog_number', label: 'Catalog #' },
        { key: 'upc_code', label: 'UPC' },
        {
            key: 'status_quo',
            label: 'Health',
            render: (row) => {
                const status = row.status_quo?.status || 'GREEN'; // Default to Green if missing (legacy)
                const reasons = row.status_quo?.reasons || [];
                return (
                    <HealthBadge status={status} reasons={reasons} />
                );
            }
        }
    ];

    return (
        <div className="entity-page">
            <PageHeader
                title="Releases"
                subtitle="Manage your music releases"
                breadcrumb={
                    <Link to="/catalog" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
                        <ChevronLeft size={16} /> Back to Catalog
                    </Link>
                }
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Button
                            variant="secondary"
                            icon={Download}
                            onClick={async () => {
                                try {
                                    await ReportsService.exportData('releases', 'excel');
                                } catch (err) {
                                    console.error(err);
                                    if (err.response?.status === 401) {
                                        alert("Session expired. Please log in again.");
                                    } else {
                                        alert("Export failed: " + (err.response?.data?.detail || err.message));
                                    }
                                }
                            }}
                        >
                            Export Excel
                        </Button>
                        <Button
                            variant="primary"
                            icon={Plus}
                            onClick={handleCreate}
                        >
                            Add Release
                        </Button>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                data={releases}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRelease ? 'Edit Release' : 'New Release'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <Input
                        label="Title"
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        autoFocus
                    />
                    {similarReleases.length > 0 && (
                        <div style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '0.375rem',
                            fontSize: '0.8125rem',
                            color: '#92400e'
                        }}>
                            <strong>Potential duplicate?</strong> Similar releases found:
                            <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                                {similarReleases.map(r => <li key={r.id}>{r.title}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="cover_art">Cover Art</label>
                    <input
                        type="file"
                        id="cover_art"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="file-input"
                    />
                    {editingRelease && formData.cover_art_url && !selectedFile && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <img
                                src={formData.cover_art_url.startsWith('http') ? formData.cover_art_url : `${API_URL}${formData.cover_art_url}`}
                                alt="Current Cover"
                                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                        </div>
                    )}
                    {selectedFile && (
                        <small className="text-green-600">
                            Selected: {selectedFile.name}
                        </small>
                    )}
                </div>

                <div className="form-group">
                    <label>Label</label>
                    <Autocomplete
                        options={labels || []}
                        value={formData.label_id}
                        onChange={(val) => setFormData({ ...formData, label_id: val })}
                        placeholder="Select Label..."
                        allowQuickAdd={true}
                        quickAddType="labels"
                    />
                </div>
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
                <div className="form-group">
                    <label>Tracks</label>
                    <Autocomplete
                        options={(tracks || []).map(t => ({
                            id: t.id,
                            name: `${t.title} ${t.isrc_code ? `(${t.isrc_code})` : ''}`
                        }))}
                        value={formData.track_ids}
                        onChange={(val) => setFormData({ ...formData, track_ids: val })}
                        placeholder="Select Track(s)..."
                        multiple={true}
                    />
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                        Only existing tracks can be linked. To create new tracks, use the Tracks page.
                    </small>
                </div>
                <div className="form-group">
                    <label>Distributor</label>
                    <Autocomplete
                        options={distributors || []}
                        value={formData.distributor_id}
                        onChange={(val) => setFormData({ ...formData, distributor_id: val })}
                        placeholder="Select Distributor..."
                        allowQuickAdd={true}
                        quickAddType="organization"
                    />
                </div>

                <div className="form-group">
                    <label>Credits (Engineers, Producers, etc.)</label>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {formData.credits.map((credit, index) => {
                            if (!credit || !credit.contact_id) return null;
                            const contact = (contacts || []).find(c => c.id == credit.contact_id);
                            return (
                                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                    <div style={{ flex: 1, padding: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.875rem' }}>
                                        {contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown Contact'}
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
                            );
                        })}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <Autocomplete
                                    options={(contacts || []).map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }))}
                                    value={newCreditContactId}
                                    onChange={(val) => setNewCreditContactId(val)}
                                    placeholder="Select Contact..."
                                    allowQuickAdd={true}
                                    quickAddType="individual"
                                />
                            </div>
                            <input
                                className="input"
                                type="text"
                                placeholder="Role (e.g. Mixer)"
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
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '36px' }}
                                title="Add Credit"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>
                <Select
                    label="Type"
                    id="release_type"
                    value={formData.release_type}
                    onChange={(e) => setFormData({ ...formData, release_type: e.target.value })}
                >
                    <option value="Album">Album</option>
                    <option value="EP">EP</option>
                    <option value="Single">Single</option>
                </Select>
                <Input
                    label="Release Date"
                    type="date"
                    id="release_date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
                <Input
                    label="Catalog Number"
                    id="catalog_number"
                    value={formData.catalog_number}
                    onChange={(e) => setFormData({ ...formData, catalog_number: e.target.value })}
                    placeholder="M2KR0001"
                />
                <Input
                    label="UPC Code"
                    id="upc_code"
                    value={formData.upc_code}
                    onChange={(e) => setFormData({ ...formData, upc_code: e.target.value })}
                />
            </EntityForm>
        </div>
    );
};

export default Releases;
