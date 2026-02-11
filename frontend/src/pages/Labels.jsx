import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import { CatalogService } from '../services/catalog';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import { DocumentsService } from '../services/operations';
import { Upload, X, ImageIcon, ChevronLeft, Search } from 'lucide-react';

const Labels = () => {
    const [labels, setLabels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingLabel, setEditingLabel] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        website: '',
        logo_url: ''
    });

    const fetchLabels = async () => {
        setIsLoading(true);
        try {
            const data = await CatalogService.getAll('labels');
            setLabels(data);
        } catch (error) {
            console.error('Failed to fetch labels:', error);
            // Ideally show a toast notification here
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLabels();
    }, []);

    const handleCreate = () => {
        setEditingLabel(null);
        setFormData({
            name: '',
            contact_person: '',
            contact_email: '',
            contact_phone: '',
            address: '',
            website: '',
            logo_url: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (label) => {
        setEditingLabel(label);
        setFormData({
            name: label.name,
            contact_person: label.contact_person || '',
            contact_email: label.contact_email || '',
            contact_phone: label.contact_phone || '',
            address: label.address || '',
            website: label.website || '',
            logo_url: label.logo_url || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (label) => {
        if (await confirmAction(`Are you sure you want to delete "${label.name}"?`, 'Delete Label')) {
            try {
                await CatalogService.delete('labels', label.id);
                fetchLabels();
            } catch (error) {
                console.error('Failed to delete label:', error);
                alert('Failed to delete label');
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsSubmitting(true);
        try {
            const result = await DocumentsService.upload(file);
            setFormData(prev => ({
                ...prev,
                logo_url: result.file_path
            }));
        } catch (error) {
            console.error('Logo upload failed:', error);
            alert('Failed to upload logo. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeLogo = () => {
        setFormData(prev => ({
            ...prev,
            logo_url: ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingLabel) {
                await CatalogService.update('labels', editingLabel.id, formData);
            } else {
                await CatalogService.create('labels', formData);
            }
            setIsModalOpen(false);
            fetchLabels();
        } catch (error) {
            console.error('Failed to save label:', error);
            alert(error.response?.data?.detail || 'Failed to save label');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'logo_url',
            label: '',
            render: (row) => {
                const url = row.logo_url;
                const fullUrl = url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : null;
                return fullUrl ? (
                    <img
                        src={fullUrl}
                        alt="Logo"
                        style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', background: '#f1f5f9' }}
                    />
                ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px' }}>No Logo</div>
                );
            }
        },
        {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (row) => (
                <Link to={`/catalog/labels/${row.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}>
                    {row.name}
                </Link>
            )
        },
        { key: 'contact_person', label: 'Contact Person', sortable: true },
        { key: 'contact_email', label: 'Email', sortable: true },
        { key: 'contact_phone', label: 'Phone' },
    ];

    const filteredLabels = (labels || []).filter(label => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (label.name?.toLowerCase().includes(searchLower)) ||
            (label.contact_person?.toLowerCase().includes(searchLower)) ||
            (label.contact_email?.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="entity-page">
            <Link to="/catalog" className="back-link">
                <ChevronLeft size={16} /> Back to Catalog
            </Link>
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <h1 className="page-title">Labels</h1>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="relative" style={{ minWidth: '250px' }}>
                        <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', outline: 'none' }}
                            placeholder="Quick search labels..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={handleCreate}>
                        + Add Label
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredLabels}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingLabel ? 'Edit Label' : 'New Label'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="name">Label Name</label>
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
                    <label>Label Logo</label>
                    <div className="logo-upload-container" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                        {formData.logo_url ? (
                            <div className="logo-preview-wrapper" style={{ position: 'relative' }}>
                                <img
                                    src={formData.logo_url.startsWith('http') ? formData.logo_url : `${BASE_URL}${formData.logo_url}`}
                                    alt="Preview"
                                    style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                />
                                <button
                                    type="button"
                                    onClick={removeLogo}
                                    style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => document.getElementById('logo-upload-input').click()}
                                style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#f8fafc', border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <Upload size={20} />
                                <span style={{ fontSize: '10px', marginTop: '4px' }}>Upload</span>
                            </div>
                        )}
                        <input
                            type="file"
                            id="logo-upload-input"
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 4px 0' }}>Paste an image URL or upload a file</p>
                            <input
                                type="text"
                                value={formData.logo_url}
                                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png"
                                style={{ fontSize: '13px' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="contact_person">Contact Person</label>
                        <input
                            type="text"
                            id="contact_person"
                            value={formData.contact_person}
                            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                            placeholder="Full Name"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="contact_email">Email Address</label>
                        <input
                            type="email"
                            id="contact_email"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            placeholder="label@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="contact_phone">Phone Number</label>
                        <input
                            type="text"
                            id="contact_phone"
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="website">Website</label>
                    <input
                        type="url"
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://example.com"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="address">Physical Address</label>
                    <textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                        placeholder="123 Music Ave, Suite 100"
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default Labels;
