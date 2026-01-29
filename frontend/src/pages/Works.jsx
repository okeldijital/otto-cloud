import React, { useState, useEffect } from 'react';
import { CatalogService } from '../services/catalog';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';

const API_URL = 'http://localhost:8000';

const Works = () => {
    const [works, setWorks] = useState([]);
    const [publishers, setPublishers] = useState([]);
    const [pros, setPros] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingWork, setEditingWork] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        iswc: '',
        composers_text: '',
        arrangers_text: '',
        publisher_id: '',
        pro_id: ''
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [worksData, publishersData, prosData] = await Promise.all([
                CatalogService.getAll('works'),
                CatalogService.getAll('publishers'),
                CatalogService.getAll('pros')
            ]);
            setWorks(worksData);
            setPublishers(publishersData);
            setPros(prosData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = () => {
        setEditingWork(null);
        setFormData({
            title: '',
            iswc: '',
            composers_text: '',
            arrangers_text: '',
            publisher_id: '',
            pro_id: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (work) => {
        setEditingWork(work);
        setFormData({
            title: work.title,
            iswc: work.iswc || '',
            composers_text: work.composers_text || '',
            arrangers_text: work.arrangers_text || '',
            publisher_id: work.publisher_id || '',
            pro_id: work.pro_id || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (work) => {
        if (window.confirm(`Are you sure you want to delete "${work.title}"?`)) {
            try {
                await CatalogService.delete('works', work.id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete work:', error);
                alert('Failed to delete work');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const submissionData = { ...formData };
        if (submissionData.publisher_id === '') submissionData.publisher_id = null;
        if (submissionData.pro_id === '') submissionData.pro_id = null;
        if (submissionData.iswc === '') submissionData.iswc = null;

        try {
            if (editingWork) {
                await CatalogService.update('works', editingWork.id, submissionData);
            } else {
                await CatalogService.create('works', submissionData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save work:', error);
            alert('Failed to save work');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'title', label: 'Work Title' },
        { key: 'composers_text', label: 'Composers' },
        {
            key: 'publisher_id',
            label: 'Publisher',
            render: (row) => {
                const pub = publishers.find(p => p.id === row.publisher_id);
                return pub ? pub.name : '-';
            }
        },
        { key: 'iswc', label: 'ISWC' },
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Works</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => window.open(`${API_URL}/api/reports/export/works?format=excel`, '_blank')}
                    >
                        Export Excel
                    </button>
                    <button className="btn-primary" onClick={handleCreate}>
                        + Add Work
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={works}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingWork ? 'Edit Work' : 'New Work'}
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
                <div className="form-group">
                    <label htmlFor="composers_text">Composers</label>
                    <input
                        type="text"
                        id="composers_text"
                        value={formData.composers_text}
                        onChange={(e) => setFormData({ ...formData, composers_text: e.target.value })}
                        placeholder="e.g. John Doe, Jane Smith"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="arrangers_text">Arrangers</label>
                    <input
                        type="text"
                        id="arrangers_text"
                        value={formData.arrangers_text}
                        onChange={(e) => setFormData({ ...formData, arrangers_text: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="publisher_id">Publisher</label>
                    <select
                        id="publisher_id"
                        value={formData.publisher_id}
                        onChange={(e) => setFormData({ ...formData, publisher_id: e.target.value })}
                    >
                        <option value="">Select Publisher...</option>
                        {publishers.map(pub => (
                            <option key={pub.id} value={pub.id}>{pub.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="pro_id">PRO</label>
                    <select
                        id="pro_id"
                        value={formData.pro_id}
                        onChange={(e) => setFormData({ ...formData, pro_id: e.target.value })}
                    >
                        <option value="">Select PRO...</option>
                        {pros.map(pro => (
                            <option key={pro.id} value={pro.id}>{pro.name} ({pro.country})</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="iswc">ISWC</label>
                    <input
                        type="text"
                        id="iswc"
                        value={formData.iswc}
                        onChange={(e) => setFormData({ ...formData, iswc: e.target.value })}
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default Works;
