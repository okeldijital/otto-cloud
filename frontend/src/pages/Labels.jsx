import React, { useState, useEffect } from 'react';
import { CatalogService } from '../services/catalog';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';

const Labels = () => {
    const [labels, setLabels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingLabel, setEditingLabel] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        website: ''
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
            contact_email: '',
            contact_phone: '',
            address: '',
            website: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (label) => {
        setEditingLabel(label);
        setFormData({
            name: label.name,
            contact_email: label.contact_email || '',
            contact_phone: label.contact_phone || '',
            address: label.address || '',
            website: label.website || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (label) => {
        if (window.confirm(`Are you sure you want to delete "${label.name}"?`)) {
            try {
                await CatalogService.delete('labels', label.id);
                fetchLabels();
            } catch (error) {
                console.error('Failed to delete label:', error);
                alert('Failed to delete label');
            }
        }
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
            alert('Failed to save label');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'contact_email', label: 'Email' },
        { key: 'contact_phone', label: 'Phone' },
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Labels</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add Label
                </button>
            </div>

            <DataTable
                columns={columns}
                data={labels}
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
