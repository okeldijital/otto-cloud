import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Download } from 'lucide-react';
import contractService from '../services/contractService';
import CatalogService from '../services/catalog';
import { formatCreateError } from '../utils/contracts';
import { isTauriEnv, downloadFile } from '../lib/tauri';
import EntityForm from '../components/EntityForm';
import Autocomplete from '../components/Autocomplete';
import AddContractWizard from '../components/contracts/AddContractWizard';
import { normalizeContractsListResponse } from '../services/operations';

const STATUS_COLORS = {
    draft: 'neutral',
    active: 'success',
    expired: 'muted',
    archived: 'danger',
};

const HEALTH_COLORS = {
    red: 'danger',
    amber: 'warning',
    green: 'success',
};

function getCompletenessView(contract) {
    const c = contract?.completeness || {};
    const score = Number(c.score || 0);
    const missing = Array.isArray(c.missing)
        ? c.missing
        : Array.isArray(c.reasons)
            ? c.reasons.map((r) => (typeof r === 'string' ? r : r?.code)).filter(Boolean)
            : [];
    if (missing.includes('missing_tracks') || missing.includes('missing_parties') || score < 70) {
        return { score, color: 'red' };
    }
    if (score === 100) return { score, color: 'green' };
    return { score, color: 'amber' };
}

const CONTRACT_TYPES = ['Recording', 'Publishing', 'License', 'Other', 'Unknown'];
const EXPIRING_BUCKETS = [
    { label: 'Any time', value: 0 },
    { label: 'Expiring ≤30 days', value: 30 },
    { label: 'Expiring ≤60 days', value: 60 },
    { label: 'Expiring ≤90 days', value: 90 },
];

