import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Upload, Edit3, Plus, Trash, Download } from 'lucide-react';
import contractService from '../services/contractService';
import EntityForm from '../components/EntityForm';
import EntityTypeahead from '../components/contracts/EntityTypeahead';

const STATUS_COLORS = {
    Draft: 'neutral',
    Active: 'success',
    Expired: 'muted',
    Terminated: 'danger',
};

const ROLE_OPTIONS = ['Artist', 'Label', 'Publisher', 'Licensee', 'Licensor', 'Producer', 'Other'];
const ASSET_TYPES = ['Track', 'Work', 'Release'];
const SCOPE_TYPES = ['INCLUSION', 'EXCLUSION'];
const TABS = ['documents', 'overview', 'parties', 'assets', 'financials'];

const ContractDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState('documents');

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
    const [dragActive, setDragActive] = useState(false);

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
                    contract_type: data.contract_type || 'Recording',
                    territory: data.territory || '',
                    exclusivity: data.exclusivity || '',
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
        const payload = Object.entries(metaForm).reduce((acc, [key, val]) => {
            if (val === '' || val === null || typeof val === 'undefined') return acc;
            acc[key] = val;
            return acc;
        }, {});
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
        const payload = {
            ...financialForm,
        };
        if (payload.advances_amount === '' || payload.advances_amount === null) delete payload.advances_amount;
        if (payload.advances_amount) payload.advances_amount = Number(payload.advances_amount);
        if (payload.advances_currency === '') delete payload.advances_currency;
        if (payload.royalty_description === '') delete payload.royalty_description;
        if (payload.recoupment_notes === '') delete payload.recoupment_notes;
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
        const payload =
            partyForm.party_mode === 'system'
                ? {
                      entity_type: partyForm.entity?.entity_type || 'Artist',
                      entity_id: partyForm.entity?.id,
                      role: partyForm.role,
                      split_percent: Number(partyForm.split_percent) || null,
                      notes: partyForm.notes || null,
                  }
                : {
                      entity_type: 'External',
                      external_name: partyForm.external_name,
                      role: partyForm.role,
                      split_percent: Number(partyForm.split_percent) || null,
                      notes: partyForm.notes || null,
                  };

        const exists = (contract?.parties || []).some((p) => {
            if (payload.entity_type === 'External') {
                return p.external_name?.toLowerCase() === payload.external_name?.toLowerCase();
            }
            return p.entity_type === payload.entity_type && p.entity_id === payload.entity_id;
        });
        if (exists) {
            alert('This party is already linked.');
            return;
        }

        try {
            const res = await contractService.addParty(id, payload);
            const data = res.data || res;
            setContract(data);
            setPartyModalOpen(false);
            setPartyForm({
                party_mode: 'system',
                role: '',
                entity: null,
                external_name: '',
                split_percent: '',
                notes: '',
            });
        } catch (err) {
            console.error(err);
            alert('Failed to add party');
        }
    };

    const removeParty = async (partyId) => {
        if (!window.confirm('Remove this party?')) return;
        try {
            const res = await contractService.removeParty(id, partyId);
            setContract(res.data || res);
        } catch (err) {
            console.error(err);
            alert('Failed to remove party');
        }
    };

    const addAssets = async (e) => {
        e.preventDefault();
        if (!assetForm.assets.length) {
            alert('Select at least one asset.');
            return;
        }

        try {
            for (const asset of assetForm.assets) {
                await contractService.addAsset(id, {
                    asset_type: assetForm.asset_type,
                    asset_id: asset.id,
                    scope_type: assetForm.scope_type,
                    notes: assetForm.notes || '',
                });
            }
            const refreshed = await contractService.getById(id);
            const data = refreshed.data || refreshed;
            setContract(data);
            setAssetModalOpen(false);
            setAssetForm({
                asset_type: 'Track',
                scope_type: 'INCLUSION',
                assets: [],
                notes: '',
            });
        } catch (err) {
            console.error(err);
            alert('Failed to add assets');
        }
    };

    const removeAsset = async (assetId) => {
        if (!window.confirm('Remove this asset?')) return;
        try {
            const res = await contractService.removeAsset(id, assetId);
            setContract(res.data || res);
        } catch (err) {
            console.error(err);
            alert('Failed to remove asset');
        }
    };

    const uploadDocument = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            alert('Choose a PDF first.');
            return;
        }
        setUploading(true);
        try {
            const docRes = await contractService.addDocument(id, selectedFile);
            const data = docRes.data || docRes;
            setContract(data);
            setSelectedDoc(latestDoc(data));
            setSelectedFile(null);
            setDocModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
            setDragActive(false);
        }
    };

    const downloadDoc = (doc) => {
        if (!doc) return;
        const url = contractService.buildDownloadUrl(contract.id, doc.id);
        window.open(url, '_blank');
    };

    const downloadLatest = () => downloadDoc(selectedDoc || latestDoc(contract));

    const onDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.length) {
            setSelectedFile(e.dataTransfer.files[0]);
            setDocModalOpen(true);
        }
    };

    if (loading) return <div className="placeholder">Loading contract…</div>;
    if (error || !contract) return <div className="error-banner">{error || 'Not found'}</div>;

    return (
        <div className="contracts-shell">
            <header className="contracts-header">
                <div>
                    <button className="link-btn" onClick={() => navigate('/contracts')}>← Back to list</button>
                    <h1>{contract.title}</h1>
                    <p className="muted mono">{contract.contract_number}</p>
                </div>
                <div className="header-actions">
                    <span className={`status-badge ${STATUS_COLORS[contract.status] || 'neutral'}`}>
                        {contract.status}
                    </span>
                    <button className="btn ghost" onClick={() => setDocModalOpen(true)}>
                        <Upload size={16} /> Upload New Version
                    </button>
                    <button className="btn orange" onClick={downloadLatest}>
                        <Download size={16} /> Download PDF
                    </button>
                </div>
            </header>

            <div className="tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {activeTab === 'documents' && (
                <div className="panel">
                    <div
                        className={`dropzone ${dragActive ? 'dragging' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={onDrop}
                    >
                        <Upload size={20} />
                        <div>
                            <p className="strong">Drag & drop signed PDF</p>
                            <p className="muted small">Or <button className="link-btn" onClick={() => setDocModalOpen(true)}>browse files</button></p>
                        </div>
                    </div>
                    <div className="document-stack">
                        <div className="document-versions">
                            {documentsWithVersions.length === 0 && <div className="placeholder">No documents uploaded yet.</div>}
                            {documentsWithVersions.map((doc) => (
                                <button
                                    key={doc.id}
                                    className={`document-card ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                                    onClick={() => setSelectedDoc(doc)}
                                >
                                    <div className="doc-meta">
                                        <FileText size={18} />
                                        <div>
                                            <div className="strong">v{doc.version || '?'} • {doc.file_name}</div>
                                            <div className="muted small">
                                                {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '—'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="doc-actions">
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); downloadDoc(doc); }}>
                                            <Download size={14} /> Download
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="document-preview">
                            {!selectedDoc ? (
                                <div className="placeholder">Select a document to preview.</div>
                            ) : (
                                <object
                                    data={contractService.buildFileUrl(selectedDoc.file_path)}
                                    type="application/pdf"
                                    width="100%"
                                    height="100%"
                                >
                                    <p>
                                        PDF preview unavailable.{' '}
                                        <button className="link-btn" onClick={() => downloadDoc(selectedDoc)}>Download instead</button>
                                    </p>
                                </object>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'overview' && (
                <div className="panel grid-2">
                    <div>
                        <h4 className="eyebrow">Key Terms</h4>
                        <ul className="kv">
                            <li><span>Type</span><strong>{contract.contract_type || '—'}</strong></li>
                            <li><span>Status</span><strong>{contract.status || '—'}</strong></li>
                            <li><span>Effective</span><strong>{contract.start_date || '—'}</strong></li>
                            <li><span>End</span><strong>{contract.end_date || '—'}</strong></li>
                            <li><span>Signed</span><strong>{contract.signed_date || '—'}</strong></li>
                            <li><span>Territory</span><strong>{contract.territory || '—'}</strong></li>
                            <li><span>Exclusivity</span><strong>{contract.exclusivity || '—'}</strong></li>
                        </ul>
                    </div>
                    <div>
                        <div className="panel-header" style={{ marginBottom: 0 }}>
                            <h4 className="eyebrow">Notes</h4>
                            <button className="ghost-btn" onClick={() => setMetaModalOpen(true)}>
                                <Edit3 size={14} /> Edit
                            </button>
                        </div>
                        <p>{contract.notes || 'No notes captured yet.'}</p>
                    </div>
                </div>
            )}

            {activeTab === 'parties' && (
                <div className="panel">
                    <div className="panel-header">
                        <h3>Parties</h3>
                        <button className="btn orange" onClick={() => setPartyModalOpen(true)}>
                            <Plus size={16} /> Add Party
                        </button>
                    </div>
                    <table className="contracts-table">
                        <thead>
                        <tr>
                            <th>Role</th>
                            <th>Party</th>
                            <th>Split%</th>
                            <th>Notes</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {(contract.parties || []).map((p) => (
                            <tr key={p.id}>
                                <td>{p.role}</td>
                                <td>{p.external_name || p.display_name || `${p.entity_type || ''} #${p.entity_id || ''}`}</td>
                                <td>{p.split_percent ?? '—'}</td>
                                <td className="muted">{p.notes || '—'}</td>
                                <td className="actions">
                                    <button className="ghost-btn danger" onClick={() => removeParty(p.id)}>
                                        <Trash size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {(!contract.parties || contract.parties.length === 0) && (
                            <tr><td colSpan={5} className="placeholder">No parties yet.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'assets' && (
                <div className="panel">
                    <div className="panel-header">
                        <h3>Assets</h3>
                        <button className="btn orange" onClick={() => setAssetModalOpen(true)}>
                            <Plus size={16} /> Link Assets
                        </button>
                    </div>
                    <table className="contracts-table">
                        <thead>
                        <tr>
                            <th>Asset Type</th>
                            <th>Asset</th>
                            <th>Scope</th>
                            <th>Notes</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {(contract.assets || []).map((a) => (
                            <tr key={a.id}>
                                <td>{a.asset_type}</td>
                                <td className="mono">ID {a.asset_id}</td>
                                <td><span className="tag">{a.scope_type}</span></td>
                                <td className="muted">{a.notes || '—'}</td>
                                <td className="actions">
                                    <button className="ghost-btn danger" onClick={() => removeAsset(a.id)}>
                                        <Trash size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {(!contract.assets || contract.assets.length === 0) && (
                            <tr><td colSpan={5} className="placeholder">No assets linked.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'financials' && (
                <div className="panel">
                    <div className="panel-header">
                        <h3>Financials</h3>
                        <button className="btn orange" onClick={() => setFinancialModalOpen(true)}>
                            <Edit3 size={16} /> Edit
                        </button>
                    </div>
                    <div className="grid-2">
                        <div>
                            <h4 className="eyebrow">Royalty Description</h4>
                            <p>{contract.royalty_description || '—'}</p>
                        </div>
                        <div>
                            <h4 className="eyebrow">Advances</h4>
                            <p>
                                {contract.advances_amount
                                    ? `${contract.advances_currency || 'USD'} ${contract.advances_amount}`
                                    : '—'}
                            </p>
                        </div>
                        <div className="grid-span-2">
                            <h4 className="eyebrow">Recoupment Notes</h4>
                            <p>{contract.recoupment_notes || '—'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Metadata Modal */}
            <EntityForm
                isOpen={metaModalOpen}
                onClose={() => setMetaModalOpen(false)}
                title="Edit Contract Metadata"
                onSubmit={saveMetadata}
            >
                <div className="form-group">
                    <label>Title</label>
                    <input
                        className="input"
                        value={metaForm.title}
                        onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })}
                        required
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Type</label>
                        <input
                            className="input"
                            value={metaForm.contract_type}
                            onChange={(e) => setMetaForm({ ...metaForm, contract_type: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <select
                            className="input"
                            value={metaForm.status}
                            onChange={(e) => setMetaForm({ ...metaForm, status: e.target.value })}
                        >
                            <option>Draft</option>
                            <option>Active</option>
                            <option>Expired</option>
                            <option>Terminated</option>
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Territory</label>
                        <input
                            className="input"
                            value={metaForm.territory}
                            onChange={(e) => setMetaForm({ ...metaForm, territory: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Exclusivity</label>
                        <input
                            className="input"
                            value={metaForm.exclusivity}
                            onChange={(e) => setMetaForm({ ...metaForm, exclusivity: e.target.value })}
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Effective Date</label>
                        <input
                            type="date"
                            className="input"
                            value={metaForm.start_date || ''}
                            onChange={(e) => setMetaForm({ ...metaForm, start_date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>End Date</label>
                        <input
                            type="date"
                            className="input"
                            value={metaForm.end_date || ''}
                            onChange={(e) => setMetaForm({ ...metaForm, end_date: e.target.value })}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Signed Date</label>
                    <input
                        type="date"
                        className="input"
                        value={metaForm.signed_date || ''}
                        onChange={(e) => setMetaForm({ ...metaForm, signed_date: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Notes</label>
                    <textarea
                        className="input"
                        rows={3}
                        value={metaForm.notes}
                        onChange={(e) => setMetaForm({ ...metaForm, notes: e.target.value })}
                    />
                </div>
            </EntityForm>

            {/* Financials Modal */}
            <EntityForm
                isOpen={financialModalOpen}
                onClose={() => setFinancialModalOpen(false)}
                title="Edit Financials"
                onSubmit={saveFinancials}
            >
                <div className="form-group">
                    <label>Royalty Description</label>
                    <textarea
                        className="input"
                        rows={3}
                        value={financialForm.royalty_description}
                        onChange={(e) => setFinancialForm({ ...financialForm, royalty_description: e.target.value })}
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Advances Amount</label>
                        <input
                            type="number"
                            className="input"
                            value={financialForm.advances_amount}
                            onChange={(e) => setFinancialForm({ ...financialForm, advances_amount: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Currency</label>
                        <input
                            className="input"
                            value={financialForm.advances_currency}
                            onChange={(e) => setFinancialForm({ ...financialForm, advances_currency: e.target.value })}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Recoupment Notes</label>
                    <textarea
                        className="input"
                        rows={3}
                        value={financialForm.recoupment_notes}
                        onChange={(e) => setFinancialForm({ ...financialForm, recoupment_notes: e.target.value })}
                    />
                </div>
            </EntityForm>

            {/* Party Modal */}
            <EntityForm
                isOpen={partyModalOpen}
                onClose={() => setPartyModalOpen(false)}
                title="Add Party"
                onSubmit={addParty}
            >
                <div className="form-row">
                    <label className="radio">
                        <input
                            type="radio"
                            checked={partyForm.party_mode === 'system'}
                            onChange={() => setPartyForm({ ...partyForm, party_mode: 'system' })}
                        /> System entity
                    </label>
                    <label className="radio">
                        <input
                            type="radio"
                            checked={partyForm.party_mode === 'external'}
                            onChange={() => setPartyForm({ ...partyForm, party_mode: 'external' })}
                        /> External
                    </label>
                </div>
                <div className="form-group">
                    <label>Role</label>
                    <select
                        className="input"
                        value={partyForm.role}
                        required
                        onChange={(e) => setPartyForm({ ...partyForm, role: e.target.value })}
                    >
                        <option value="">Select role</option>
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r}>{r}</option>
                        ))}
                    </select>
                </div>
                {partyForm.party_mode === 'system' ? (
                    <div className="form-group">
                        <label>Entity</label>
                        <EntityTypeahead
                            placeholder="Search artists, labels, publishers…"
                            onSelect={(entity) => setPartyForm({ ...partyForm, entity })}
                        />
                    </div>
                ) : (
                    <div className="form-group">
                        <label>External Name</label>
                        <input
                            className="input"
                            value={partyForm.external_name}
                            required
                            onChange={(e) => setPartyForm({ ...partyForm, external_name: e.target.value })}
                        />
                    </div>
                )}
                <div className="form-row">
                    <div className="form-group">
                        <label>Split % (optional)</label>
                        <input
                            type="number"
                            className="input"
                            value={partyForm.split_percent}
                            onChange={(e) => setPartyForm({ ...partyForm, split_percent: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <input
                            className="input"
                            value={partyForm.notes}
                            onChange={(e) => setPartyForm({ ...partyForm, notes: e.target.value })}
                        />
                    </div>
                </div>
            </EntityForm>

            {/* Asset Modal */}
            <EntityForm
                isOpen={assetModalOpen}
                onClose={() => setAssetModalOpen(false)}
                title="Link Assets"
                onSubmit={addAssets}
            >
                <div className="form-row">
                    <div className="form-group">
                        <label>Asset Type</label>
                        <select
                            className="input"
                            value={assetForm.asset_type}
                            onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })}
                        >
                            {ASSET_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Scope</label>
                        <select
                            className="input"
                            value={assetForm.scope_type}
                            onChange={(e) => setAssetForm({ ...assetForm, scope_type: e.target.value })}
                        >
                            {SCOPE_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label>Select Assets</label>
                    <EntityTypeahead
                        multiple
                        onChange={(assets) => setAssetForm({ ...assetForm, assets })}
                        placeholder="Search by title or code"
                        assetType={assetForm.asset_type}
                    />
                </div>
                <div className="form-group">
                    <label>Notes</label>
                    <input
                        className="input"
                        value={assetForm.notes}
                        onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                    />
                </div>
            </EntityForm>

            {/* Document upload */}
            <EntityForm
                isOpen={docModalOpen}
                onClose={() => { setDocModalOpen(false); setSelectedFile(null); }}
                title="Upload Contract PDF"
                onSubmit={uploadDocument}
                isSubmitting={uploading}
            >
                <div className="form-group">
                    <label>Choose File (PDF)</label>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        required
                    />
                </div>
                <p className="muted small">PDF is the source of truth. Each upload becomes a new version.</p>
            </EntityForm>
        </div>
    );
};

export default ContractDetail;
