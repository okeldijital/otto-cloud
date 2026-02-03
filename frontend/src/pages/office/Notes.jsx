import React, { useEffect, useMemo, useState } from 'react';
import EntityForm from '../../components/EntityForm';
import { officeNotesService } from '../../services/officeNotesService';
import { Search, Plus, Filter, Calendar, LayoutGrid, Tag, Link2, Trash2, Edit3, Eye, X } from 'lucide-react';

const LINKED_TYPES = [
    { label: 'All Entities', value: '' },
    { label: 'Artist', value: 'artist' },
    { label: 'Track', value: 'track' },
    { label: 'Release', value: 'release' },
    { label: 'Work', value: 'work' },
    { label: 'Contract', value: 'contract' },
    { label: 'Task', value: 'task' },
];

const ENTITY_ROUTES = {
    artist: (id) => `/catalog/artists/${id}`,
    track: (id) => `/catalog/tracks/${id}`,
    release: (id) => `/catalog/releases/${id}`,
    work: (id) => `/catalog/works/${id}`,
    contract: (id) => `/admin-of-works/contracts/${id}`,
    task: () => `/office/tasks`,
};

const NOTE_LINK_MEMORY_KEY = 'office_note_last_link';

// Simple Markdown-ish renderer for basic formatting
const renderContent = (content) => {
    if (!content) return null;
    let html = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\s*[-*]\s+(.*)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

    return <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: html }} />;
};

