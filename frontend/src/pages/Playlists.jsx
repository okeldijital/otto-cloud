import React, { useState, useEffect } from 'react';
import { PlaylistsService } from '../services/operations';
import { CatalogService } from '../services/catalog';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';

const Playlists = () => {
    const [playlists, setPlaylists] = useState([]);
    const [allTracks, setAllTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState(null);

    const initialFormState = {
        name: '',
        description: '',
        is_public: false,
        track_ids: []
    };
    const [formData, setFormData] = useState(initialFormState);

    // Track Selection State (local to form)
    const [availableTracks, setAvailableTracks] = useState([]);
    const [selectedTracks, setSelectedTracks] = useState([]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [playlistsData, tracksData] = await Promise.all([
                PlaylistsService.getAll(),
                CatalogService.getAll('tracks')
            ]);
            setPlaylists(playlistsData);
            setAllTracks(tracksData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // When modal opens/closes or tracks load, reset the selection state
    useEffect(() => {
        if (isModalOpen) {
            const currentTrackIds = new Set(formData.track_ids || []);
            const selected = allTracks.filter(t => currentTrackIds.has(t.id));
            const available = allTracks.filter(t => !currentTrackIds.has(t.id));
            setSelectedTracks(selected);
            setAvailableTracks(available);
        }
    }, [isModalOpen, allTracks, formData.track_ids]);

    const handleCreate = () => {
        setEditingPlaylist(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleEdit = (playlist) => {
        setEditingPlaylist(playlist);
        setFormData({
            name: playlist.name || '',
            description: playlist.description || '',
            is_public: playlist.is_public || false,
            track_ids: playlist.track_ids || [] // Ensure this is an array
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (playlist) => {
        if (window.confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) {
            try {
                await PlaylistsService.delete(playlist.id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete playlist:', error);
                alert('Failed to delete playlist');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const submissionData = {
            ...formData,
            track_ids: selectedTracks.map(t => t.id)
        };

        try {
            if (editingPlaylist) {
                await PlaylistsService.update(editingPlaylist.id, submissionData);
            } else {
                await PlaylistsService.create(submissionData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save playlist:', error);
            alert('Failed to save playlist');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Track Selection Helpers
    const moveToSelected = (track) => {
        setAvailableTracks(availableTracks.filter(t => t.id !== track.id));
        setSelectedTracks([...selectedTracks, track]);
    };

    const moveToAvailable = (track) => {
        setSelectedTracks(selectedTracks.filter(t => t.id !== track.id));
        setAvailableTracks([...availableTracks, track]);
    };

    const columns = [
        { key: 'name', label: 'Playlist Name' },
        {
            key: 'track_ids',
            label: 'Tracks',
            render: (row) => (row.track_ids || []).length
        },
        {
            key: 'is_public',
            label: 'Visiblity',
            render: (row) => row.is_public ? 'Public' : 'Private'
        },
        { key: 'description', label: 'Description' }
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Playlists</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add Playlist
                </button>
            </div>

            <DataTable
                columns={columns}
                data={playlists}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPlaylist ? 'Edit Playlist' : 'New Playlist'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        rows="2"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={formData.is_public}
                            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                            style={{ width: 'auto', marginRight: '0.5rem' }}
                        />
                        Public Playlist
                    </label>
                </div>

                <div className="form-group">
                    <label>Manage Tracks</label>
                    <div style={{ display: 'flex', gap: '1rem', height: '300px' }}>
                        {/* Available Tracks */}
                        <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: '#f8fafc', padding: '0.5rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                                Available ({availableTracks.length})
                            </div>
                            <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                                {availableTracks.length === 0 && <div className="text-gray-400 text-sm">No tracks available</div>}
                                {availableTracks.map(track => (
                                    <div
                                        key={track.id}
                                        onClick={() => moveToSelected(track)}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            marginBottom: '2px',
                                            fontSize: '0.875rem'
                                        }}
                                        className="hover:bg-blue-50"
                                    >
                                        + {track.title}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Selected Tracks */}
                        <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: '#f8fafc', padding: '0.5rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                                Soundtrack ({selectedTracks.length})
                            </div>
                            <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                                {selectedTracks.length === 0 && <div className="text-gray-400 text-sm">No tracks selected</div>}
                                {selectedTracks.map(track => (
                                    <div
                                        key={track.id}
                                        onClick={() => moveToAvailable(track)}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            marginBottom: '2px',
                                            fontSize: '0.875rem',
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                        }}
                                        className="hover:bg-red-50"
                                    >
                                        <span>{track.title}</span>
                                        <span style={{ color: '#ef4444' }}>×</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <small className="text-gray-500">Click to move tracks between lists.</small>
                </div>
            </EntityForm>
        </div>
    );
};

export default Playlists;
