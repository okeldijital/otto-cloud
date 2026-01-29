import React, { useState, useEffect } from 'react';
import { NotesService } from '../services/operations';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import { CatalogService } from '../services/catalog';
import { StickyNote, Pin, MapPin, Tag, Link } from 'lucide-react';

const Notes = () => {
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [artists, setArtists] = useState([]);
    const [releases, setReleases] = useState([]);

    const initialFormState = {
        title: '',
        content: '',
        category: 'general',
        pinned: false,
        related_entity_type: '',
        related_entity_id: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchNotes = async () => {
        setIsLoading(true);
        try {
            const data = await NotesService.getAll();
            // Sort by pinned first, then by date
            const sortedData = [...data].sort((a, b) => {
                if (a.pinned === b.pinned) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return a.pinned ? -1 : 1;
            });
            setNotes(sortedData);
        } catch (error) {
            console.error('Failed to fetch notes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
        const fetchEntities = async () => {
            try {
                const [artistsData, releasesData] = await Promise.all([
                    CatalogService.getAll('artists'),
                    CatalogService.getAll('releases')
                ]);
                setArtists(artistsData);
                setReleases(releasesData);
            } catch (err) {
                console.error("Failed to fetch entities:", err);
            }
        };
        fetchEntities();
    }, []);

    const handleCreate = () => {
        setEditingNote(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleEdit = (note) => {
        setEditingNote(note);
        setFormData({
            title: note.title || '',
            content: note.content || '',
            category: note.category || 'general',
            pinned: note.pinned || false,
            related_entity_type: note.related_entity_type || '',
            related_entity_id: note.related_entity_id || ''
        });
        setIsModalOpen(true);
    };

    const togglePin = async (note) => {
        try {
            await NotesService.update(note.id, { pinned: !note.pinned });
            fetchNotes();
        } catch (error) {
            console.error('Failed to toggle pin:', error);
        }
    };

    const handleDelete = async (note) => {
        if (window.confirm(`Are you sure you want to delete note "${note.title}"?`)) {
            try {
                await NotesService.delete(note.id);
                fetchNotes();
            } catch (error) {
                console.error('Failed to delete note:', error);
                alert('Failed to delete note');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = { ...formData };
            if (payload.related_entity_id === '' || payload.related_entity_id === '0') {
                payload.related_entity_id = null;
            } else if (payload.related_entity_id) {
                payload.related_entity_id = parseInt(payload.related_entity_id, 10);
            }

            if (payload.related_entity_type === '') {
                payload.related_entity_type = null;
            }

            if (editingNote) {
                await NotesService.update(editingNote.id, payload);
            } else {
                await NotesService.create(payload);
            }
            setIsModalOpen(false);
            fetchNotes();
        } catch (error) {
            console.error('Failed to save note:', error);
            alert('Failed to save note');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'pinned',
            label: '',
            render: (row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); togglePin(row); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: row.pinned ? '#f59e0b' : '#d1d5db' }}
                >
                    {row.pinned ? '📌' : '📍'}
                </button>
            )
        },
        { key: 'title', label: 'Title' },
        {
            key: 'category',
            label: 'Category',
            render: (row) => (
                <span style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: row.category === 'meeting' ? '#e0f2fe' : row.category === 'idea' ? '#fef3c7' : '#f3f4f6',
                    color: row.category === 'meeting' ? '#0369a1' : row.category === 'idea' ? '#92400e' : '#374151',
                    textTransform: 'capitalize'
                }}>
                    {row.category}
                </span>
            )
        },
        {
            key: 'content',
            label: 'Preview',
            render: (row) => row.content ? (row.content.substring(0, 50) + (row.content.length > 50 ? '...' : '')) : ''
        },
        {
            key: 'related_entity_type',
            label: 'Linked To',
            render: (row) => row.related_entity_type ? (
                <span className="badge-linked">
                    <Link size={10} /> {row.related_entity_type}: {row.related_entity_id}
                </span>
            ) : '-'
        }
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Notes</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add Note
                </button>
            </div>

            <DataTable
                columns={columns}
                data={notes}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingNote ? 'Edit Note' : 'New Note'}
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
                </div>
                <div className="form-group" style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="category">Category</label>
                        <select
                            id="category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="general">General</option>
                            <option value="meeting">Meeting</option>
                            <option value="idea">Idea</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.2rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.pinned}
                                onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                            />
                            Pin Note
                        </label>
                    </div>
                </div>
                <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <label>Link to Entity</label>
                        <select
                            value={formData.related_entity_type || ''}
                            onChange={(e) => setFormData({ ...formData, related_entity_type: e.target.value, related_entity_id: '' })}
                        >
                            <option value="">None</option>
                            <option value="artist">Artist</option>
                            <option value="release">Release</option>
                        </select>
                    </div>
                    {formData.related_entity_type && (
                        <div style={{ flex: 1 }}>
                            <label>{formData.related_entity_type === 'artist' ? 'Select Artist' : 'Select Release'}</label>
                            <select
                                value={formData.related_entity_id || ''}
                                onChange={(e) => setFormData({ ...formData, related_entity_id: e.target.value })}
                            >
                                <option value="">Select...</option>
                                {(formData.related_entity_type === 'artist' ? artists : releases).map(item => (
                                    <option key={item.id} value={item.id}>{item.name || item.title}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="content">Content</label>
                    <textarea
                        id="content"
                        rows="8"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Write your note here..."
                    />
                </div>
            </EntityForm>

            <style>{`
                .badge-linked {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 8px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    color: #475569;
                }
            `}</style>
        </div>
    );
};

export default Notes;
