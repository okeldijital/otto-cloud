import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileText, Upload, Edit3, Plus, Trash, Download, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import { confirmAction } from '../../lib/tauri';
import contractService from '../../services/contractService';
import EntityForm from '../../components/EntityForm';
import EntityTypeahead from '../../components/contracts/EntityTypeahead';
import aiClient from '../../api/aiClient';

const ROLE_OPTIONS = ['Artist', 'Label', 'Publisher', 'Licensee', 'Licensor', 'Producer', 'Other'];
const ASSET_TYPES = ['Track', 'Work', 'Release'];
const TABS = ['overview', 'terms', 'parties', 'assets', 'documents'];

const ContractDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    // Modal states
    const [metaModalOpen, setMetaModalOpen] = useState(false);
    const [metaForm, setMetaForm] = useState({});
    const [partyModalOpen, setPartyModalOpen] = useState(false);
    const [partyForm, setPartyForm] = useState({ party_mode: 'system', role: '', entity: null, external_name: '', split_percent: '', notes: '' });
    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [assetForm, setAssetForm] = useState({ asset_type: 'Track', assets: [], notes: '' });
    const [docModalOpen, setDocModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);

    // AI Review state
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [reviewSuccess, setReviewSuccess] = useState('');
    const [extractionResult, setExtractionResult] = useState(null);
    const [linkSuggestions, setLinkSuggestions] = useState([]);
    const [decisions, setDecisions] = useState({});

    useEffect(() => {
        const tab = (searchParams.get('tab') || '').toLowerCase();
        if (TABS.includes(tab)) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await contractService.getById(id);
                const data = res.data || res;
                setContract(data);
                setSelectedDoc(data.documents?.sort((a, b) => b.version - a.version)?.[0] || null);

                const initialMeta = {
                    title: data.title || '',
                    contract_number: data.contract_number || '',
                    type: data.type || 'Recording',
                    status: data.status || 'Draft',
                    start_date: data.start_date || '',
                    end_date: data.end_date || '',
                    territory: data.territory || '',
                    exclusivity: data.exclusivity || false,
                    notes: data.notes || '',
                    term_text: data.key_terms?.term_text || '',
                    renewal_text: data.key_terms?.renewal_text || '',
                    governing_law: data.key_terms?.governing_law || '',
                };
                setMetaForm(initialMeta);

                // Handle edit query param
                if (searchParams.get('edit') === 'true') {
                    setMetaModalOpen(true);
                }

            } catch (err) {
                setError(err?.response?.data?.detail || err.message || 'Load failed');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const documentsWithVersions = useMemo(() =>
        (contract?.documents || []).sort((a, b) => b.version - a.version),
        [contract]);

    // ── CRUD Operations ──────────────────────────────────────────────

    const saveMetadata = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...metaForm,
                key_terms: {
                    term_text: metaForm.term_text,
                    renewal_text: metaForm.renewal_text,
                    governing_law: metaForm.governing_law,
                    territory: metaForm.territory,
                }
            };
            const res = await contractService.update(id, payload);
            setContract(res.data || res);
            setMetaModalOpen(false);
            if (searchParams.get('edit')) {
                setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('edit');
                    return next;
                });
            }
        } catch (err) {
            setError(err?.response?.data?.detail || 'Save failed');
        }
    };


    const addParty = async (e) => {
        e.preventDefault();
        try {
            const payload = partyForm.party_mode === 'external'
                ? { role: partyForm.role, entity_type: 'External', external_name: partyForm.external_name, split_percent: partyForm.split_percent || null }
                : { role: partyForm.role, entity_type: partyForm.entity?.entity_type, entity_id: partyForm.entity?.id, split_percent: partyForm.split_percent || null };
            const res = await contractService.addParty(id, payload);
            setContract(res.data || res);
            setPartyModalOpen(false);
            setPartyForm({ party_mode: 'system', role: '', entity: null, external_name: '', split_percent: '', notes: '' });
        } catch (err) {
            setError(err?.response?.data?.detail || 'Add party failed');
        }
    };

    const addAssets = async (e) => {
        e.preventDefault();
        try {
            const items = (assetForm.assets || []).map(a => ({
                asset_type: assetForm.asset_type,
                asset_id: a.id,
                scope_type: 'INCLUSION',
                notes: assetForm.notes || '',
            }));
            for (const item of items) {
                await contractService.addAsset(id, item);
            }
            const res = await contractService.getById(id);
            setContract(res.data || res);
            setAssetModalOpen(false);
            setAssetForm({ asset_type: 'Track', assets: [], notes: '' });
        } catch (err) {
            setError(err?.response?.data?.detail || 'Add asset failed');
        }
    };

    const removeAsset = async (assetId) => {
        if (await confirmAction('Remove this asset?', 'Remove Asset')) {
            try {
                await contractService.removeAsset(id, assetId);
                const res = await contractService.getById(id);
                setContract(res.data || res);
            } catch (err) {
                setError(err?.response?.data?.detail || 'Remove failed');
            }
        }
    };

    const uploadDocument = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        setUploading(true);
        try {
            const res = await contractService.addDocument(id, selectedFile);
            setContract(res.data || res);
            setDocModalOpen(false);
            setSelectedFile(null);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const deleteContract = async () => {
        if (await confirmAction('Permanently delete this contract?', 'Delete Contract')) {
            try {
                await contractService.delete(id);
                navigate('/admin-of-works/contracts');
            } catch (err) {
                console.error(err);
                alert('Failed to delete contract: ' + (err.response?.data?.detail || err.message));
            }
        }
    };

    // ── AI Review ────────────────────────────────────────────────────



    // ── Render ────────────────────────────────────────────────────────

    if (loading) return <div className="placeholder">Loading contract…</div>;
    if (error && !contract) return <div className="error-banner">{error || 'Not found'}</div>;

    const sq = contract.status_quo || { status: 'UNKNOWN', reasons: [] };

    return (
        <div className="contracts-shell">
            <header className="contracts-header">
                <div>
                    <button className="back-link" onClick={() => navigate('/admin-of-works/contracts')}>
                        <ChevronLeft size={16} /> Back to list
                    </button>
                    <h1>Contract: {contract.contract_number || id}</h1>
                    <div className="flex-row gap-2 mt-1">
                        <span className="muted mono small">{contract.contract_number}</span>
                        <span className={`status-badge ${sq.status?.toLowerCase?.() || 'unknown'}`}>
                            Status Quo: {sq.status}
                        </span>
                        <span className={`status-badge ${contract.status?.toLowerCase?.() === 'active' ? 'success' : contract.status?.toLowerCase?.() === 'expired' ? 'muted' : 'neutral'}`}>
                            {contract.status}
                        </span>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn ghost" onClick={() => setMetaModalOpen(true)}>
                        <Edit3 size={16} /> Edit Terms
                    </button>
                    <button className="btn ghost danger" onClick={deleteContract}>
                        <Trash size={16} /> Delete
                    </button>
                    <button className="btn orange" onClick={() => setDocModalOpen(true)}>
                        <Upload size={16} /> New Version
                    </button>
                </div>
            </header>

            {error && <div className="error-banner" style={{ marginBottom: 12 }}><AlertCircle size={14} /> {error}</div>}

            <div className="tabs">
                {TABS.map((tab) => (
                    <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => handleTabChange(tab)}>
                        {tab === 'ai_review' ? 'AI Review' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* ── Overview ─────────────────────────────── */}
            {activeTab === 'overview' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    <div className="panel padded grid-2">
                        <div>
                            <h4 className="eyebrow">Key Dates</h4>
                            <ul className="kv">
                                <li><span>Effective Date</span><strong>{contract.start_date || '—'}</strong></li>
                                <li><span>End Date</span><strong className={contract.status === 'Expired' ? 'danger-text' : ''}>{contract.end_date || '—'}</strong></li>
                            </ul>

                            <h4 className="eyebrow" style={{ marginTop: 16 }}>Title & Notes</h4>
                            <p className="strong">{contract.title}</p>
                            <p className="p-notes" style={{ marginTop: 8 }}>{(contract.notes || '').replace(/\n\[OTTO_META\].*/s, '') || 'No notes.'}</p>
                        </div>
                        <div>
                            <h4 className="eyebrow">Contract Terms</h4>
                            <ul className="kv">
                                <li><span>Type</span><strong>{contract.type || '—'}</strong></li>
                                <li><span>Exclusivity</span><strong>{contract.exclusivity ? 'Yes' : 'No'}</strong></li>
                            </ul>
                            <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                                <span className="small muted caps">Contract Terms: </span>
                                <div className="small mt-1">{contract.key_terms?.term_text || 'None.'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <div className="panel padded">
                            <h4 className="eyebrow mb-2">Parties</h4>
                            {!contract.parties?.length ? (
                                <div className="small muted">No parties linked.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {contract.parties.map(p => (
                                        <div key={p.id} className="small" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                                            <span className="strong">{p.external_name || p.display_name || `${p.entity_type} #${p.entity_id}`}</span>
                                            <span className="muted">{p.role}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="panel padded">
                            <h4 className="eyebrow mb-2">Assets</h4>
                            {!contract.assets?.length ? (
                                <div className="small muted">No assets linked.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {contract.assets.map(a => (
                                        <div key={a.id} className="small" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                                            <span className="strong">{a.title || a.name || a.asset_title || `${a.asset_type} #${a.asset_id}`}</span>
                                            <span className="muted">{a.asset_type}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'terms' && (
                <div className="panel padded">
                    <div className="panel-header">
                        <h3>Contract Terms</h3>
                        <button className="btn ghost btn-sm" onClick={() => setMetaModalOpen(true)}>
                            <Edit3 size={14} /> Edit Terms
                        </button>
                    </div>
                    <div className="grid-2 mt-2">
                        <div>
                            <h4 className="eyebrow">Scope & Exclusivity</h4>
                            <ul className="kv">
                                <li><span>Type</span><strong>{contract.type || '—'}</strong></li>
                                <li><span>Exclusivity</span><strong>{contract.exclusivity ? 'Yes' : 'No'}</strong></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="eyebrow">Terms Details</h4>
                            <div className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                                <div className="small">{contract.key_terms?.term_text || 'None.'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Parties ──────────────────────────────── */}
            {activeTab === 'parties' && (
                <div className="panel">
                    <div className="panel-header">
                        <h3>Contract Parties</h3>
                        <button className="btn ghost btn-sm" onClick={() => setPartyModalOpen(true)}>
                            <Plus size={14} /> Add Party
                        </button>
                    </div>
                    {!contract.parties?.length ? (
                        <div className="placeholder">No parties linked yet.</div>
                    ) : (
                        <table className="contracts-table">
                            <thead>
                                <tr><th>Role</th><th>Name</th><th>Type</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {contract.parties.map(p => (
                                    <tr key={p.id}>
                                        <td>{p.role}</td>
                                        <td className="strong">{p.external_name || p.display_name || `${p.entity_type} #${p.entity_id}`}</td>
                                        <td><span className="badge">{p.entity_type}</span></td>
                                        <td>
                                            <button className="ghost-btn danger" onClick={async () => {
                                                if (await confirmAction('Remove party?', 'Remove Party')) {
                                                    const res = await contractService.removeParty(id, p.id);
                                                    setContract(res.data || res);
                                                }
                                            }}><Trash size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Assets ───────────────────────────────── */}
            {activeTab === 'assets' && (
                <div className="panel">
                    <div className="panel-header">
                        <h3>Linked Assets</h3>
                        <button className="btn ghost btn-sm" onClick={() => setAssetModalOpen(true)}>
                            <Plus size={14} /> Link Asset
                        </button>
                    </div>
                    {!contract.assets?.length ? (
                        <div className="placeholder">No assets linked yet.</div>
                    ) : (
                        <table className="contracts-table">
                            <thead>
                                <tr><th>Type</th><th>Name</th><th>ID</th><th>Scope</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {contract.assets.map(a => (
                                    <tr key={a.id}>
                                        <td><span className="badge">{a.asset_type}</span></td>
                                        <td className="strong">{a.title || a.name || a.asset_title || `${a.asset_type} #${a.asset_id}`}</td>
                                        <td className="mono small">{a.asset_id}</td>
                                        <td>{a.scope_type}</td>
                                        <td>
                                            <button className="ghost-btn danger" onClick={() => removeAsset(a.id)}>
                                                <Trash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Documents ────────────────────────────── */}
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
                                    <button className="ghost-btn ml-auto" onClick={(e) => { e.stopPropagation(); window.open(contractService.buildFileUrl(doc.file_path)); }}>
                                        <Download size={14} />
                                    </button>
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



            {/* ── Modals ───────────────────────────────── */}
            <EntityForm isOpen={metaModalOpen} onClose={() => setMetaModalOpen(false)} title="Update Terms" onSubmit={saveMetadata}>
                <div className="form-group">
                    <label>Title</label>
                    <input className="input" value={metaForm.title} onChange={e => setMetaForm({ ...metaForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Contract Number</label>
                    <input className="input" value={metaForm.contract_number} onChange={e => setMetaForm({ ...metaForm, contract_number: e.target.value })} />
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
                            <option>Draft</option><option>Active</option><option>Expired</option><option>Terminated</option>
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Effective Date</label>
                        <input type="date" className="input" value={metaForm.start_date} onChange={e => setMetaForm({ ...metaForm, start_date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>End Date</label>
                        <input type="date" className="input" value={metaForm.end_date} onChange={e => setMetaForm({ ...metaForm, end_date: e.target.value })} />
                    </div>
                </div>
                <div className="form-group">
                    <label>Exclusivity</label>
                    <div className="flex-row gap-2">
                        <label className="checkbox-filter">
                            <input type="radio" name="exclusivity" checked={metaForm.exclusivity === true} onChange={() => setMetaForm({ ...metaForm, exclusivity: true })} />
                            Exclusive
                        </label>
                        <label className="checkbox-filter">
                            <input type="radio" name="exclusivity" checked={metaForm.exclusivity === false} onChange={() => setMetaForm({ ...metaForm, exclusivity: false })} />
                            Non-Exclusive
                        </label>
                    </div>
                </div>
                <div className="form-group">
                    <label>Contract Terms</label>
                    <textarea className="input" rows={6} value={metaForm.term_text} onChange={e => setMetaForm({ ...metaForm, term_text: e.target.value })} placeholder="Paste terms text here..." />
                </div>
                <div className="form-group">
                    <label>Notes</label>
                    <textarea className="input" rows={2} value={metaForm.notes} onChange={e => setMetaForm({ ...metaForm, notes: e.target.value })} />
                </div>
            </EntityForm>

            <EntityForm isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="Upload PDF Version" onSubmit={uploadDocument} isSubmitting={uploading}>
                <div className="form-group">
                    <label>Choose File (PDF)</label>
                    <input type="file" accept="application/pdf" onChange={e => setSelectedFile(e.target.files[0])} required />
                </div>
            </EntityForm>

            <EntityForm isOpen={assetModalOpen} onClose={() => setAssetModalOpen(false)} title="Link Assets" onSubmit={addAssets}>
                <div className="form-group">
                    <label>Asset Type</label>
                    <select className="input" value={assetForm.asset_type} onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })}>
                        {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Search Assets</label>
                    <EntityTypeahead multiple mode="asset" onChange={(assets) => setAssetForm({ ...assetForm, assets })} placeholder="Search by title..." assetType={assetForm.asset_type} />
                </div>
            </EntityForm>

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
                        <EntityTypeahead mode="party" onSelect={(entity) => setPartyForm({ ...partyForm, entity })} />
                    </div>
                ) : (
                    <div className="form-group">
                        <label>External Name</label>
                        <input className="input" value={partyForm.external_name} onChange={e => setPartyForm({ ...partyForm, external_name: e.target.value })} placeholder="Enter party name..." required />
                    </div>
                )}
            </EntityForm>
        </div>
    );
};

export default ContractDetail;
