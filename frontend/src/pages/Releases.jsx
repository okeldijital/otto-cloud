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
import { ChevronLeft, Download, Plus, Search, Disc, Trash2 } from 'lucide-react';
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
    const [newCreditArtistId, setNewCreditArtistId] = useState('');
    const [newCreditLabelId, setNewCreditLabelId] = useState('');
    const [newCreditOrgId, setNewCreditOrgId] = useState('');
    const [newCreditType, setNewCreditType] = useState('individual'); // 'individual', 'artist', 'label', 'organization'
    const [quickAddContactSearch, setQuickAddContactSearch] = useState('');
    const [newCreditRole, setNewCreditRole] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingRelease, setEditingRelease] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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
        streaming_link: '',
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
            streaming_link: '',
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
            streaming_link: release.streaming_link || '',
            credits: Array.isArray(release.credits) ? release.credits : [],
            track_ids: releaseTrackIds
        });

        // Debugging
        console.log("Editing release with credits:", release.credits);

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

        const submissionData = { ...formData };

        // Force assignment in case of spread issue
        submissionData.credits = formData.credits;

        if (submissionData.label_id === '') submissionData.label_id = null;
        if (submissionData.artist_id === '') submissionData.artist_id = null;
        if (submissionData.distributor_id === '') submissionData.distributor_id = null;
        if (submissionData.release_date === '') submissionData.release_date = null;
        if (submissionData.upc_code === '') submissionData.upc_code = null;
        if (submissionData.catalog_number === '') submissionData.catalog_number = null;
        if (submissionData.streaming_link === '') submissionData.streaming_link = null;

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
            alert(error.response?.data?.detail || 'Failed to save release');
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
            sortable: true,
            render: (row) => (
                <Link to={`/catalog/releases/${row.id}`} className="font-bold text-accent hover:text-white transition-colors">
                    {row.title}
                </Link>
            )
        },
        {
            key: 'streaming_link',
            label: 'Link',
            render: (row) => row.streaming_link ? (
                <a href={row.streaming_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-white transition-colors font-medium">
                    Stream ↗
                </a>
            ) : '-'
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
        { key: 'release_type', label: 'Type', sortable: true },
        { key: 'release_date', label: 'Date', sortable: true },
        { key: 'catalog_number', label: 'Catalog #', sortable: true },
        { key: 'upc_code', label: 'UPC', sortable: true },
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

    const filteredReleases = (releases || []).filter(release => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (release.title?.toLowerCase().includes(searchLower)) ||
            (release.upc_code?.toLowerCase().includes(searchLower)) ||
            (release.catalog_number?.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <PageHeader
                title="Releases"
                subtitle="Manage your music releases"
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
                                placeholder="Quick search releases..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
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
                data={filteredReleases}
                isLoading={isLoading}
                onEdit={(row) => {
                    handleEdit(row);
                }}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRelease ? 'Edit Release' : 'New Release'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="space-y-8">
                    {/* Basic Information Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Basic Information</h3>
                        
                        <div className="mb-4">
                            <Input
                                label="Title"
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                autoFocus
                            />
                            {similarReleases.length > 0 && (
                                <div className="mt-2 p-3 bg-warning/10 border border-warning/20 rounded-xl text-xs text-warning/90">
                                    <strong>Potential duplicate?</strong> Similar releases found:
                                    <ul className="list-disc ml-5 mt-1">
                                        {similarReleases.map(r => <li key={r.id}>{r.title}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="cover_art" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Cover Art</label>
                            <div className="flex items-center gap-4">
                                {(editingRelease && formData.cover_art_url && !selectedFile) ? (
                                    <img
                                        src={formData.cover_art_url.startsWith('http') ? formData.cover_art_url : `${API_URL}${formData.cover_art_url}`}
                                        alt="Current Cover"
                                        className="w-16 h-16 object-cover rounded-xl border border-white/10"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-text-muted">
                                        <Disc size={24} />
                                    </div>
                                )}
                                <div>
                                    <input
                                        type="file"
                                        id="cover_art"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                                    />
                                    {selectedFile && (
                                        <p className="text-xs text-success mt-1">Selected: {selectedFile.name}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                        </div>

                        <div className="mb-4">
                            <Input
                                label="Streaming Link"
                                id="streaming_link"
                                value={formData.streaming_link}
                                onChange={(e) => setFormData({ ...formData, streaming_link: e.target.value })}
                                placeholder="https://spotify.com/album/..."
                            />
                        </div>
                    </div>

                    {/* Relationships Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Relationships</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Artist(s)</label>
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
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Tracks</label>
                                <Autocomplete
                                    options={(tracks || []).map(t => ({
                                        id: t.id,
                                        name: `${t.title} ${t.isrc_code ? `(${t.isrc_code})` : ''}`
                                    }))}
                                    value={formData.track_ids}
                                    onChange={(val) => setFormData({ ...formData, track_ids: val })}
                                    placeholder="Select Track(s)..."
                                    multiple={true}
                                    allowQuickAdd={true}
                                    quickAddType="tracks"
                                />
                                <small className="text-xs text-text-muted block mt-1">
                                    Only existing tracks can be linked. To create new tracks, use the Tracks page.
                                </small>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Label</label>
                                    <Autocomplete
                                        options={labels || []}
                                        value={formData.label_id}
                                        onChange={(val) => setFormData({ ...formData, label_id: val })}
                                        placeholder="Select Label..."
                                        allowQuickAdd={true}
                                        quickAddType="labels"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Distributor</label>
                                    <Autocomplete
                                        options={distributors || []}
                                        value={formData.distributor_id}
                                        onChange={(val) => setFormData({ ...formData, distributor_id: val })}
                                        placeholder="Select Distributor..."
                                        allowQuickAdd={true}
                                        quickAddType="organization"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Credits Section */}
                    <div>
                        <h3 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Credits (Engineers, Producers, etc.)</h3>
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
                                            <Trash2 size={16} />
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
                                            placeholder="Role (e.g. Mixer, Producer)"
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
                </div>
            </EntityForm>
        </div>
    );
};

export default Releases;
