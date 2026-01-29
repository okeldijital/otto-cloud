import React, { useState, useEffect } from 'react';
import { DocumentsService } from '../services/operations';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';

// Use backend base URL for downloads
const API_URL = 'http://localhost:8000';

const Documents = () => {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingDocument, setEditingDocument] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const initialFormState = {
        title: '',
        filename: '',
        original_filename: '',
        file_path: '',
        category: 'contract',
        description: '',
        mime_type: '',
        file_size: 0
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (activeCategory !== 'all') params.category = activeCategory;
            const data = await DocumentsService.getAll(params);

            // Client side search filtering for title/description
            const filteredData = data.filter(doc =>
                doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.original_filename?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            setDocuments(filteredData);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [activeCategory, searchQuery]);

    const handleCreate = () => {
        setEditingDocument(null);
        setSelectedFile(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleEdit = (doc) => {
        setEditingDocument(doc);
        setSelectedFile(null);
        setFormData({
            title: doc.title || '',
            filename: doc.filename || '',
            original_filename: doc.original_filename || '',
            file_path: doc.file_path || '',
            category: doc.category || 'contract',
            description: doc.description || '',
            mime_type: doc.mime_type || '',
            file_size: doc.file_size || 0
        });
        setIsModalOpen(true);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDelete = async (doc) => {
        if (window.confirm(`Are you sure you want to delete "${doc.title || doc.filename}"?`)) {
            try {
                await DocumentsService.delete(doc.id);
                fetchDocuments();
            } catch (error) {
                console.error('Failed to delete document:', error);
                alert('Failed to delete document');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let uploadData = {};

            // If a file is selected, upload it first
            if (selectedFile) {
                const uploadedFile = await DocumentsService.upload(selectedFile);
                uploadData = {
                    filename: uploadedFile.filename,
                    original_filename: uploadedFile.original_filename,
                    file_path: uploadedFile.file_path,
                    file_size: uploadedFile.file_size,
                    mime_type: uploadedFile.content_type
                };
            }

            // Merge uploaded file info with form data
            // If editing and no new file, keep existing file info
            const submitData = {
                ...formData,
                ...uploadData
            };

            // Fallback for filename if no file uploaded ever (shouldn't happen in real use but safe for existing mock data)
            if (!submitData.filename && !submitData.title) {
                alert("Please provide a title or upload a file.");
                setIsSubmitting(false);
                return;
            }
            if (!submitData.filename) {
                submitData.filename = submitData.title.toLowerCase().replace(/\s+/g, '_');
                submitData.original_filename = submitData.filename;
                submitData.file_path = '';
            }

            if (editingDocument) {
                await DocumentsService.update(editingDocument.id, submitData);
            } else {
                await DocumentsService.create(submitData);
            }
            setIsModalOpen(false);
            fetchDocuments();
        } catch (error) {
            console.error('Failed to save document:', error);
            alert('Failed to save document: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'original_filename', label: 'Filename' },
        {
            key: 'file_path',
            label: 'Action',
            render: (row) => row.file_path ? (
                <a
                    href={`${API_URL}${row.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                >
                    Download
                </a>
            ) : <span className="text-gray-400">No File</span>
        }
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Document Management</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add Document
                </button>
            </div>

            <div className="filter-container" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="category-tabs" style={{ display: 'flex', gap: '0.5rem' }}>
                    {['all', 'contract', 'invoice', 'report', 'other'].map(cat => (
                        <button
                            key={cat}
                            className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: activeCategory === cat ? 'var(--primary-color)' : 'white',
                                color: activeCategory === cat ? 'white' : 'var(--text-color)',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                fontWeight: activeCategory === cat ? '600' : '400'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="search-box" style={{ flex: '1', maxWidth: '400px' }}>
                    <input
                        type="text"
                        placeholder="Search documents by title, filename or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={documents}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDocument ? 'Edit Document' : 'New Document'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="title">Document Title</label>
                    <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        autoFocus
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="file">File Attachment</label>
                    <input
                        type="file"
                        id="file"
                        onChange={handleFileSelect}
                        className="file-input"
                    />
                    {editingDocument && formData.original_filename && !selectedFile && (
                        <small className="text-gray-500">
                            Current file: {formData.original_filename} ({Math.round(formData.file_size / 1024)} KB)
                        </small>
                    )}
                    {selectedFile && (
                        <small className="text-green-600">
                            Selected: {selectedFile.name}
                        </small>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        <option value="contract">Contract</option>
                        <option value="invoice">Invoice</option>
                        <option value="report">Report</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        rows="3"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default Documents;
