import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Eye, Trash2, Paperclip, Plus, X } from 'lucide-react';
import { officeDocumentsService } from '../services/officeDocumentsService';
import { confirmAction, isTauriEnv, downloadFile } from '../lib/tauri';
import EntityForm from './EntityForm';

const DOC_TYPES = [
    { label: 'Split Sheet', value: 'split_sheet' },
    { label: 'PRO Registration', value: 'registration_proof' },
    { label: 'Contract', value: 'contract' },
    { label: 'Invoice', value: 'invoice' },
    { label: 'Other', value: 'other' },
];

const AttachmentsSection = ({ entityType, entityId, entityTitle }) => {
    const [attachments, setAttachments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [formData, setFormData] = useState({
        doc_type: 'split_sheet',
        title: '',
        description: '',
    });

    const fetchAttachments = async () => {
        setIsLoading(true);
        try {
            const docs = await officeDocumentsService.list({
                entity_type: entityType,
                entity_id: entityId,
            });
            setAttachments(docs);
        } catch (error) {
            console.error('Failed to load attachments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (entityId) {
            fetchAttachments();
        }
    }, [entityType, entityId]);

    const openUpload = () => {
        setFormData({
            doc_type: 'split_sheet',
            title: '',
            description: '',
        });
        setSelectedFile(null);
        setIsUploadOpen(true);
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!selectedFile) {
            alert('Please choose a file to upload.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append('file', selectedFile);
            payload.append('doc_type', formData.doc_type);
            if (formData.title) payload.append('title', formData.title);
            if (formData.description) payload.append('description', formData.description);

            // Upload the document
            const uploadedDoc = await officeDocumentsService.upload(payload);

            // Link it to the entity
            await officeDocumentsService.link(uploadedDoc.id, {
                entity_type: entityType,
                entity_id: parseInt(entityId),
            });

            setIsUploadOpen(false);
            await fetchAttachments();
        } catch (error) {
            console.error('Upload failed', error);
            alert(error.response?.data?.detail || 'Upload failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (doc) => {
        if (!(await confirmAction(`Delete "${doc.title || doc.original_filename}"?`, 'Delete Attachment'))) {
            return;
        }
        try {
            await officeDocumentsService.remove(doc.id);
            await fetchAttachments();
        } catch (error) {
            console.error('Delete failed', error);
            alert('Delete failed');
        }
    };

    const handleDownload = async (e, doc) => {
        e.preventDefault();
        const url = officeDocumentsService.downloadUrl(doc.id);
        if (isTauriEnv()) {
            try {
                await downloadFile(url, doc.original_filename || doc.title || 'document');
            } catch (error) {
                console.error('Download failed', error);
                alert('Download failed: ' + (error.message || 'Unknown error'));
            }
        } else {
            window.open(url, '_blank');
        }
    };

    const openPreview = (doc) => {
        setPreviewDoc(doc);
    };

    const closePreview = () => {
        setPreviewDoc(null);
    };

    const renderPreview = () => {
        if (!previewDoc) return null;
        const mime = previewDoc.mime_type || '';
        const fileName = previewDoc.original_filename || '';
        const isPdf = mime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
        const isImage = mime.startsWith('image/');
        const previewUrl = officeDocumentsService.previewUrl(previewDoc.id);

        if (isPdf) {
            return (
                <iframe
                    title="Document preview"
                    src={previewUrl}
                    style={{ width: '100%', height: '500px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#000' }}
                />
            );
        }
        if (isImage) {
            return (
                <img
                    src={previewUrl}
                    alt={previewDoc.title || previewDoc.original_filename}
                    style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#000' }}
                />
            );
        }
        return (
            <div style={{ border: '2px dashed #e5e7eb', borderRadius: '8px', padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <section style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Paperclip size={20} color="var(--primary-color)" />
                    Attachments
                </h3>
                <button
                    className="btn-secondary btn-sm"
                    onClick={openUpload}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={16} />
                    Add Attachment
                </button>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading attachments...
                </div>
            ) : attachments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '2px dashed #e5e7eb', borderRadius: '12px' }}>
                    <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>No attachments yet. Upload split sheets, PRO registrations, or other documents.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {attachments.map((doc) => (
                        <div
                            key={doc.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                border: '1px solid #f1f5f9',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                background: '#fafafa',
                            }}
                            className="attachment-item"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <FileText size={20} color="white" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {doc.title || doc.original_filename}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: '#e0e7ff',
                                            color: '#4338ca',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                        }}>
                                            {DOC_TYPES.find(t => t.value === doc.doc_type)?.label || 'Other'}
                                        </span>
                                        <span>{formatSize(doc.file_size_bytes)}</span>
                                        <span>{formatDate(doc.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                <button
                                    className="btn-icon"
                                    onClick={() => openPreview(doc)}
                                    title="Preview"
                                    style={{ padding: '0.5rem' }}
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    className="btn-icon"
                                    onClick={(e) => handleDownload(e, doc)}
                                    title="Download"
                                    style={{ padding: '0.5rem' }}
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    className="btn-icon delete"
                                    onClick={() => handleDelete(doc)}
                                    title="Delete"
                                    style={{ padding: '0.5rem', color: '#ef4444' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <EntityForm
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                title={`Add Attachment to ${entityTitle}`}
                onSubmit={handleUpload}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="attachment-file">File *</label>
                    <input
                        id="attachment-file"
                        type="file"
                        onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                        required
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.docx,.xlsx"
                    />
                    {selectedFile && (
                        <small style={{ color: '#6b7280', marginTop: '0.5rem', display: 'block' }}>
                            Selected: {selectedFile.name} ({formatSize(selectedFile.size)})
                        </small>
                    )}
                </div>
                <div className="form-group">
                    <label htmlFor="attachment-type">Document Type *</label>
                    <select
                        id="attachment-type"
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
                    <label htmlFor="attachment-title">Title (optional)</label>
                    <input
                        id="attachment-title"
                        type="text"
                        value={formData.title}
                        onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                        placeholder="e.g., Final Split Sheet - Approved"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="attachment-description">Description (optional)</label>
                    <textarea
                        id="attachment-description"
                        rows="3"
                        value={formData.description}
                        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                        placeholder="Add any notes about this document..."
                    />
                </div>
            </EntityForm>

            {/* Preview Modal */}
            {previewDoc && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem',
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        padding: '2rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: '0.25rem' }}>
                                    {previewDoc.title || previewDoc.original_filename}
                                </h2>
                                <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                                    {DOC_TYPES.find(t => t.value === previewDoc.doc_type)?.label || 'Other'} • {formatSize(previewDoc.file_size_bytes)}
                                </p>
                            </div>
                            <button
                                onClick={closePreview}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    border: '1px solid #e5e7eb',
                                    background: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '1.5rem',
                                    color: '#6b7280',
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            {renderPreview()}
                        </div>

                        {previewDoc.description && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>DESCRIPTION</div>
                                <div style={{ fontSize: '0.9rem' }}>{previewDoc.description}</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn-secondary"
                                onClick={(e) => handleDownload(e, previewDoc)}
                            >
                                <Download size={16} style={{ marginRight: '0.5rem' }} />
                                Download
                            </button>
                            <button
                                className="btn-primary"
                                onClick={closePreview}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .attachment-item:hover {
                    border-color: var(--primary-color) !important;
                    background: #f5f3ff !important;
                }
            `}</style>
        </section>
    );
};

export default AttachmentsSection;
