import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { ReportsService } from '../services/reports';
import { BASE_URL } from '../lib/api';
import { confirmAction } from '../lib/tauri';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';
import { Music2, User, Users, Landmark, ChevronLeft, Download, Plus, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import Input, { Select, Textarea } from '../components/ui/Input';
import Card from '../components/ui/Card';

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
    const [searchTerm, setSearchTerm] = useState('');

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
        if (await confirmAction(`Are you sure you want to delete "${work.title}"?`, 'Delete Work')) {
            try {
                await CatalogService.delete('works', work.id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete work:', error);
                alert(error.response?.data?.detail || 'Failed to delete work');
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
            alert(error.response?.data?.detail || 'Failed to save work');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'title',
            label: 'Work Title',
            sortable: true,
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '6px', background: '#ecfdf5', borderRadius: '6px', color: '#059669' }}>
                        <Music2 size={16} />
                    </div>
                    <Link to={`/catalog/works/${row.id}`} style={{ fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none' }}>
                        {row.title}
                    </Link>
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
        { key: 'iswc_code', label: 'ISWC', sortable: true },
    ];

    const filteredWorks = (works || []).filter(work => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (work.title?.toLowerCase().includes(searchLower)) ||
            (work.iswc_code?.toLowerCase().includes(searchLower)) ||
            (work.composers_text?.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="entity-page">
            <Link to="/catalog" className="back-link">
                <ChevronLeft size={16} /> Back to Catalog
            </Link>
            <PageHeader
                title="Musical Works"
                subtitle="Manage your composition catalog"
                breadcrumb={
                    <Link to="/catalog" className="back-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
                        <ChevronLeft size={16} /> Back to Catalog
                    </Link>
                }
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="relative" style={{ minWidth: '250px' }}>
                            <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', outline: 'none' }}
                                placeholder="Quick search works..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="secondary"
                            icon={Download}
                            onClick={() => ReportsService.exportData('works', 'excel')}
                        >
                            Export
                        </Button>
                        <Button
                            variant="primary"
                            icon={Plus}
                            onClick={handleCreate}
                        >
                            Add Work
                        </Button>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                data={filteredWorks}
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
                <Input
                    label="Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    autoFocus
                />

                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>Composers (Search Artists)</label>
                        <Autocomplete
                            options={artists}
                            value={formData.composers}
                            onChange={(val) => setFormData({ ...formData, composers: val })}
                            placeholder="Select Composers..."
                            multiple={true}
                            allowQuickAdd={true}
                            quickAddType="artists"
                        />
                    </div>
                    <div className="form-group flex-1">
                        <Input
                            label="ISWC Code"
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
                        allowQuickAdd={true}
                        quickAddType="artists"
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
                            allowQuickAdd={true}
                            quickAddType="publishers"
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label>Performance Rights Org (PRO)</label>
                        <Autocomplete
                            options={pros}
                            value={formData.pro_id}
                            onChange={(val) => setFormData({ ...formData, pro_id: val })}
                            placeholder="Select PRO..."
                            allowQuickAdd={true}
                            quickAddType="pros"
                        />
                    </div>
                </div>

                <div className="form-section-title">Manual Entries (Optional)</div>
                <div className="form-row">
                    <div className="form-group flex-1">
                        <Input
                            label="Composer Text (Legacy)"
                            value={formData.composers_text}
                            onChange={(e) => setFormData({ ...formData, composers_text: e.target.value })}
                        />
                    </div>
                    <div className="form-group flex-1">
                        <Input
                            label="Arranger Text (Legacy)"
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
