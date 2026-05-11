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
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg text-success">
                        <Music2 size={16} />
                    </div>
                    <Link to={`/catalog/works/${row.id}`} className="font-bold text-accent hover:text-white transition-colors">
                        {row.title}
                    </Link>
                </div>
            )
        },
        {
            key: 'composers',
            label: 'Composers',
            render: (row) => (
                <div className="text-xs text-text-secondary">
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
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Landmark size={14} className="opacity-50" />
                        {pub.name}
                    </div>
                ) : <span className="text-text-secondary/50">-</span>;
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
        <div className="max-w-7xl mx-auto px-4 py-8">
            <PageHeader
                title="Musical Works"
                subtitle="Manage your composition catalog"
                breadcrumb={
                    <Link to="/catalog" className="inline-flex items-center gap-1 text-text-secondary hover:text-white transition-colors font-bold text-sm mb-2">
                        <ChevronLeft size={16} /> Back to Catalog
                    </Link>
                }
                actions={
                    <div className="flex gap-3 items-center">
                        <div className="relative min-w-[250px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 h-10 rounded-xl border border-white/10 bg-white/5 text-white text-sm outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-text-secondary/50"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Composers (Search Artists)</label>
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
                    <Input
                        label="ISWC Code"
                        value={formData.iswc_code}
                        onChange={(e) => setFormData({ ...formData, iswc_code: e.target.value })}
                        placeholder="T-123.456.789-C"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Arrangers</label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Publisher</label>
                        <Autocomplete
                            options={publishers}
                            value={formData.publisher_id}
                            onChange={(val) => setFormData({ ...formData, publisher_id: val })}
                            placeholder="Select Publisher..."
                            allowQuickAdd={true}
                            quickAddType="publishers"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Performance Rights Org (PRO)</label>
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

                <h4 className="text-xs font-bold text-accent uppercase tracking-widest border-b border-white/5 pb-3 mb-5">Manual Entries (Optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input
                        label="Composer Text (Legacy)"
                        value={formData.composers_text}
                        onChange={(e) => setFormData({ ...formData, composers_text: e.target.value })}
                    />
                    <Input
                        label="Arranger Text (Legacy)"
                        value={formData.arrangers_text}
                        onChange={(e) => setFormData({ ...formData, arrangers_text: e.target.value })}
                    />
                </div>
            </EntityForm>
        </div>
    );
};

export default Works;
