import React, { useEffect, useMemo, useState } from 'react';
import EntityForm from '../../components/EntityForm';
import { officeDocumentsService } from '../../services/officeDocumentsService';

const DOC_TYPES = [
    { label: 'Contract', value: 'contract' },
    { label: 'Registration Proof', value: 'registration_proof' },
    { label: 'Invoice', value: 'invoice' },
    { label: 'Report', value: 'report' },
    { label: 'Other', value: 'other' },
];

const LINKED_TYPES = [
    { label: 'None', value: '' },
    { label: 'Artist', value: 'artist' },
    { label: 'Track', value: 'track' },
    { label: 'Release', value: 'release' },
    { label: 'Work', value: 'work' },
    { label: 'Contract', value: 'contract' },
    { label: 'Task', value: 'task' },
    { label: 'Note', value: 'note' },
];

const OfficeDocuments = () => {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [filters, setFilters] = useState({
        q: '',
        doc_type: '',
        entity_type: '',
        entity_id: '',
    });
    const [formData, setFormData] = useState({
        doc_type: 'contract',
        title: '',
        description: '',
        linked_entity_type: '',
        linked_entity_id: '',
    });
    const [linkForm, setLinkForm] = useState({
        entity_type: '',
        entity_id: '',
    });

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (filters.q) params.q = filters.q;
            if (filters.doc_type) params.doc_type = filters.doc_type;
            if (filters.entity_type) params.entity_type = filters.entity_type;
            if (filters.entity_id) params.entity_id = filters.entity_id;
            const data = await officeDocumentsService.list(params);
            setDocuments(data);
        } catch (error) {
            console.error('Failed to load office documents', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [filters.q, filters.doc_type, filters.entity_type, filters.entity_id]);

    const openUpload = () => {
        setFormData({
            doc_type: 'contract',
            title: '',
            description: '',
            linked_entity_type: '',
            linked_entity_id: '',
        });
        setSelectedFile(null);
        setIsEditing(false);
        setIsUploadOpen(true);
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!selectedFile) {
            alert('Please choose a file to upload.');
            return;
        }
        if (!formData.doc_type) {
            alert('Document type is required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append('file', selectedFile);
            payload.append('doc_type', formData.doc_type);
            if (formData.title) payload.append('title', formData.title);
            if (formData.description) payload.append('description', formData.description);

            await officeDocumentsService.upload(payload);
            setIsUploadOpen(false);
            await fetchDocuments();
        } catch (error) {
            console.error('Upload failed', error);
            alert(error.response?.data?.detail || 'Upload failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (doc) => {
        if (!window.confirm(`Delete "${doc.title || doc.file_name}"?`)) {
            return;
        }
        try {
            await officeDocumentsService.remove(doc.id);
            await fetchDocuments();
        } catch (error) {
            console.error('Delete failed', error);
            alert('Delete failed');
        }
    };

    const openDetail = (doc) => {
        setSelectedDoc(doc);
        setLinkForm({ entity_type: '', entity_id: '' });
        setIsDetailOpen(true);
    };

    const openEdit = (doc) => {
        setSelectedDoc(doc);
        setFormData({
            doc_type: doc.doc_type || 'other',
            title: doc.title || '',
            description: doc.description || '',
            linked_entity_type: '',
            linked_entity_id: '',
        });
        setIsEditing(true);
        setIsUploadOpen(true);
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await officeDocumentsService.update(selectedDoc.id, {
                doc_type: formData.doc_type,
                title: formData.title || null,
                description: formData.description || null,
            });
            setIsUploadOpen(false);
            setIsEditing(false);
            await fetchDocuments();
        } catch (error) {
            console.error('Update failed', error);
            alert(error.response?.data?.detail || 'Update failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLink = async () => {
        if (!selectedDoc || !linkForm.entity_type || !linkForm.entity_id) return;
        try {
            await officeDocumentsService.link(selectedDoc.id, {
                entity_type: linkForm.entity_type,
                entity_id: Number(linkForm.entity_id),
            });
            await fetchDocuments();
            setSelectedDoc(await officeDocumentsService.get(selectedDoc.id));
            setLinkForm({ entity_type: '', entity_id: '' });
        } catch (error) {
            console.error('Link failed', error);
            alert(error.response?.data?.detail || 'Link failed');
        }
    };

    const handleUnlink = async (link) => {
        try {
            await officeDocumentsService.unlink(selectedDoc.id, {
                entity_type: link.entity_type,
                entity_id: link.entity_id,
            });
            await fetchDocuments();
            setSelectedDoc(await officeDocumentsService.get(selectedDoc.id));
        } catch (error) {
            console.error('Unlink failed', error);
            alert(error.response?.data?.detail || 'Unlink failed');
        }
    };

    const downloadUrl = useMemo(() => {
        if (!selectedDoc) return '';
        return officeDocumentsService.downloadUrl(selectedDoc.id);
    }, [selectedDoc]);
    const previewUrl = useMemo(() => {
        if (!selectedDoc) return '';
        return officeDocumentsService.previewUrl(selectedDoc.id);
    }, [selectedDoc]);

    const renderPreview = () => {
        if (!selectedDoc) return null;
        const mime = selectedDoc.mime_type || '';
        const fileName = selectedDoc.original_filename || '';
        const isPdf = mime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
        const isImage = mime.startsWith('image/');

        if (isPdf) {
            return (
                <iframe
                    title="Document preview"
                    src={previewUrl}
                    className="w-full h-96 border border-border rounded-lg bg-black"
                />
            );
        }
        if (isImage) {
            return (
                <img
                    src={previewUrl}
                    alt={selectedDoc.title || selectedDoc.original_filename}
                    className="w-full max-h-96 object-contain rounded-lg border border-border bg-black"
                />
            );
        }
        return (
            <div className="border border-dashed border-border rounded-lg p-6 text-center text-gray-400">
                Download to view this file type.
            </div>
        );
    };

    const formatSize = (bytes) => {
        if (bytes === null || bytes === undefined) return '—';
        const kb = 1024;
        const mb = kb * 1024;
        if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
        if (bytes >= kb) return `${(bytes / kb).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    return (
        <div className="page-container p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Office — Documents</h1>
                    <p className="text-gray-400">Internal document cabinet for operational files.</p>
                </div>
                <button className="btn-primary" onClick={openUpload}>Upload Document</button>
            </div>

            <div className="bg-secondary-bg border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    className="flex-1 min-w-[220px] bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Search title or file name..."
                    value={filters.q}
                    onChange={(event) => setFilters({ ...filters, q: event.target.value })}
                />
                <select
                    className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    value={filters.doc_type}
                    onChange={(event) => setFilters({ ...filters, doc_type: event.target.value })}
                >
                    <option value="">All Types</option>
                    {DOC_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </select>
                <select
                    className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    value={filters.entity_type}
                    onChange={(event) => setFilters({ ...filters, entity_type: event.target.value })}
                >
                    {LINKED_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
                <input
                    type="number"
                    className="w-32 bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Linked ID"
                    value={filters.entity_id}
                    onChange={(event) => setFilters({ ...filters, entity_id: event.target.value })}
                />
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading documents...</div>
            ) : documents.length === 0 ? (
                <div className="bg-secondary-bg border border-border border-dashed rounded-xl p-12 text-center text-gray-500">
                    No documents yet.
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Linked To</th>
                                <th>Size</th>
                                <th>Uploaded</th>
                                <th className="actions-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => (
                                <tr key={doc.id}>
                                    <td>{doc.title || doc.original_filename}</td>
                                    <td>{DOC_TYPES.find((type) => type.value === doc.doc_type)?.label || 'Other'}</td>
                                    <td>
                                        {doc.links?.length
                                            ? doc.links.map((link) => `${link.entity_type}:${link.entity_id}`).join(', ')
                                            : 'None'}
                                    </td>
                                    <td>{formatSize(doc.file_size_bytes)}</td>
                                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td className="actions-cell" style={{ width: '180px' }}>
                                        <button className="btn-icon edit" onClick={() => openDetail(doc)} title="View">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        </button>
                                        <a className="btn-icon" href={officeDocumentsService.downloadUrl(doc.id)} title="Download">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="7 10 12 15 17 10"></polyline>
                                                <line x1="12" y1="15" x2="12" y2="3"></line>
                                            </svg>
                                        </a>
                                        <button className="btn-icon edit" onClick={() => openEdit(doc)} title="Edit">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9"></path>
                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                                            </svg>
                                        </button>
                                        <button className="btn-icon delete" onClick={() => handleDelete(doc)} title="Delete">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <EntityForm
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                title={isEditing ? 'Edit Document' : 'Upload Document'}
                onSubmit={isEditing ? handleUpdate : handleUpload}
                isSubmitting={isSubmitting}
            >
                {!isEditing && (
                    <div className="form-group">
                        <label htmlFor="doc-file">File</label>
                        <input
                            id="doc-file"
                            type="file"
                            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                            required
                        />
                        {selectedFile && (
                            <small className="text-gray-500">Selected: {selectedFile.name}</small>
                        )}
                    </div>
                )}
                <div className="form-group">
                    <label htmlFor="doc-type">Document Type</label>
                    <select
                        id="doc-type"
                        value={formData.doc_type}
                        onChange={(event) => setFormData({ ...formData, doc_type: event.target.value })}
                        required
                    >
                        {DOC_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="doc-title">Title (optional)</label>
                    <input
                        id="doc-title"
                        type="text"
                        value={formData.title}
                        onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="doc-notes">Description (optional)</label>
                    <textarea
                        id="doc-notes"
                        rows="3"
                        value={formData.description}
                        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    />
                </div>
            </EntityForm>

            {isDetailOpen && selectedDoc && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
                    <div className="bg-secondary-bg border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-semibold">{selectedDoc.title || selectedDoc.original_filename}</h2>
                                <p className="text-gray-400 text-sm">{DOC_TYPES.find((type) => type.value === selectedDoc.doc_type)?.label || 'Other'} document</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsDetailOpen(false)}>×</button>
                        </div>

                        <div className="mb-4">{renderPreview()}</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                            <div>
                                <div className="text-gray-500">File Name</div>
                                <div>{selectedDoc.original_filename}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Mime Type</div>
                                <div>{selectedDoc.mime_type || 'Unknown'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Linked To</div>
                                <div>
                                    {selectedDoc.links?.length
                                        ? selectedDoc.links.map((link) => `${link.entity_type}:${link.entity_id}`).join(', ')
                                        : 'None'}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Uploaded</div>
                                <div>{new Date(selectedDoc.created_at).toLocaleString()}</div>
                            </div>
                            {selectedDoc.description && (
                                <div className="md:col-span-2">
                                    <div className="text-gray-500">Description</div>
                                    <div>{selectedDoc.description}</div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <div className="text-gray-400 text-sm mb-2">Links</div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {selectedDoc.links?.length ? (
                                    selectedDoc.links.map((link) => (
                                        <button
                                            key={`${link.entity_type}-${link.entity_id}`}
                                            className="px-2 py-1 text-xs rounded-full border border-border text-gray-300 hover:text-white"
                                            onClick={() => handleUnlink(link)}
                                        >
                                            {link.entity_type}:{link.entity_id} ✕
                                        </button>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-500">No links</span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs"
                                    value={linkForm.entity_type}
                                    onChange={(event) => setLinkForm({ ...linkForm, entity_type: event.target.value })}
                                >
                                    {LINKED_TYPES.filter((option) => option.value !== '').map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    className="bg-transparent border border-border rounded-lg px-2 py-1 text-xs w-28"
                                    value={linkForm.entity_id}
                                    onChange={(event) => setLinkForm({ ...linkForm, entity_id: event.target.value })}
                                />
                                <button className="btn-secondary text-xs" onClick={handleLink}>Add Link</button>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3 justify-end">
                            <a className="btn-secondary" href={officeDocumentsService.downloadUrl(selectedDoc.id)}>
                                Download
                            </a>
                            <button className="btn-secondary" onClick={() => openEdit(selectedDoc)}>Edit</button>
                            <button className="btn-primary" onClick={() => setIsDetailOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficeDocuments;
