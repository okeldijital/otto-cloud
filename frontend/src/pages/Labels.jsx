import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import { CatalogService } from '../services/catalog';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import { DocumentsService } from '../services/operations';
import { Upload, X, ImageIcon, Search, Building2 } from 'lucide-react';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';

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
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 shadow-sm group-hover:border-accent/50 transition-colors">
                        <img
                            src={fullUrl}
                            alt="Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted shrink-0 shadow-sm group-hover:border-accent/50 transition-colors">
                        <Building2 size={16} />
                    </div>
                );
            }
        },
        {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (row) => (
                <Link to={`/catalog/labels/${row.id}`} className="font-bold text-white hover:text-accent transition-colors">
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
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            <PageHeader
                title="Labels"
                breadcrumb="Catalog ▸ Labels"
                actions={
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm transition-all"
                                placeholder="Search labels..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="primary" onClick={handleCreate} className="w-full sm:w-auto">
                            + Add Label
                        </Button>
                    </div>
                }
            />

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
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Label Name</label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Label Logo</label>
                        <div className="flex gap-4 items-center mt-2">
                            {formData.logo_url ? (
                                <div className="relative">
                                    <img
                                        src={formData.logo_url.startsWith('http') ? formData.logo_url : `${BASE_URL}${formData.logo_url}`}
                                        alt="Preview"
                                        className="w-20 h-20 rounded-xl object-cover border border-white/10 shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeLogo}
                                        className="absolute -top-2 -right-2 bg-danger text-white border-none rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => document.getElementById('logo-upload-input').click()}
                                    className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 border-dashed flex flex-col items-center justify-center cursor-pointer text-text-muted hover:text-accent hover:border-accent/50 transition-colors"
                                >
                                    <Upload size={20} />
                                    <span className="text-[10px] mt-1 font-medium tracking-wide">Upload</span>
                                </div>
                            )}
                            <input
                                type="file"
                                id="logo-upload-input"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <div className="flex-1">
                                <p className="text-xs text-text-secondary mb-2">Paste an image URL or upload a file</p>
                                <input
                                    type="text"
                                    value={formData.logo_url}
                                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="contact_person" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Contact Person</label>
                            <input
                                type="text"
                                id="contact_person"
                                value={formData.contact_person}
                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                placeholder="Full Name"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="contact_email" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Email Address</label>
                            <input
                                type="email"
                                id="contact_email"
                                value={formData.contact_email}
                                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                placeholder="label@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="contact_phone" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Phone Number</label>
                            <input
                                type="text"
                                id="contact_phone"
                                value={formData.contact_phone}
                                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                placeholder="+1 (555) 000-0000"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="website" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Website</label>
                            <input
                                type="url"
                                id="website"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                placeholder="https://example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="address" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Physical Address</label>
                        <textarea
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows={3}
                            placeholder="123 Music Ave, Suite 100"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors resize-none"
                        />
                    </div>
                </div>
            </EntityForm>
        </div>
    );
};

export default Labels;
