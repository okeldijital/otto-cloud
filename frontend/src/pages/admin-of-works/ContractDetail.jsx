import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Upload, Edit3, Plus, Trash, Download, AlertCircle, CheckCircle, ChevronLeft, Settings } from 'lucide-react';
import { confirmAction } from '../../lib/tauri';
import contractService from '../../services/contractService';
import { CatalogService } from '../../services/catalog';
import EntityForm from '../../components/EntityForm';
import EntityTypeahead from '../../components/contracts/EntityTypeahead';
import aiClient from '../../api/aiClient';
import aiCoreWriteClient from '../../api/aiCoreWriteClient';

const STATUS_COLORS = {
    Draft: 'neutral',
    Active: 'success',
    Expired: 'muted',
    Terminated: 'danger',
};

const ROLE_OPTIONS = ['Artist', 'Label', 'Publisher', 'Licensee', 'Licensor', 'Producer', 'Other'];
const ASSET_TYPES = ['Track', 'Work', 'Release'];
const SCOPE_TYPES = ['INCLUSION', 'EXCLUSION'];
const TABS = ['overview', 'parties', 'assets', 'financials', 'documents', 'ai_review'];

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

    const [sqModalOpen, setSqModalOpen] = useState(false);
    const [sqForm, setSqForm] = useState({ override: '' });

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
    const [reviewLoading, setReviewLoading] = useState(false);
    const [persisting, setPersisting] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [reviewSuccess, setReviewSuccess] = useState('');
    const [extractionResult, setExtractionResult] = useState(null);
    const [linkSuggestions, setLinkSuggestions] = useState([]);
    const [decisions, setDecisions] = useState({});
    const [resolvedRunId, setResolvedRunId] = useState(null);
    const [currentDocHash, setCurrentDocHash] = useState('');
    const [releasePickerOpen, setReleasePickerOpen] = useState(false);
    const [releaseOptions, setReleaseOptions] = useState([]);
    const [wizardReleaseId, setWizardReleaseId] = useState('');
    const [proposalLoading, setProposalLoading] = useState(false);
    const [applyLoading, setApplyLoading] = useState(false);
    const [proposalRunId, setProposalRunId] = useState(null);
    const [coreWriteProposals, setCoreWriteProposals] = useState([]);
    const [proposalDecisions, setProposalDecisions] = useState({});
    const [coreWriteError, setCoreWriteError] = useState('');
    const [coreWriteSuccess, setCoreWriteSuccess] = useState('');

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
                    contract_number: data.contract_number || '',
                });
                setSqForm({ override: data.status_quo_override || '' });
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

    const deleteContract = async () => {
        if (!(await confirmAction('Delete this contract entirely? This cannot be undone.', 'Delete Contract'))) return;
        try {
            await contractService.delete(id);
            navigate('/admin-of-works/contracts');
        } catch (err) {
            alert('Failed to delete contract');
        }
    };

    const saveStatusQuo = async (e) => {
        e.preventDefault();
        try {
            const res = await contractService.update(id, { status_quo_override: sqForm.override || null });
            setContract(res.data || res);
            setSqModalOpen(false);
        } catch (err) {
            alert('Failed to update status override');
        }
    };

    const removeAsset = async (assetId) => {
        if (!(await confirmAction('Remove asset?', 'Remove Asset'))) return;
        try {
            const res = await contractService.removeAsset(id, assetId);
            setContract(res.data || res);
        } catch (err) {
            alert('Failed to remove asset');
        }
    };

    const openIngestWizard = async () => {
        const releaseAssetIds = (contract?.assets || [])
            .filter((row) => String(row.asset_type || '').toLowerCase() === 'release')
            .map((row) => String(row.asset_id))
            .filter((val) => val);

        const targetDocId = selectedDoc?.id || latestDoc(contract)?.id || '';
        if (releaseAssetIds.length === 1) {
            navigate(`/release/${releaseAssetIds[0]}/contract-wizard?contract_id=${contract.id}&doc_id=${targetDocId}`);
            return;
        }

        if (releaseOptions.length === 0) {
            const rows = await CatalogService.getAll('releases', { limit: 2000 });
            setReleaseOptions(Array.isArray(rows) ? rows : []);
        }
        if (releaseAssetIds.length > 0) {
            setWizardReleaseId(releaseAssetIds[0]);
        }
        setReleasePickerOpen(true);
    };

    const computeSHA256 = async (buffer) => {
        if (window.crypto?.subtle) {
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        }
        return `${contract?.id || 'contract'}_${Date.now()}`;
    };

    const flattenSuggestions = (suggestionPayload) => {
        const output = [];
        Object.entries(suggestionPayload || {}).forEach(([group, list]) => {
            (list || []).forEach((row, index) => {
                output.push({
                    rowId: `${group}_${index}_${row.entity_type || 'entity'}_${row.display_name || 'unknown'}`,
                    group,
                    entity_type: row.entity_type || group,
                    entity_id: row.entity_id ?? null,
                    display_name: row.display_name || 'Unknown',
                    confidence: row.confidence ?? null,
                    rationale: row.rationale || '',
                });
            });
        });
        return output;
    };

    const runAIReview = async () => {
        if (!selectedDoc) {
            setReviewError('Attach/select a PDF document version first.');
            return;
        }

        setReviewLoading(true);
        setReviewError('');
        setReviewSuccess('');
        setResolvedRunId(null);
        setExtractionResult(null);
        setLinkSuggestions([]);
        setDecisions({});

        try {
            const token = localStorage.getItem('token');
            const downloadUrl = contractService.buildDownloadUrl(id, selectedDoc.id);
            const pdfResponse = await fetch(downloadUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!pdfResponse.ok) {
                throw new Error(`Failed to download contract PDF (${pdfResponse.status})`);
            }

            const pdfBlob = await pdfResponse.blob();
            const pdfArrayBuffer = await pdfBlob.arrayBuffer();
            const hash = await computeSHA256(pdfArrayBuffer);
            setCurrentDocHash(hash);

            const pdfFile = new File([pdfBlob], selectedDoc.file_name || `contract_${id}.pdf`, { type: 'application/pdf' });
            const extraction = await aiClient.extractContract(pdfFile);
            setExtractionResult(extraction);

            const linkResult = await aiClient.linkSuggest(extraction);
            const rows = flattenSuggestions(linkResult?.suggestions);
            setLinkSuggestions(rows);

            const initialDecisions = {};
            rows.forEach((row) => {
                initialDecisions[row.rowId] = row.confidence !== null && row.confidence >= 0.9 ? 'link' : 'review';
            });
            setDecisions(initialDecisions);
            setReviewSuccess('AI review completed. Validate row actions and persist decisions.');
        } catch (err) {
            console.error(err);
            setReviewError(err?.response?.data?.detail || err?.message || 'AI review failed.');
        } finally {
            setReviewLoading(false);
        }
    };

    const persistReviewDecisions = async () => {
        const selectedRows = linkSuggestions
            .filter((row) => (decisions[row.rowId] || 'review') !== 'review')
            .map((row) => ({
                entity_type: row.entity_type,
                entity_id: row.entity_id ? Number(row.entity_id) : null,
                display_name: row.display_name,
                action: decisions[row.rowId],
                confidence: row.confidence !== null ? Math.round(Number(row.confidence) * 100) : null,
                rationale: row.rationale || 'contract_review_ui',
            }));

        if (selectedRows.length === 0) {
            setReviewError('Select at least one row as link or ignore before persisting.');
            return;
        }

        if (!extractionResult) {
            setReviewError('Run AI Review first.');
            return;
        }

        setPersisting(true);
        setReviewError('');
        setReviewSuccess('');
        try {
            const payload = {
                contract_hash: currentDocHash || `${contract?.id || 'contract'}_${Date.now()}`,
                extractor_version: extractionResult.parser_version || 'deterministic_v1',
                linker_version: 'link_suggest_v1.0.0',
                decisions: selectedRows,
            };
            const result = await aiClient.resolveContract(payload);
            setResolvedRunId(result.run_id);
            setReviewSuccess(`Decisions persisted. run_id=${result.run_id}`);
        } catch (err) {
            console.error(err);
            setReviewError(err?.response?.data?.detail || 'Persist failed.');
        } finally {
            setPersisting(false);
        }
    };

    const generateCoreWriteSuggestions = async () => {
        setProposalLoading(true);
        setCoreWriteError('');
        setCoreWriteSuccess('');
        setProposalRunId(null);
        setCoreWriteProposals([]);
        setProposalDecisions({});
        try {
            const payload = {
                contract_id: Number(id),
                contract_document_id: selectedDoc?.id || null,
                contract_extract: extractionResult || undefined,
            };
            const result = await aiCoreWriteClient.propose(payload);
            if (result?.featureDisabled) {
                setCoreWriteError('AI core write is currently disabled.');
                return;
            }

            const proposals = result?.proposals || [];
            const decisions = {};
            proposals.forEach((row) => {
                decisions[row.item_id] = { decision: 'accept', overwrite: false };
            });

            setProposalRunId(result.run_id);
            setCoreWriteProposals(proposals);
            setProposalDecisions(decisions);
            setCoreWriteSuccess(`Generated ${proposals.length} proposal(s). Review before apply.`);
        } catch (err) {
            console.error(err);
            setCoreWriteError(err?.response?.data?.detail || err?.message || 'Failed to generate proposals.');
        } finally {
            setProposalLoading(false);
        }
    };

    const applyApprovedCoreWrite = async () => {
        if (!proposalRunId) {
            setCoreWriteError('Generate suggestions first.');
            return;
        }

        const selections = coreWriteProposals.map((row) => {
            const entry = proposalDecisions[row.item_id] || { decision: 'ignore', overwrite: false };
            return {
                item_id: Number(row.item_id),
                decision: entry.decision,
                overwrite: Boolean(entry.overwrite),
            };
        });

        const hasOverwrite = selections.some((row) => row.overwrite);
        if (hasOverwrite) {
            const confirmed = window.confirm('Overwrite was selected for at least one field. Continue apply?');
            if (!confirmed) return;
        }

        setApplyLoading(true);
        setCoreWriteError('');
        setCoreWriteSuccess('');
        try {
            const result = await aiCoreWriteClient.apply({
                run_id: Number(proposalRunId),
                confirm: true,
                selections,
            });
            if (result?.featureDisabled) {
                setCoreWriteError('AI core write is currently disabled.');
                return;
            }
            const res = await contractService.getById(id);
            setContract(res.data || res);
            setCoreWriteSuccess(
                `Apply completed. run_id=${result.run_id}, applied=${result.applied_count}, created=${result.created_count}, conflicts=${result.conflict_count}${result.idempotent_hit ? ' (idempotent)' : ''}`
            );
        } catch (err) {
            console.error(err);
            setCoreWriteError(err?.response?.data?.detail || err?.message || 'Apply failed.');
        } finally {
            setApplyLoading(false);
        }
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
                            <button className="icon-btn-small ml-2 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setSqModalOpen(true); }} title="Override">
                                <Settings size={12} />
                            </button>
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
                    <button className="btn ghost danger" onClick={deleteContract}>
                        <Trash size={16} /> Delete
                    </button>
                    <button className="btn orange" onClick={() => setDocModalOpen(true)}>
                        <Upload size={16} /> New Version
                    </button>
                    <button className="btn ghost" onClick={runAIReview} disabled={reviewLoading}>
                        <CheckCircle size={16} /> {reviewLoading ? 'Running AI Review…' : 'Run AI Review'}
                    </button>
                    <button className="btn ghost" onClick={openIngestWizard}>
                        <Upload size={16} /> Attach to Release (Wizard)
                    </button>
                </div>
            </header>

            {releasePickerOpen && (
                <div className="panel padded" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginTop: 0 }}>Choose Release</h4>
                    <select
                        value={wizardReleaseId}
                        onChange={(e) => setWizardReleaseId(e.target.value)}
                        className="input"
                        style={{ maxWidth: '420px' }}
                    >
                        <option value="">Select release</option>
                        {releaseOptions.map((row) => (
                            <option key={row.id} value={row.id}>
                                #{row.id} {row.title}
                            </option>
                        ))}
                    </select>
                    <div className="flex-row gap-2 mt-2">
                        <button
                            className="btn orange"
                            disabled={!wizardReleaseId}
                            onClick={() => {
                                const targetDocId = selectedDoc?.id || latestDoc(contract)?.id || '';
                                navigate(`/release/${wizardReleaseId}/contract-wizard?contract_id=${contract.id}&doc_id=${targetDocId}`);
                            }}
                        >
                            Open Wizard
                        </button>
                        <button className="btn ghost" onClick={() => setReleasePickerOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

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

            {activeTab === 'assets' && (
                <div className="panel">
                    <div className="panel-header">
                        <h3>Linked Assets</h3>
                        <button className="btn ghost btn-sm" onClick={() => setAssetModalOpen(true)}>
                            <Plus size={14} /> Link Asset
                        </button>
                    </div>
                    {contract.assets?.length === 0 ? (
                        <div className="placeholder">No assets linked yet.</div>
                    ) : (
                        <table className="contracts-table">
                            <thead>
                                <tr><th>Type</th><th>Asset ID</th><th>Scope</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {contract.assets?.map(a => (
                                    <tr key={a.id}>
                                        <td><span className="badge">{a.asset_type}</span></td>
                                        <td className="mono">{a.asset_id}</td>
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

            {activeTab === 'financials' && (
                <div className="panel padded">
                    <div className="panel-header">
                        <h3>Financial Terms</h3>
                        <button className="btn ghost btn-sm" onClick={() => setFinancialModalOpen(true)}>
                            <Edit3 size={14} /> Edit Financials
                        </button>
                    </div>
                    <div className="grid-2">
                        <div>
                            <h4 className="eyebrow">Advances</h4>
                            <div className="stat-value">{contract.advances_currency} {contract.advances_amount ? Number(contract.advances_amount).toLocaleString() : '0.00'}</div>
                            {contract.recoupment_notes && <p className="small muted mt-2">{contract.recoupment_notes}</p>}
                        </div>
                        <div>
                            <h4 className="eyebrow">Royalty Description</h4>
                            <p className="p-notes whitespace-pre-wrap">{contract.royalty_description || 'No royalties defined.'}</p>
                        </div>
                    </div>

                    <div className="mt-3" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                        <div className="panel-header">
                            <h3>AI Assist (Propose → Review → Apply)</h3>
                            <div className="flex-row gap-2">
                                <button className="btn ghost btn-sm" onClick={generateCoreWriteSuggestions} disabled={proposalLoading}>
                                    {proposalLoading ? 'Generating…' : 'Generate Suggestions'}
                                </button>
                                <button className="btn ghost btn-sm" onClick={applyApprovedCoreWrite} disabled={applyLoading || !proposalRunId}>
                                    {applyLoading ? 'Applying…' : 'Apply Approved Changes'}
                                </button>
                            </div>
                        </div>

                        <div className="small muted mb-2">
                            Non-destructive default: existing populated fields are not overwritten unless explicitly selected and allowlisted.
                        </div>
                        {proposalRunId && (
                            <div className="small muted mb-2">Proposal run_id: <span className="mono">{proposalRunId}</span></div>
                        )}
                        {coreWriteError && (
                            <div className="error-banner mb-2">
                                <AlertCircle size={14} /> {coreWriteError}
                            </div>
                        )}
                        {coreWriteSuccess && (
                            <div className="success-banner mb-2">
                                <CheckCircle size={14} /> {coreWriteSuccess}
                            </div>
                        )}

                        {coreWriteProposals.length === 0 ? (
                            <div className="placeholder">No core-write proposals generated yet.</div>
                        ) : (
                            <table className="contracts-table">
                                <thead>
                                    <tr>
                                        <th>Entity</th>
                                        <th>Operation</th>
                                        <th>Patch</th>
                                        <th>Conflicts</th>
                                        <th>Decision</th>
                                        <th>Overwrite</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coreWriteProposals.map((row) => {
                                        const itemState = proposalDecisions[row.item_id] || { decision: 'accept', overwrite: false };
                                        return (
                                            <tr key={row.item_id}>
                                                <td>{row.entity_type}{row.entity_id ? ` #${row.entity_id}` : ''}</td>
                                                <td>{row.operation}</td>
                                                <td className="mono small">{JSON.stringify(row.patch || {})}</td>
                                                <td className="mono small">{JSON.stringify(row.conflicts || [])}</td>
                                                <td>
                                                    <select
                                                        className="input"
                                                        value={itemState.decision}
                                                        onChange={(e) => setProposalDecisions((prev) => ({
                                                            ...prev,
                                                            [row.item_id]: { ...itemState, decision: e.target.value },
                                                        }))}
                                                    >
                                                        <option value="accept">accept</option>
                                                        <option value="ignore">ignore</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(itemState.overwrite)}
                                                        onChange={(e) => setProposalDecisions((prev) => ({
                                                            ...prev,
                                                            [row.item_id]: { ...itemState, overwrite: e.target.checked },
                                                        }))}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'ai_review' && (
                <div className="panel padded">
                    <div className="panel-header">
                        <h3>Governed AI Review</h3>
                        <div className="flex-row gap-2">
                            <button className="btn ghost btn-sm" onClick={runAIReview} disabled={reviewLoading}>
                                {reviewLoading ? 'Running…' : 'Run AI Review'}
                            </button>
                            <button className="btn ghost btn-sm" onClick={persistReviewDecisions} disabled={persisting || reviewLoading}>
                                {persisting ? 'Persisting…' : 'Persist Decisions'}
                            </button>
                        </div>
                    </div>

                    {reviewError && (
                        <div className="error-banner mb-2">
                            <AlertCircle size={14} /> {reviewError}
                        </div>
                    )}
                    {reviewSuccess && (
                        <div className="success-banner mb-2">
                            <CheckCircle size={14} /> {reviewSuccess}
                        </div>
                    )}
                    {resolvedRunId && (
                        <div className="small muted mb-2">
                            Persisted run_id: <span className="mono">{resolvedRunId}</span>
                        </div>
                    )}

                    <div className="grid-2">
                        <div>
                            <h4 className="eyebrow">Extract Output</h4>
                            {extractionResult ? (
                                <>
                                    {extractionResult.warnings?.length > 0 && (
                                        <ul className="mb-2">
                                            {extractionResult.warnings.map((warning, idx) => (
                                                <li key={`${warning}_${idx}`} className="small muted">{warning}</li>
                                            ))}
                                        </ul>
                                    )}
                                    <pre className="mono small" style={{ maxHeight: '240px', overflow: 'auto', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                                        {JSON.stringify(extractionResult, null, 2)}
                                    </pre>
                                </>
                            ) : (
                                <div className="placeholder">No extraction yet. Run AI Review.</div>
                            )}
                        </div>
                        <div>
                            <h4 className="eyebrow">Link Suggestions</h4>
                            {linkSuggestions.length === 0 ? (
                                <div className="placeholder">No suggestions yet.</div>
                            ) : (
                                <table className="contracts-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Confidence</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {linkSuggestions.map((row) => (
                                            <tr key={row.rowId}>
                                                <td>{row.display_name}</td>
                                                <td>{row.entity_type}</td>
                                                <td>{row.confidence !== null ? Number(row.confidence).toFixed(2) : '—'}</td>
                                                <td>
                                                    <select
                                                        className="input"
                                                        value={decisions[row.rowId] || 'review'}
                                                        onChange={(e) => setDecisions((prev) => ({ ...prev, [row.rowId]: e.target.value }))}
                                                    >
                                                        <option value="link">link</option>
                                                        <option value="ignore">ignore</option>
                                                        <option value="review">review</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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

            <EntityForm isOpen={sqModalOpen} onClose={() => setSqModalOpen(false)} title="Override Status Quo" onSubmit={saveStatusQuo}>
                <div className="form-group">
                    <label>Manual Override</label>
                    <select className="input" value={sqForm.override} onChange={e => setSqForm({ ...sqForm, override: e.target.value })}>
                        <option value="">Calculated (Default)</option>
                        <option value="GREEN">Green (Good)</option>
                        <option value="AMBER">Amber (Warning)</option>
                        <option value="RED">Red (Critical)</option>
                    </select>
                    <p className="small muted mt-2">Setting this will override the automatic calculation.</p>
                </div>
            </EntityForm>
        </div>
    );
};

export default ContractDetail;