const Notes = () => {
    const [notes, setNotes] = useState([]);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'timeline'
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        q: '',
        entity_type: '',
        entity_id: '',
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        tags: '',
        linked_entity_type: '',
        linked_entity_id: '',
    });

    const fetchNotes = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (filters.q) params.q = filters.q;
            if (filters.entity_type) params.entity_type = filters.entity_type;
            if (filters.entity_id) params.entity_id = filters.entity_id;
            const data = await officeNotesService.list(params);
            setNotes(data);
        } catch (error) {
            console.error('Failed to load notes', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [filters.q, filters.entity_type, filters.entity_id]);

    const openCreate = () => {
        const memory = JSON.parse(localStorage.getItem(NOTE_LINK_MEMORY_KEY) || '{}');
        setSelectedNote(null);
        setFormData({
            title: '',
            body: '',
            tags: '',
            linked_entity_type: memory.entity_type || '',
            linked_entity_id: memory.entity_id || '',
        });
        setIsModalOpen(true);
    };

    const openEdit = (note) => {
        setSelectedNote(note);
        setFormData({
            title: note.title || '',
            body: note.body || '',
            tags: note.tags || '',
            linked_entity_type: '',
            linked_entity_id: '',
        });
        setIsModalOpen(true);
    };

    const openDetail = (note) => {
        setSelectedNote(note);
        setIsDetailOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.body) return;
        setIsSubmitting(true);
        try {
            const payload = {
                title: formData.title || null,
                body: formData.body,
                tags: formData.tags || null,
            };
            let savedNote = null;
            if (selectedNote) {
                savedNote = await officeNotesService.update(selectedNote.id, payload);
            } else {
                savedNote = await officeNotesService.create(payload);
            }

            if (formData.linked_entity_type && formData.linked_entity_id) {
                const linkPayload = {
                    entity_type: formData.linked_entity_type,
                    entity_id: Number(formData.linked_entity_id),
                };
                await officeNotesService.link(savedNote.id, linkPayload);
                localStorage.setItem(NOTE_LINK_MEMORY_KEY, JSON.stringify(linkPayload));
            }

            setIsModalOpen(false);
            await fetchNotes();
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (note) => {
        if (!window.confirm(`Delete note?`)) return;
        try {
            await officeNotesService.remove(note.id);
            if (isDetailOpen) setIsDetailOpen(false);
            await fetchNotes();
        } catch (error) {
            console.error('Delete failed', error);
        }
    };

    const handleLink = async (note) => {
        if (!formData.linked_entity_type || !formData.linked_entity_id) return;
        try {
            const payload = {
                entity_type: formData.linked_entity_type,
                entity_id: Number(formData.linked_entity_id)
            };
            await officeNotesService.link(note.id, payload);
            localStorage.setItem(NOTE_LINK_MEMORY_KEY, JSON.stringify(payload));

            // Refresh detailed note
            const updated = await officeNotesService.get(note.id);
            setSelectedNote(updated);
            await fetchNotes();
        } catch (error) {
            console.error('Link failed', error);
        }
    };

    const handleUnlink = async (note, link) => {
        try {
            await officeNotesService.unlink(note.id, {
                entity_type: link.entity_type,
                entity_id: link.entity_id,
            });
            const updated = await officeNotesService.get(note.id);
            setSelectedNote(updated);
            await fetchNotes();
        } catch (error) {
            console.error('Unlink failed', error);
        }
    };

    const getNotePreview = (body) => {
        const text = body || '';
        return text.length > 120 ? text.slice(0, 120) + '...' : text;
    };

    return (
        <div className="page-container p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        Office — Notes
                    </h1>
                    <p className="text-gray-400">Collaborative intelligence and operational memos.</p>
                </div>
                <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
                    <Plus size={18} /> New Note
                </button>
            </div>

            {/* Controls Bar */}
            <div className="bg-secondary-bg border border-border rounded-xl p-4 mb-8 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[280px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by title, content or tags..."
                        className="w-full bg-black/20 border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary/50 transition-colors"
                        value={filters.q}
                        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-500" />
                    <select
                        className="bg-black/20 border border-border rounded-lg px-3 py-2 text-sm"
                        value={filters.entity_type}
                        onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                    >
                        {LINKED_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>

                <div className="w-px h-6 bg-border mx-2 hidden sm:block" />

                <div className="flex bg-black/20 p-1 rounded-lg border border-border">
                    <button
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setViewMode('timeline')}
                    >
                        <Calendar size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                    <p>Fetching notes...</p>
                </div>
            ) : notes.length === 0 ? (
                <div className="bg-secondary-bg border border-border border-dashed rounded-2xl p-24 text-center">
                    <div className="inline-flex p-4 bg-primary/10 rounded-full text-primary mb-4">
                        <Plus size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No notes found</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">Create your first operational note to start documenting your workflow.</p>
                    <button className="btn-secondary" onClick={openCreate}>Create Note</button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className="bg-secondary-bg border border-border rounded-xl p-6 group hover:border-primary/40 transition-all cursor-pointer flex flex-col h-full"
                            onClick={() => openDetail(note)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                                    {note.title || 'Untitled Note'}
                                </h3>
                            </div>

                            <p className="text-gray-400 text-sm mb-6 flex-1 line-clamp-4">
                                {getNotePreview(note.body)}
                            </p>

                            <div className="mt-auto">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {note.tags?.split(',').map(tag => (
                                        <span key={tag} className="px-2 py-0.5 bg-black/30 border border-border rounded text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-wider">
                                            <Tag size={10} /> {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-gray-500">
                                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-1">
                                        <Link2 size={12} /> {note.links?.length || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="max-w-3xl mx-auto space-y-8 relative">
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-border -z-0" />
                    {notes.map((note, idx) => (
                        <div key={note.id} className="relative z-10 flex gap-12 group" onClick={() => openDetail(note)}>
                            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-secondary-bg border border-border flex flex-col items-center justify-center text-xs text-gray-500 font-medium group-hover:border-primary/50 transition-colors">
                                <div className="text-gray-400 font-bold">{new Date(note.created_at).getDate()}</div>
                                <div>{new Date(note.created_at).toLocaleString('default', { month: 'short' }).toUpperCase()}</div>
                            </div>
                            <div className="bg-secondary-bg border border-border rounded-xl p-6 flex-1 hover:border-primary/40 transition-all cursor-pointer">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-lg">{note.title || 'Untitled Note'}</h3>
                                    <span className="text-[11px] text-gray-500">{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{getNotePreview(note.body)}</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-2">
                                        {/* Avatar placeholder */}
                                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-border flex items-center justify-center text-[10px] text-primary font-bold">U</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {note.links?.slice(0, 2).map(link => (
                                            <span key={`${link.entity_type}-${link.entity_id}`} className="px-2 py-0.5 bg-black/20 border border-border rounded-full text-[10px] text-gray-400">
                                                {link.entity_type}: {link.entity_id}
                                            </span>
                                        ))}
                                        {note.links?.length > 2 && <span className="text-[10px] text-gray-600">+{note.links.length - 2} more</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedNote ? 'Edit Note' : 'New Note'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="space-y-4">
                    <div className="form-group">
                        <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">Title</label>
                        <input
                            type="text"
                            placeholder="Enter a descriptive title..."
                            className="w-full bg-black/20 border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">Body (Markdown supported)</label>
                        <textarea
                            rows="10"
                            placeholder="Type your note here... Use **bold** or *italic* for formatting."
                            className="w-full bg-black/20 border border-border rounded-lg px-4 py-3 outline-none focus:border-primary/50 text-sm resize-none"
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="text-xs uppercase tracking-wider text-gray-500 mb-1 block">Tags</label>
                        <input
                            type="text"
                            placeholder="marketing, compliance, urgent..."
                            className="w-full bg-black/20 border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 text-sm"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        />
                    </div>

                    {!selectedNote && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                                <Link2 size={16} /> Link to Entity
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 mb-1 block">Type</label>
                                    <select
                                        className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 text-xs"
                                        value={formData.linked_entity_type}
                                        onChange={(e) => setFormData({ ...formData, linked_entity_type: e.target.value })}
                                    >
                                        <option value="">None</option>
                                        {LINKED_TYPES.filter(t => t.value).map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 mb-1 block">ID</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50"
                                        value={formData.linked_entity_id}
                                        onChange={(e) => setFormData({ ...formData, linked_entity_id: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </EntityForm>

            {/* Detail Overlay */}
            {isDetailOpen && selectedNote && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
                    <div className="bg-secondary-bg border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-black/20">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{selectedNote.title || 'Untitled Note'}</h2>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(selectedNote.created_at).toLocaleString()}</span>
                                    <span className="flex items-center gap-1 underline cursor-pointer hover:text-white">Note #{selectedNote.id}</span>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-white/10 rounded-full transition-colors" onClick={() => setIsDetailOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10">
                            <div className="prose prose-invert max-w-none text-gray-200">
                                {renderContent(selectedNote.body)}
                            </div>

                            {selectedNote.tags && (
                                <div className="mt-12 flex flex-wrap gap-2">
                                    {selectedNote.tags.split(',').map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-black/40 border border-border rounded-full text-[11px] text-gray-400 capitalize"># {tag.trim()}</span>
                                    ))}
                                </div>
                            )}

                            <div className="mt-12 pt-8 border-t border-border">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                                    <Link2 size={16} /> Linked Entities
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                    {selectedNote.links?.map(link => (
                                        <div key={`${link.entity_type}-${link.entity_id}`} className="group relative bg-black/20 border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/40 transition-all">
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    const route = ENTITY_ROUTES[link.entity_type];
                                                    if (route) window.location.href = route(link.entity_id);
                                                }}
                                            >
                                                <div className="text-[10px] uppercase text-primary font-bold">{link.entity_type}</div>
                                                <div className="text-lg font-mono">ID: {link.entity_id}</div>
                                            </div>
                                            <button
                                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); handleUnlink(selectedNote, link); }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="bg-black/10 border border-border border-dashed rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <select
                                                className="bg-black/40 border border-border rounded-lg px-2 py-1.5 text-xs outline-none"
                                                value={formData.linked_entity_type}
                                                onChange={(e) => setFormData({ ...formData, linked_entity_type: e.target.value })}
                                            >
                                                <option value="">Type</option>
                                                {LINKED_TYPES.filter(t => t.value).map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="ID"
                                                className="bg-black/40 border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                                                value={formData.linked_entity_id}
                                                onChange={(e) => setFormData({ ...formData, linked_entity_id: e.target.value })}
                                            />
                                        </div>
                                        <button
                                            className="w-full btn-secondary text-xs py-1.5 disabled:opacity-50"
                                            disabled={!formData.linked_entity_type || !formData.linked_entity_id}
                                            onClick={() => handleLink(selectedNote)}
                                        >
                                            Add Connection
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border bg-black/20 flex gap-4 justify-end">
                            <button className="btn-secondary flex items-center gap-2" onClick={() => handleDelete(selectedNote)}>
                                <Trash2 size={16} /> Delete
                            </button>
                            <button className="btn-secondary flex items-center gap-2" onClick={() => openEdit(selectedNote)}>
                                <Edit3 size={16} /> Edit
                            </button>
                            <button className="btn-primary" onClick={() => setIsDetailOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notes;
