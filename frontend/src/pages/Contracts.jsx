import React, { useState, useEffect } from 'react';
import { ContractsService } from '../services/contracts';
import { CatalogService } from '../services/catalog';
import { DocumentsService } from '../services/operations';
import DataTable from '../components/DataTable';
import EntityForm from '../components/EntityForm';

const API_URL = 'http://localhost:8000';

const Contracts = () => {
    const [contracts, setContracts] = useState([]);
    const [artists, setArtists] = useState([]);
    const [labels, setLabels] = useState([]);
    const [publishers, setPublishers] = useState([]);
    const [releases, setReleases] = useState([]);
    const [works, setWorks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [activeTab, setActiveTab] = useState('contracts');

    // Initial State
    const initialFormState = {
        title: '',
        status: 'Active',
        label_id: '',
        publisher_id: '',
        artist_ids: [],
        work_ids: [],
        release_ids: [],
        start_date: '',
        end_date: '',
        file_path: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [contractsData, artistsData, labelsData, publishersData] = await Promise.all([
                ContractsService.getAll(),
                CatalogService.getAll('artists'),
                CatalogService.getAll('labels'),
                CatalogService.getAll('labels'),
                CatalogService.getAll('publishers'),
                CatalogService.getAll('releases'),
                CatalogService.getAll('works')
            ]);
            setContracts(contractsData);
            setArtists(artistsData);
            setLabels(labelsData);
            setPublishers(publishersData);
            setReleases(releasesData);
            setWorks(worksData);
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
        setEditingContract(null);
        setSelectedFile(null);
        setFormData({
            ...initialFormState,
            is_template: activeTab === 'templates'
        });
        setIsModalOpen(true);
    };

    const handleEdit = (contract) => {
        setEditingContract(contract);
        setSelectedFile(null);
        setFormData({
            title: contract.title || '',
            status: contract.status || 'Active',
            label_id: contract.label_id || '',
            publisher_id: contract.publisher_id || '',
            artist_ids: contract.artist_ids || [],
            work_ids: contract.work_ids || [],
            release_ids: contract.release_ids || [],
            start_date: contract.start_date ? contract.start_date.split('T')[0] : '',
            end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
            file_path: contract.file_path || ''
        });
        setIsModalOpen(true);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDelete = async (contract) => {
        if (window.confirm(`Are you sure you want to delete contract "${contract.contract_id}"?`)) {
            try {
                await ContractsService.delete(contract.id);
                fetchData();
            } catch (error) {
                console.error('Failed to delete contract:', error);
                alert('Failed to delete contract');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Clean up data before sending
        const submitData = { ...formData };
        if (submitData.start_date === '') submitData.start_date = null;
        if (submitData.end_date === '') submitData.end_date = null;
        if (submitData.label_id === '') submitData.label_id = null;
        if (submitData.publisher_id === '') submitData.publisher_id = null;

        try {
            // Upload PDF if selected
            if (selectedFile) {
                const uploadedFile = await DocumentsService.upload(selectedFile);
                submitData.file_path = uploadedFile.file_path;
            }

            if (editingContract) {
                await ContractsService.update(editingContract.id, submitData);
            } else {
                await ContractsService.create(submitData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save contract:', error);
            alert('Failed to save contract');
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        { key: 'title', label: 'Title' },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: row.status === 'Active' ? '#dcfce7' : row.status === 'Expired' ? '#fee2e2' : row.status === 'Partially Signed' ? '#fef3c7' : '#f3f4f6',
                    color: row.status === 'Active' ? '#166534' : row.status === 'Expired' ? '#991b1b' : row.status === 'Partially Signed' ? '#92400e' : '#374151'
                }}>
                    {row.status || 'Draft'}
                </span>
            )
        },
        {
            key: 'artists',
            label: 'Artists',
            render: (row) => Array.isArray(row.artist_ids) && row.artist_ids.length > 0 ?
                <span title={row.artist_ids.map(id => artists.find(a => a.id === id)?.name).join(', ')}>
                    {row.artist_ids.length} Artist{row.artist_ids.length > 1 ? 's' : ''}
                </span> : '-'
        },
        { key: 'start_date', label: 'Start Date' },
        { key: 'end_date', label: 'End Date' },
        {
            key: 'file_path',
            label: 'Document',
            render: (row) => row.file_path ? (
                <a
                    href={`${API_URL}${row.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    View PDF
                </a>
            ) : <span className="text-muted">No File</span>
        }
    ];

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Contracts Registry</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add Contract
                </button>
            </div>

            <div className="detail-tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '2rem' }}>
                <button
                    className="tab-btn active"
                    onClick={() => setActiveTab('contracts')}
                    style={{ background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer', borderBottom: '2px solid var(--primary-color)', color: 'var(--primary-color)', fontWeight: 600 }}
                >
                    All Contracts
                </button>
            </div>

            <DataTable
                columns={columns}
                data={contracts}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingContract ? 'Edit Contract' : 'New Contract'}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-group">
                    <label htmlFor="title">Contract Title</label>
                    <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. 360 Deal 2024"
                        autoFocus
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select
                            id="status"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="Draft">Draft</option>
                            <option value="Partially Signed">Partially Signed</option>
                            <option value="Active">Active</option>
                            <option value="Expired">Expired</option>
                            <option value="Terminated">Terminated</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Involved Artists (hold Cmd/Ctrl to select multiple)</label>
                    <select
                        multiple
                        value={formData.artist_ids}
                        onChange={(e) => setFormData({ ...formData, artist_ids: Array.from(e.target.selectedOptions, option => parseInt(option.value)) })}
                        style={{ height: '100px' }}
                    >
                        {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Label (Optional)</label>
                        <select
                            value={formData.label_id}
                            onChange={(e) => setFormData({ ...formData, label_id: e.target.value })}
                        >
                            <option value="">Select Label...</option>
                            {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Publisher (Optional)</label>
                        <select
                            value={formData.publisher_id}
                            onChange={(e) => setFormData({ ...formData, publisher_id: e.target.value })}
                        >
                            <option value="">Select Publisher...</option>
                            {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Related Works (hold Cmd/Ctrl to select multiple)</label>
                    <select
                        multiple
                        value={formData.work_ids}
                        onChange={(e) => setFormData({ ...formData, work_ids: Array.from(e.target.selectedOptions, option => parseInt(option.value)) })}
                        style={{ height: '80px' }}
                    >
                        {works.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Related Releases (hold Cmd/Ctrl to select multiple)</label>
                    <select
                        multiple
                        value={formData.release_ids}
                        onChange={(e) => setFormData({ ...formData, release_ids: Array.from(e.target.selectedOptions, option => parseInt(option.value)) })}
                        style={{ height: '80px' }}
                    >
                        {releases.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="start_date">Start Date</label>
                        <input
                            type="date"
                            id="start_date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="end_date">End Date</label>
                        <input
                            type="date"
                            id="end_date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="contract_file">Contract Document (PDF)</label>
                    <input
                        type="file"
                        id="contract_file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="file-input"
                    />
                    {formData.file_path && !selectedFile && (
                        <div className="current-file">
                            <small>Current: <a href={`${API_URL}${formData.file_path}`} target="_blank" rel="noreferrer">View Document</a></small>
                        </div>
                    )}
                </div>
            </EntityForm>
        </div >
    );
};

export default Contracts;

