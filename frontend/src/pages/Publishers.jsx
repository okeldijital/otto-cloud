import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import { ChevronLeft } from 'lucide-react';

const Publishers = () => {
    const [publishers, setPublishers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingPublisher, setEditingPublisher] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        address: '',
        contact_email: '',
        contact_phone: '',
        rights_type: ''
    });

    const fetchPublishers = async () => {
        setIsLoading(true);
        try {
            const data = await CatalogService.getAll('publishers');
            setPublishers(data);
        } catch (error) {
            console.error('Failed to fetch publishers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPublishers();
    }, []);

    const handleCreate = () => {
        setEditingPublisher(null);
        setFormData({
            name: '',
            contact_person: '',
            address: '',
            contact_email: '',
            contact_phone: '',
            rights_type: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (publisher) => {
        setEditingPublisher(publisher);
        setFormData({
            name: publisher.name,
            contact_person: publisher.contact_person || '',
            address: publisher.address || '',
            contact_email: publisher.contact_email || '',
            contact_phone: publisher.contact_phone || '',
            rights_type: publisher.rights_type || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (publisher) => {
        if (window.confirm(`Are you sure you want to delete "${publisher.name}"?`)) {
            try {
                await CatalogService.delete('publishers', publisher.id);
                fetchPublishers();
            } catch (error) {
                console.error('Failed to delete publisher:', error);
                alert('Failed to delete publisher');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingPublisher) {
                await CatalogService.update('publishers', editingPublisher.id, formData);
            } else {
                await CatalogService.create('publishers', formData);
            }
            setIsModalOpen(false);
            fetchPublishers();
        } catch (error) {
            console.error('Failed to save publisher:', error);
            alert('Failed to save publisher');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Name',
            render: (row) => (
                <Link to={`/catalog/publishers/${row.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}>
                    {row.name}
                </Link>
            )
        },
        { key: 'contact_person', label: 'Contact Person' },
        { key: 'contact_email', label: 'Email' },
        { key: 'rights_type', label: 'Rights Type' },
    ];

    return (
        <div className="entity-page">
            <Link to="/catalog" className="back-link">
                <ChevronLeft size={16} /> Back to Catalog
            </Link>
            <div className="page-header">
                <h1 className="page-title">Publishers</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add Publisher
                </button>
            </div>

            <DataTable
                columns={columns}
                data={publishers}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPublisher ? 'Edit Publisher' : 'New Publisher'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="name">Publisher Name</label>
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
                    <label htmlFor="contact_person">Contact Person</label>
                    <input
                        type="text"
                        id="contact_person"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        placeholder="Full Name"
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
                    <label htmlFor="rights_type">Rights Type</label>
                    <select
                        id="rights_type"
                        value={formData.rights_type}
                        onChange={(e) => setFormData({ ...formData, rights_type: e.target.value })}
                    >
                        <option value="">Select Type...</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Synchronization">Synchronization</option>
                        <option value="Performance">Performance</option>
                        <option value="Full Service">Full Service</option>
                    </select>
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

export default Publishers;
