import React, { useState, useEffect } from 'react';
import { CatalogService } from '../services/catalog';
import { DocumentsService } from '../services/operations';
import { CRMService } from '../services/crm';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';

const API_URL = 'http://localhost:8000';

const Releases = () => {
    const [releases, setReleases] = useState([]);
    const [labels, setLabels] = useState([]);
    const [artists, setArtists] = useState([]);
    const [distributors, setDistributors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingRelease, setEditingRelease] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        upc_code: '',
        release_date: '',
        release_type: 'Album',
        label_id: '',
        artist_id: '',
        distributor_id: '',
        cover_art_url: ''
    });
    const [similarReleases, setSimilarReleases] = useState([]);

    useEffect(() => {
        if (!formData.title || formData.title.length < 3 || editingRelease) {
            setSimilarReleases([]);
            return;
        }

        const matches = releases.filter(r =>
            r.title.toLowerCase().includes(formData.title.toLowerCase()) &&
            r.id !== editingRelease?.id
        );
        setSimilarReleases(matches.slice(0, 3));
    }, [formData.title, releases, editingRelease]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [releasesData, labelsData, artistsData, distributorsData] = await Promise.all([
                CatalogService.getAll('releases'),
                CatalogService.getAll('labels'),
                CatalogService.getAll('artists'),
                CRMService.getAllDistributors()
            ]);
            setReleases(releasesData);
            setLabels(labelsData);
            setArtists(artistsData);
            setDistributors(distributorsData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = () => {
        setEditingRelease(null);
        setSelectedFile(null);
        setFormData({
            title: '',
            upc_code: '',
            release_date: '',
            release_type: 'Album',
            label_id: '',
            artist_id: '',
            distributor_id: '',
            cover_art_url: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (release) => {
        setEditingRelease(release);
        setSelectedFile(null);
        setFormData({
            title: release.title,
            upc_code: release.upc_code || '',
            release_date: release.release_date ? release.release_date.split('T')[0] : '',
            release_type: release.release_type || 'Album',
            label_id: release.label_id || '',
            artist_id: release.artist_id || '',
            distributor_id: release.distributor_id || '',
            cover_art_url: release.cover_art_url || ''
        });
        setIsModalOpen(true);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDelete = async (release) => {
        if (window.confirm(`Are you sure you want to delete "${release.title}"?`)) {
            try {
                await CatalogService.delete('releases', release.id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete release:', error);
                alert('Failed to delete release');
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
                    src={`${API_URL}${row.cover_art_url}`}
                    alt="Cover"
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                />
            ) : <div style={{ width: '40px', height: '40px', background: '#ccc', borderRadius: '4px' }} />
        },
        { key: 'title', label: 'Release Title' },
        {
            key: 'artist_id',
            label: 'Artist',
            render: (row) => {
                const artist = artists.find(a => a.id === row.artist_id);
                return artist ? artist.name : 'Various';
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
        { key: 'upc_code', label: 'UPC' },
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Releases</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => window.open(`${API_URL}/api/reports/export/releases?format=excel`, '_blank')}
                    >
                        Export Excel
                    </button>
                    <button className="btn-primary" onClick={handleCreate}>
                        + Add Release
                    </button>
                </div>
            </div>

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
                    <label htmlFor="title">Title</label>
                    <input
                        type="text"
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
                                src={`${API_URL}${formData.cover_art_url}`}
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
                        options={labels}
                        value={formData.label_id}
                        onChange={(val) => setFormData({ ...formData, label_id: val })}
                        placeholder="Select Label..."
                    />
                </div>
                <div className="form-group">
                    <label>Artist</label>
                    <Autocomplete
                        options={artists}
                        value={formData.artist_id}
                        onChange={(val) => setFormData({ ...formData, artist_id: val })}
                        placeholder="Select Artist..."
                    />
                </div>
                <div className="form-group">
                    <label>Distributor</label>
                    <Autocomplete
                        options={distributors}
                        value={formData.distributor_id}
                        onChange={(val) => setFormData({ ...formData, distributor_id: val })}
                        placeholder="Select Distributor..."
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="release_type">Type</label>
                    <select
                        id="release_type"
                        value={formData.release_type}
                        onChange={(e) => setFormData({ ...formData, release_type: e.target.value })}
                    >
                        <option value="Album">Album</option>
                        <option value="EP">EP</option>
                        <option value="Single">Single</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="release_date">Release Date</label>
                    <input
                        type="date"
                        id="release_date"
                        value={formData.release_date}
                        onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="upc_code">UPC Code</label>
                    <input
                        type="text"
                        id="upc_code"
                        value={formData.upc_code}
                        onChange={(e) => setFormData({ ...formData, upc_code: e.target.value })}
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default Releases;
