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
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [activeTab, setActiveTab] = useState('contracts');

    // Initial State
    const initialFormState = {
        title: '',
        contract_id: '',
        status: 'Active',
        artist_id: '',
        label_id: '',
        publisher_id: '',
        start_date: '',
        end_date: '',
        royalty_rate: '',
        terms: '',
        file_path: '',
        is_template: false
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [contractsData, artistsData, labelsData, publishersData] = await Promise.all([
                ContractsService.getAll(),
                CatalogService.getAll('artists'),
                CatalogService.getAll('labels'),
                CatalogService.getAll('publishers')
            ]);
            setContracts(contractsData);
            setArtists(artistsData);
            setLabels(labelsData);
            setPublishers(publishersData);
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
            contract_id: contract.contract_id || '',
            status: contract.status || 'Active',
            artist_id: contract.artist_id || '',
            label_id: contract.label_id || '',
            publisher_id: contract.publisher_id || '',
            start_date: contract.start_date ? contract.start_date.split('T')[0] : '',
            end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
            royalty_rate: contract.royalty_rate || '',
            terms: contract.terms || '',
            file_path: contract.file_path || '',
            is_template: contract.is_template || false
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
        if (submitData.royalty_rate === '') submitData.royalty_rate = null;
        if (submitData.start_date === '') submitData.start_date = null;
        if (submitData.end_date === '') submitData.end_date = null;
        if (submitData.artist_id === '') submitData.artist_id = null;
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
        { key: 'contract_id', label: 'Ref ID' },
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
                    backgroundColor: row.status === 'Active' ? '#dcfce7' : row.status === 'Expired' ? '#fee2e2' : '#f3f4f6',
                    color: row.status === 'Active' ? '#166534' : row.status === 'Expired' ? '#991b1b' : '#374151'
                }}>
                    {row.status || 'Draft'}
                </span>
            )
        },
        {
            key: 'party',
            label: 'Party',
            render: (row) => {
                if (row.artist_id) return artists.find(a => a.id === row.artist_id)?.name || '-';
                if (row.publisher_id) return publishers.find(p => p.id === row.publisher_id)?.name || '-';
                if (row.label_id) return labels.find(l => l.id === row.label_id)?.name || '-';
                return '-';
            }
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

    const filteredContracts = contracts.filter(c =>
        activeTab === 'contracts' ? !c.is_template : c.is_template
    );

    return (
        <div className="entity-page">
            <div className="page-header">
                <h1 className="page-title">Contracts Registry</h1>
                <button className="btn-primary" onClick={handleCreate}>
                    + Add {activeTab === 'templates' ? 'Template' : 'Contract'}
                </button>
            </div>

            <div className="detail-tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '2rem' }}>
                <button
                    className={`tab-btn ${activeTab === 'contracts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('contracts')}
                    style={{ background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer', borderBottom: activeTab === 'contracts' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'contracts' ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: 600 }}
                >
                    Contracts
                </button>
                <button
                    className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                    style={{ background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer', borderBottom: activeTab === 'templates' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'templates' ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: 600 }}
                >
                    Templates
                </button>
            </div>

            <DataTable
                columns={columns}
                data={filteredContracts}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <EntityForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {editingContract ? 'Edit' : 'New'} {formData.is_template ? 'Template' : 'Contract'}
                        {formData.is_template && <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>TEMPLATE</span>}
                    </div>
                }
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            >
                <div className="form-row">
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
                    <div className="form-group">
                        <label htmlFor="contract_id">Ref ID</label>
                        <input
                            type="text"
                            id="contract_id"
                            value={formData.contract_id}
                            onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
                            required
                        />
                    </div>
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
                            <option value="Active">Active</option>
                            <option value="Expired">Expired</option>
                            <option value="Terminated">Terminated</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="royalty_rate">Royalty Rate (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            id="royalty_rate"
                            value={formData.royalty_rate}
                            onChange={(e) => setFormData({ ...formData, royalty_rate: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Party (Select One)</label>
                    <div className="form-row">
                        <select
                            value={formData.artist_id}
                            onChange={(e) => setFormData({ ...formData, artist_id: e.target.value, label_id: '', publisher_id: '' })}
                            disabled={formData.label_id || formData.publisher_id}
                            className={formData.label_id || formData.publisher_id ? 'disabled-select' : ''}
                        >
                            <option value="">Artist...</option>
                            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <select
                            value={formData.label_id}
                            onChange={(e) => setFormData({ ...formData, label_id: e.target.value, artist_id: '', publisher_id: '' })}
                            disabled={formData.artist_id || formData.publisher_id}
                            className={formData.artist_id || formData.publisher_id ? 'disabled-select' : ''}
                        >
                            <option value="">Label...</option>
                            {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <select
                            value={formData.publisher_id}
                            onChange={(e) => setFormData({ ...formData, publisher_id: e.target.value, artist_id: '', label_id: '' })}
                            disabled={formData.artist_id || formData.label_id}
                            className={formData.artist_id || formData.label_id ? 'disabled-select' : ''}
                        >
                            <option value="">Publisher...</option>
                            {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
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

                <div className="form-group">
                    <label htmlFor="terms">Terms & Conditions</label>
                    <textarea
                        id="terms"
                        rows="4"
                        value={formData.terms}
                        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    />
                </div>
                <div className="form-group" style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0 }}>
                        <input
                            type="checkbox"
                            checked={formData.is_template}
                            onChange={(e) => setFormData({ ...formData, is_template: e.target.checked })}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Save as Contract Template</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Templates won't appear in the main registry until used.</div>
                        </div>
                    </label>
                </div>
            </EntityForm>
        </div>
    );
};

export default Contracts;

