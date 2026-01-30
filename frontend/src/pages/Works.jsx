import React, { useState, useEffect } from 'react';
import { CatalogService } from '../services/catalog';
import { BASE_URL } from '../lib/api';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';
import { Music2, User, Users, Landmark } from 'lucide-react';

const API_URL = BASE_URL;

const Works = () => {
    const [works, setWorks] = useState([]);
    const [artists, setArtists] = useState([]);
    const [publishers, setPublishers] = useState([]);
    const [pros, setPros] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingWork, setEditingWork] = useState(null);

    const initialFormState = {
        title: '',
        iswc_code: '',
        composers: [],
        arrangers: [],
        composers_text: '',
        arrangers_text: '',
        publisher_id: '',
        pro_id: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [worksData, publishersData, prosData, artistsData] = await Promise.all([
                CatalogService.getAll('works'),
                CatalogService.getAll('publishers'),
                CatalogService.getAll('pros'),
                CatalogService.getAll('artists')
            ]);
            setWorks(worksData);
            setPublishers(publishersData);
            setPros(prosData);
            setArtists(artistsData);
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
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleEdit = (work) => {
        setEditingWork(work);
        setFormData({
            title: work.title,
            iswc_code: work.iswc_code || '',
            composers: work.composers || [],
            arrangers: work.arrangers || [],
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
        if (submissionData.iswc_code === '') submissionData.iswc_code = null;

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
        {
            key: 'title',
            label: 'Work Title',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '6px', background: '#ecfdf5', borderRadius: '6px', color: '#059669' }}>
                        <Music2 size={16} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{row.title}</span>
                </div>
            )
        },
        {
            key: 'composers',
            label: 'Composers',
            render: (row) => (
                <div style={{ fontSize: '0.8125rem' }}>
                    {row.composers?.length > 0 ? (
                        row.composers.length === 1 ? (
                            artists.find(a => a.id === row.composers[0])?.name || row.composers_text || 'Unknown'
                        ) : `${row.composers.length} Composers`
                    ) : (row.composers_text || '-')}
                </div>
            )
        },
        {
            key: 'publisher_id',
            label: 'Publisher',
            render: (row) => {
                const pub = publishers.find(p => p.id === row.publisher_id);
                return pub ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                        <Landmark size={14} className="text-muted" />
                        {pub.name}
                    </div>
                ) : '-';
            }
        },
        { key: 'iswc_code', label: 'ISWC' },
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Musical Works</h1>
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
                    <label>Title</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        autoFocus
                    />
                </div>

                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>Composers (Search Artists)</label>
                        <Autocomplete
                            options={artists}
                            value={formData.composers}
                            onChange={(val) => setFormData({ ...formData, composers: val })}
                            placeholder="Select Composers..."
                            multiple={true}
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label>ISWC Code</label>
                        <input
                            type="text"
                            value={formData.iswc_code}
                            onChange={(e) => setFormData({ ...formData, iswc_code: e.target.value })}
                            placeholder="T-123.456.789-C"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Arrangers</label>
                    <Autocomplete
                        options={artists}
                        value={formData.arrangers}
                        onChange={(val) => setFormData({ ...formData, arrangers: val })}
                        placeholder="Select Arrangers..."
                        multiple={true}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>Publisher</label>
                        <Autocomplete
                            options={publishers}
                            value={formData.publisher_id}
                            onChange={(val) => setFormData({ ...formData, publisher_id: val })}
                            placeholder="Select Publisher..."
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label>Performance Rights Org (PRO)</label>
                        <Autocomplete
                            options={pros}
                            value={formData.pro_id}
                            onChange={(val) => setFormData({ ...formData, pro_id: val })}
                            placeholder="Select PRO..."
                        />
                    </div>
                </div>

                <div className="form-section-title">Manual Entries (Optional)</div>
                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>Composer Text (Legacy)</label>
                        <input
                            type="text"
                            value={formData.composers_text}
                            onChange={(e) => setFormData({ ...formData, composers_text: e.target.value })}
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label>Arranger Text (Legacy)</label>
                        <input
                            type="text"
                            value={formData.arrangers_text}
                            onChange={(e) => setFormData({ ...formData, arrangers_text: e.target.value })}
                        />
                    </div>
                </div>
            </EntityForm>
        </div>
    );
};

export default Works;