const Contracts = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState([]);
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [expiring, setExpiring] = useState(0);

    const [showCreate, setShowCreate] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createForm, setCreateForm] = useState({
        title: '',
        contract_number: '',
        contract_type: 'Recording',
        status: 'Draft',
        start_date: '',
        end_date: '',
        signed_date: '',
        territory: 'World',
        exclusivity: false,
        notes: '',
        file: null,
        release_id: null,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [conRes, relRes] = await Promise.all([
                    contractService.getAll(),
                    CatalogService.getAll('releases')
                ]);
                const payload = normalizeContractsListResponse(conRes.data || conRes || {});
                const items = Array.isArray(payload)
                    ? payload
                    : (Array.isArray(payload?.items) ? payload.items : (payload?.contracts ?? []));
                setContracts(Array.isArray(items) ? items : []);
                setReleases(relRes.data || relRes || []);
            } catch (e) {
                console.error(e);
                setError('Unable to load contracts. Please check network or auth.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError('');
        try {
            // Requirement: Block setting ACTIVE unless at least one document exists (or is being uploaded now)
            if (createForm.status === 'Active' && !createForm.file) {
                setCreateError('A PDF document is required before activating a contract.');
                return;
            }

            const payload = new FormData();
            payload.append('title', createForm.title);
            payload.append('contract_number', createForm.contract_number || `CTR-${Math.floor(100000 + Math.random() * 900000)}`);
            payload.append('status_value', createForm.status || 'Draft');
            if (createForm.contract_type) payload.append('contract_type', createForm.contract_type);
            if (createForm.start_date) payload.append('start_date', createForm.start_date);
            if (createForm.end_date) payload.append('end_date', createForm.end_date);
            if (createForm.signed_date) payload.append('signed_date', createForm.signed_date);
            if (createForm.territory) payload.append('territory', createForm.territory);
            payload.append('exclusivity', createForm.exclusivity);
            if (createForm.notes) payload.append('notes', createForm.notes);
            if (createForm.release_id) payload.append('release_id', createForm.release_id);

            if (createForm.file) {
                payload.append('file', createForm.file);
            }

            const res = await contractService.create(payload);

            // Log truth as per Requirement Step 1
            console.log('Contract Created Success:', {
                status: res.status,
                url: res.config?.url,
                data: res.data
            });

            setShowCreate(false);
            setCreateForm({
                title: '',
                contract_number: '',
                contract_type: 'Recording',
                status: 'Draft',
                start_date: '',
                end_date: '',
                signed_date: '',
                territory: 'World',
                exclusivity: false,
                notes: '',
                file: null,
                release_id: null,
            });
            const newContract = res.data || res;
            setContracts((prev) => [newContract, ...prev]);
            navigate(`/contracts/${newContract.id}`);
        } catch (err) {
            // Logging handles by formatCreateError utility but let's be explicit here too
            console.error('Contract create failed', {
                status: err?.response?.status,
                url: err?.response?.config?.url || err?.config?.url,
                body: err?.response?.data,
            });
            setCreateError(formatCreateError(err));
        }
    };

    const filtered = useMemo(() => {
        const now = new Date();
        return contracts
            .filter((c) => {
                const matchesSearch =
                    `${c.title || ''} ${c.contract_number || ''}`
                        .toLowerCase()
                        .includes(search.toLowerCase());
                const matchesStatus =
                    statusFilter === 'All' || (c.status || '').toLowerCase() === statusFilter.toLowerCase();
                const matchesType =
                    typeFilter === 'All' ||
                    (c.type || c.contract_type || '').toLowerCase() ===
                    typeFilter.toLowerCase();
                const matchesExpiring =
                    expiring === 0 ||
                    (c.end_date &&
                        new Date(c.end_date) - now <= expiring * 24 * 60 * 60 * 1000 &&
                        new Date(c.end_date) >= now);
                return matchesSearch && matchesStatus && matchesType && matchesExpiring;
            })
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }, [contracts, search, statusFilter, typeFilter, expiring]);

    const partyTooltip = (contract) => {
        if (!contract.parties || contract.parties.length === 0) return '';
        return contract.parties
            .map((p) => p.display_name || p.external_name || p.name || `${p.entity_type || 'Party'} ${p.entity_id || ''}`.trim())
            .join(', ');
    };

    const isExpired = (endDate) => {
        if (!endDate) return false;
        const now = new Date();
        return new Date(endDate) < now;
    };

    const handleDownload = async (e, contract) => {
        e.stopPropagation();
        const docId = contract.primary_document_id || contract.documents?.[0]?.id;
        if (!docId) {
            alert('No document available to download.');
            return;
        }
        const url = contractService.buildDownloadUrl(contract.id, docId);

        if (isTauriEnv()) {
            try {
                // Determine filename (best effort)
                const filename = `Contract_${contract.contract_number || contract.id}.pdf`;
                await downloadFile(url, filename);
            } catch (error) {
                console.error('Download failed', error);
                alert('Download failed: ' + (error.message || 'Unknown error'));
            }
        } else {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="contracts-shell">
            <header className="contracts-header">
                <div>
                    <p className="breadcrumb">Legal ▸ Contracts</p>
                    <h1>Contracts</h1>
                    <p className="muted">Upload signed PDFs, then capture parties, assets, and terms.</p>
                </div>
                <div className="header-actions">
                    <button className="btn orange" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Add New Contract
                    </button>
                </div>
            </header>

            <div className="panel filters-row">
                <div className="filter-group">
                    <Filter size={16} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">Status: All</option>
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Archived">Archived</option>
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="All">Type: All</option>
                        {CONTRACT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <select value={expiring} onChange={(e) => setExpiring(Number(e.target.value))}>
                        {EXPIRING_BUCKETS.map((b) => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>
                <div className="search-box-inline">
                    <Search size={16} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search contracts or CTR number"
                    />
                </div>
            </div>

            <div className="panel">
                {loading ? (
                    <div className="placeholder">Loading contracts…</div>
                ) : error ? (
                    <div className="error-banner">{error}</div>
                ) : filtered.length === 0 ? (
                    contracts.length === 0 ? (
                        <div className="empty-state">
                            <div>
                                <h3>Upload a signed contract PDF to begin.</h3>
                                <p className="muted">OTTO does not create contracts — it organizes them.</p>
                                <button className="btn orange" onClick={() => setShowCreate(true)}>
                                    <Plus size={16} /> Upload Contract (PDF)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div>
                                <h3>No contracts match your filters.</h3>
                                <p className="muted">Adjust filters or clear search.</p>
                            </div>
                        </div>
                    )
                ) : (
                    <table className="contracts-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Title</th>
                                <th>Parties</th>
                                <th>Assets</th>
                                <th>Document</th>
                                <th>Term</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c) => (
                                <tr key={c.id} onClick={() => navigate(`/contracts/${c.id}`)}>
                                    <td>
                                        <span className={`status-badge ${STATUS_COLORS[(c.status || '').toLowerCase()] || 'neutral'}`}>
                                            {((c.status || '—') + '').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="strong">
                                        <button className="link-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}`); }}>
                                            {c.title || 'Untitled contract'}
                                        </button>
                                        <div className="muted mono small">{c.contract_number || '—'}</div>
                                    </td>
                                    <td title={partyTooltip(c)}>
                                        {(c.counts?.parties ?? c.parties?.length ?? c.party_count ?? 0)} parties
                                    </td>
                                    <td>{(c.counts?.tracks ?? c.counts?.assets ?? c.assets?.length ?? c.asset_count ?? 0)} tracks</td>
                                    <td>
                                        <span className="doc-chip">
                                            <FileText size={14} /> {(c.counts?.documents ?? c.documents?.length) ? `v${c.counts?.documents ?? c.documents?.length}` : c.primary_document_id ? 'PDF' : '—'}
                                        </span>
                                        <div style={{ marginTop: 4 }}>
                                            {(() => {
                                                const view = getCompletenessView(c);
                                                return (
                                                    <span className={`status-badge ${HEALTH_COLORS[view.color] || 'neutral'}`}>
                                                        {view.color.toUpperCase()}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className={isExpired(c.end_date) ? 'danger-text' : ''}>
                                        {(c.dates?.effective_date || c.effective_date || c.start_date || '—')} → {(c.dates?.expiration_date || c.end_date || '—')}
                                        {c.completeness?.score != null && (
                                            <div className="muted small">Score: {c.completeness.score}</div>
                                        )}
                                    </td>
                                    <td className="actions">
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}`); }}>View</button>
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}?tab=parties`); }}>Add Parties</button>
                                        <button className="ghost-btn" onClick={(e) => handleDownload(e, c)}>
                                            <Download size={14} /> Download
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <AddContractWizard
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={(created) => {
                    const cid = created?.contract?.id || created?.contract_id;
                    if (cid) {
                        navigate(`/contracts/${cid}`);
                    }
                }}
            />
        </div>
    );
};

export default Contracts;
