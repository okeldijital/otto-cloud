import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Upload, Edit3, Plus, Trash, Download, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import contractService from '../../services/contractService';
import EntityForm from '../../components/EntityForm';
import EntityTypeahead from '../../components/contracts/EntityTypeahead';

const STATUS_COLORS = {
    Draft: 'neutral',
    Active: 'success',
    Expired: 'muted',
    Terminated: 'danger',
};

const ROLE_OPTIONS = ['Artist', 'Label', 'Publisher', 'Licensee', 'Licensor', 'Producer', 'Other'];
const ASSET_TYPES = ['Track', 'Work', 'Release'];
const SCOPE_TYPES = ['INCLUSION', 'EXCLUSION'];
const TABS = ['overview', 'parties', 'assets', 'financials', 'documents'];

const ContractDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState('overview');

    const [metaModalOpen, setMetaModalOpen] = useState(false);
    const [metaForm, setMetaForm] = useState({});

    const [financialModalOpen, setFinancialModalOpen] = useState(false);
    const [financialForm, setFinancialForm] = useState({});

    const [partyModalOpen, setPartyModalOpen] = useState(false);
    const [partyForm, setPartyForm] = useState({
        party_mode: 'system',
        role: '',
        entity: null,
        external_name: '',
        split_percent: '',
        notes: '',
    });

    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [assetForm, setAssetForm] = useState({
        asset_type: 'Track',
        scope_type: 'INCLUSION',
        assets: [],
        notes: '',
    });

    const [docModalOpen, setDocModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await contractService.getById(id);
                const data = res.data || res;
                setContract(data);
                setSelectedDoc(latestDoc(data));
                setMetaForm({
                    title: data.title || '',
                    type: data.type || 'Recording',
                    territory: data.territory || '',
                    exclusivity: data.exclusivity || false,
                    start_date: data.start_date || '',
                    end_date: data.end_date || '',
                    signed_date: data.signed_date || '',
                    status: data.status || 'Draft',
                    notes: data.notes || '',
                });
                setFinancialForm({
                    royalty_description: data.royalty_description || '',
                    advances_amount: data.advances_amount || '',
                    advances_currency: data.advances_currency || 'USD',
                    recoupment_notes: data.recoupment_notes || '',
                });
            } catch (err) {
                console.error(err);
                setError('Unable to load contract.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const latestDoc = (data) => {
        if (!data?.documents?.length) return null;
        return [...data.documents].sort((a, b) => (b.version || 0) - (a.version || 0))[0];
    };

    const documentsWithVersions = useMemo(() => {
        if (!contract?.documents) return [];
        return [...contract.documents].sort((a, b) => (b.version || 0) - (a.version || 0));
    }, [contract]);

    const saveMetadata = async (e) => {
        e.preventDefault();
        const payload = { ...metaForm };
        if (payload.status === 'Active' && (!contract.documents || contract.documents.length === 0)) {
            alert('Attach at least one PDF before marking Active.');
            return;
        }
        try {
            const res = await contractService.update(id, payload);
            setContract(res.data || res);
            setMetaModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save metadata');
        }
    };

    const saveFinancials = async (e) => {
        e.preventDefault();
        const payload = { ...financialForm };
        if (payload.advances_amount) payload.advances_amount = Number(payload.advances_amount);
        try {
            const res = await contractService.update(id, payload);
            setContract(res.data || res);
            setFinancialModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save financials');
        }
    };

    const addParty = async (e) => {
        e.preventDefault();
        const payload = partyForm.party_mode === 'system'
            ? { entity_type: partyForm.entity?.entity_type, entity_id: partyForm.entity?.id, role: partyForm.role, split_percent: Number(partyForm.split_percent) || null, notes: partyForm.notes }
            : { entity_type: 'External', external_name: partyForm.external_name, role: partyForm.role, split_percent: Number(partyForm.split_percent) || null, notes: partyForm.notes };

        try {
            const res = await contractService.addParty(id, payload);
            setContract(res.data || res);
            setPartyModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to add party');
        }
    };

    const addAssets = async (e) => {
        e.preventDefault();
        try {
            for (const asset of assetForm.assets) {
                await contractService.addAsset(id, { asset_type: assetForm.asset_type, asset_id: asset.id, scope_type: assetForm.scope_type, notes: assetForm.notes });
            }
            const res = await contractService.getById(id);
            setContract(res.data || res);
            setAssetModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to add assets');
        }
    };

    const uploadDocument = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        setUploading(true);
        try {
            const res = await contractService.addDocument(id, selectedFile);
            setContract(res.data || res);
            setSelectedDoc(latestDoc(res.data || res));
            setDocModalOpen(false);
        } catch (err) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const downloadDoc = (doc) => {
        window.open(contractService.buildDownloadUrl(id, doc.id), '_blank');
    };

    if (loading) return <div className="placeholder">Loading contract…</div>;
    if (error || !contract) return <div className="error-banner">{error || 'Not found'}</div>;

    const sq = contract.status_quo || { status: 'UNKNOWN', reasons: [] };

    return (
        <div className="contracts-shell">
            <header className="contracts-header">
                <div>
                    <button className="back-link" onClick={() => navigate('/admin-of-works/contracts')}>
                        <ChevronLeft size={16} /> Back to list
                    </button>
                    <h1>{contract.title}</h1>
                    <div className="flex-row gap-2 mt-1">
                        <span className="muted mono small">{contract.contract_number}</span>
                        <span className={`status-badge ${sq.status.toLowerCase()}`} title={sq.reasons.join('\n')}>
                            Status Quo: {sq.status}
                        </span>
                    </div>
                </div>
                <div className="header-actions">
                    <span className={`status-badge ${STATUS_COLORS[contract.status]}`}>
                        {contract.status}
                    </span>
                    <button className="btn ghost" onClick={() => setMetaModalOpen(true)}>
                        <Edit3 size={16} /> Edit Terms
                    </button>
                    <button className="btn orange" onClick={() => setDocModalOpen(true)}>
                        <Upload size={16} /> New Version
                    </button>
                </div>
            </header>

            <div className="tabs">
                {TABS.map((tab) => (
                    <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="panel padded grid-2">
                    <div>
                        <h4 className="eyebrow">Key Metadata</h4>
                        <ul className="kv">
                            <li><span>Type</span><strong>{contract.type || '—'}</strong></li>
                            <li><span>Territory</span><strong>{contract.territory || 'World'}</strong></li>
                            <li><span>Exclusivity</span><strong>{contract.exclusivity ? 'Yes' : 'No'}</strong></li>
                            <li><span>Effective</span><strong>{contract.start_date || '—'}</strong></li>
                            <li><span>End Date</span><strong className={contract.status === 'Expired' ? 'danger-text' : ''}>{contract.end_date || '—'}</strong></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="eyebrow">Notes</h4>
                        <p className="p-notes">{contract.notes || 'No notes.'}</p>
                    </div>
                </div>
            )}

            {activeTab === 'parties' && (
                <div className="panel">
                    <div className="panel-header">
                        <h3>Contract Parties</h3>
                        <button className="btn ghost btn-sm" onClick={() => setPartyModalOpen(true)}>
                            <Plus size={14} /> Add Party
                        </button>
                    </div>
                    <table className="contracts-table">
                        <thead>
                            <tr><th>Role</th><th>Name</th><th>Split %</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {contract.parties?.map(p => (
                                <tr key={p.id}>
                                    <td>{p.role}</td>
                                    <td className="strong">{p.external_name || p.display_name}</td>
                                    <td>{p.split_percent ? `${p.split_percent}%` : '—'}</td>
                                    <td>
                                        <button className="ghost-btn danger" onClick={async () => {
                                            if (window.confirm('Remove party?')) {
                                                const res = await contractService.removeParty(id, p.id);
                                                setContract(res.data || res);
                                            }
                                        }}><Trash size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="panel">
                    <div className="document-stack">
                        <div className="document-versions">
                            {documentsWithVersions.map(doc => (
                                <div key={doc.id} className={`document-card ${selectedDoc?.id === doc.id ? 'active' : ''}`} onClick={() => setSelectedDoc(doc)}>
                                    <FileText size={20} />
                                    <div>
                                        <div className="strong">v{doc.version} - {doc.file_name}</div>
                                        <div className="muted small">{new Date(doc.uploaded_at).toLocaleDateString()}</div>
                                    </div>
                                    <button className="ghost-btn ml-auto" onClick={() => downloadDoc(doc)}><Download size={14} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="document-preview">
                            {selectedDoc ? (
                                <iframe src={contractService.buildFileUrl(selectedDoc.file_path)} className="pdf-viewer" title="PDF Viewer" />
                            ) : (
                                <div className="placeholder">No document selected.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals omitted for brevity but they are similar to previous build with type/status fixes */}
            <EntityForm isOpen={metaModalOpen} onClose={() => setMetaModalOpen(false)} title="Update Terms" onSubmit={saveMetadata}>
                <div className="form-group">
                    <label>Title</label>
                    <input className="input" value={metaForm.title} onChange={e => setMetaForm({ ...metaForm, title: e.target.value })} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Type</label>
                        <select className="input" value={metaForm.type} onChange={e => setMetaForm({ ...metaForm, type: e.target.value })}>
                            {['Recording', 'Publishing', 'Remix', 'License'].map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <select className="input" value={metaForm.status} onChange={e => setMetaForm({ ...metaForm, status: e.target.value })}>
                            <option>Draft</option>
                            <option>Active</option>
                            <option>Expired</option>
                            <option>Terminated</option>
                        </select>
                    </div>
                </div>
            </EntityForm>

            <EntityForm isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="Upload PDF Version" onSubmit={uploadDocument} isSubmitting={uploading}>
                <div className="form-group">
                    <label>Choose File (PDF)</label>
                    <input type="file" accept="application/pdf" onChange={e => setSelectedFile(e.target.files[0])} required />
                </div>
            </EntityForm>

            {/* Asset Modal */}
            <EntityForm isOpen={assetModalOpen} onClose={() => setAssetModalOpen(false)} title="Link Assets" onSubmit={addAssets}>
                <div className="form-row">
                    <div className="form-group">
                        <label>Asset Type</label>
                        <select className="input" value={assetForm.asset_type} onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })}>
                            {ASSET_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label>Search Assets</label>
                    <EntityTypeahead multiple onChange={(assets) => setAssetForm({ ...assetForm, assets })} placeholder="Search by title..." assetType={assetForm.asset_type} />
                </div>
            </EntityForm>

            {/* Financial Modal */}
            <EntityForm isOpen={financialModalOpen} onClose={() => setFinancialModalOpen(false)} title="Financial Terms" onSubmit={saveFinancials}>
                <div className="form-group">
                    <label>Royalty Clause</label>
                    <textarea className="input" rows={4} value={financialForm.royalty_description} onChange={e => setFinancialForm({ ...financialForm, royalty_description: e.target.value })} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Advance Amount</label>
                        <input type="number" className="input" value={financialForm.advances_amount} onChange={e => setFinancialForm({ ...financialForm, advances_amount: e.target.value })} />
                    </div>
                </div>
            </EntityForm>

            {/* Party Modal */}
            <EntityForm isOpen={partyModalOpen} onClose={() => setPartyModalOpen(false)} title="Add Party" onSubmit={addParty}>
                <div className="form-group">
                    <label>Role</label>
                    <select className="input" value={partyForm.role} onChange={e => setPartyForm({ ...partyForm, role: e.target.value })} required>
                        <option value="">Select Role</option>
                        {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Party Source</label>
                    <div className="flex-row gap-2">
                        <label className="checkbox-filter">
                            <input type="radio" name="party_mode" checked={partyForm.party_mode === 'system'} onChange={() => setPartyForm({ ...partyForm, party_mode: 'system' })} />
                            System Entity
                        </label>
                        <label className="checkbox-filter">
                            <input type="radio" name="party_mode" checked={partyForm.party_mode === 'external'} onChange={() => setPartyForm({ ...partyForm, party_mode: 'external' })} />
                            External Party
                        </label>
                    </div>
                </div>

                {partyForm.party_mode === 'system' ? (
                    <div className="form-group">
                        <label>Lookup Entity</label>
                        <EntityTypeahead onSelect={(entity) => setPartyForm({ ...partyForm, entity })} />
                    </div>
                ) : (
                    <div className="form-group">
                        <label>External Name</label>
                        <input className="input" value={partyForm.external_name} onChange={e => setPartyForm({ ...partyForm, external_name: e.target.value })} placeholder="Enter party name..." required />
                    </div>
                )}

                <div className="form-group">
                    <label>Split % (Optional)</label>
                    <input type="number" className="input" value={partyForm.split_percent} onChange={e => setPartyForm({ ...partyForm, split_percent: e.target.value })} placeholder="0.00" />
                </div>
            </EntityForm>
        </div>
    );
};

export default ContractDetail;
