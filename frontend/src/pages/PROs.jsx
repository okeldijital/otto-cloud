import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import { CatalogService } from '../services/catalog';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import { ChevronLeft, Search } from 'lucide-react';

const PROs = () => {
    const [pros, setPros] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPRO, setEditingPRO] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        territory: ''
    });

    const fetchPROs = async () => {
        setIsLoading(true);
        try {
            const data = await CatalogService.getAll('pros');
            setPros(data);
        } catch (error) {
            console.error('Failed to fetch PROs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPROs();
    }, []);

    const handleCreate = () => {
        setEditingPRO(null);
        setFormData({
            name: '',
            address: '',
            contact_email: '',
            contact_phone: '',
            website: '',
            territory: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (pro) => {
        setEditingPRO(pro);
        setFormData({
            name: pro.name,
            address: pro.address || '',
            contact_email: pro.contact_email || '',
            contact_phone: pro.contact_phone || '',
            website: pro.website || '',
            territory: pro.territory || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (pro) => {
        if (await confirmAction(`Are you sure you want to delete "${pro.name}" ? `, 'Delete PRO')) {
            try {
                await CatalogService.delete('pros', pro.id);
                fetchPROs();
            } catch (error) {
                console.error('Failed to delete PRO:', error);
                alert('Failed to delete PRO');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingPRO) {
                await CatalogService.update('pros', editingPRO.id, formData);
            } else {
                await CatalogService.create('pros', formData);
            }
            setIsModalOpen(false);
            fetchPROs();
        } catch (error) {
            console.error('Failed to save PRO:', error);
            alert(error.response?.data?.detail || 'Failed to save PRO');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'territory', label: 'Territory', sortable: true },
        { key: 'website', label: 'Website' },
    ];

    const filteredPROs = (pros || []).filter(pro => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (pro.name?.toLowerCase().includes(searchLower)) ||
            (pro.territory?.toLowerCase().includes(searchLower)) ||
            (pro.website?.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="entity-page">
            <Link to="/catalog" className="back-link">
                <ChevronLeft size={16} /> Back to Catalog
            </Link>
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <h1 className="page-title">Performance Rights Orgs</h1>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="relative" style={{ minWidth: '250px' }}>
                        <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', outline: 'none' }}
                            placeholder="Quick search PROs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={handleCreate}>
                        + Add PRO
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredPROs}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPRO ? 'Edit PRO' : 'New PRO'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="name">PRO Name</label>
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
                    <label htmlFor="territory">Territory</label>
                    <input
                        type="text"
                        id="territory"
                        value={formData.territory}
                        onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="website">Website</label>
                    <input
                        type="url"
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="contact_email">Email</label>
                    <input
                        type="email"
                        id="contact_email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="contact_phone">Phone</label>
                    <input
                        type="tel"
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <textarea
                        id="address"
                        rows="3"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default PROs;
