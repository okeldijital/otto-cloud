import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Download, AlertCircle, Trash2 } from 'lucide-react';
import { confirmAction } from '../../lib/tauri';
import contractService from '../../services/contractService';
import { getContracts } from '../../services/operations';
import { formatCreateError } from '../../utils/contracts';
import EntityForm from '../../components/EntityForm';
import AddContractWizard from '../../components/contracts/AddContractWizard';

const STATUS_COLORS = {
    Draft: 'neutral',
    Active: 'success',
    Expired: 'muted',
    Terminated: 'danger',
    draft: 'neutral',
    active: 'success',
    expired: 'muted',
    archived: 'danger',
};

const CONTRACT_TYPES = ['Recording', 'Publishing', 'Remix', 'License'];

const COMPLETENESS_COLOR_CLASS = {
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
    const tracksMissing = missing.includes('missing_tracks');
    const partiesMissing = missing.includes('missing_parties');
    let color = 'amber';
    if (tracksMissing || partiesMissing || score < 70) color = 'red';
    else if (score === 100) color = 'green';
    return { score, color, missing };
}

const ContractsList = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({ contracts: [], counts: {}, meta: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [showExpiringSoon, setShowExpiringSoon] = useState(false);

    const [showCreate, setShowCreate] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createForm, setCreateForm] = useState({
        title: '',
        contract_number: '',
        type: 'Recording',
        status: 'Draft',
        start_date: '',
        end_date: '',
        signed_date: '',
        territory: 'World',
        exclusivity: false,
        notes: '',
        file: null,
    });
    const contracts = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.contracts)
                ? data.contracts
                : [];
    const counts = data?.counts ?? {};

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await getContracts();
                setData(res);
            } catch (e) {
                console.error(e);
                setError('Unable to load contracts.');
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
            // Requirement: Active requires PDF (Optional for now)
            // if (createForm.status === 'Active' && !createForm.file) {
            //     setCreateError('A PDF document is required for Active contracts.');
            //     return;
            // }

            const payload = new FormData();
            payload.append('title', createForm.title);
            payload.append('contract_number', createForm.contract_number || `CTR-${Math.floor(100000 + Math.random() * 900000)}`);
            payload.append('status_value', createForm.status);
            payload.append('type', createForm.type);
            if (createForm.start_date) payload.append('start_date', createForm.start_date);
            if (createForm.end_date) payload.append('end_date', createForm.end_date);
            if (createForm.signed_date) payload.append('signed_date', createForm.signed_date);
            if (createForm.territory) payload.append('territory', createForm.territory);
            payload.append('exclusivity', createForm.exclusivity);
            if (createForm.notes) payload.append('notes', createForm.notes);

            if (createForm.file) {
                payload.append('file', createForm.file);
            }

            const res = await contractService.create(payload);
            const newContract = res.data || res;
            setShowCreate(false);
            navigate(`/contracts/${newContract.id}`);
        } catch (err) {
            setCreateError(formatCreateError(err));
        }
    };

    const filtered = useMemo(() => {
        const now = new Date();
        const sixtyDaysOut = new Date();
        sixtyDaysOut.setDate(now.getDate() + 60);

        return contracts.filter((c) => {
            const matchesSearch = `${c.title || ''} ${c.contract_number || ''}`.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'All' || String(c.status || '').toLowerCase() === statusFilter.toLowerCase();
            const matchesType = typeFilter === 'All' || String(c.type || '').toLowerCase() === typeFilter.toLowerCase();
            const matchesExpiring = !showExpiringSoon || (c.end_date && new Date(c.end_date) <= sixtyDaysOut && new Date(c.end_date) >= now);

            return matchesSearch && matchesStatus && matchesType && matchesExpiring;
        });
    }, [contracts, search, statusFilter, typeFilter, showExpiringSoon]);

    const handleDownload = (e, contract) => {
        e.stopPropagation();
        const docId = contract.primary_document_id || contract.documents?.[0]?.id;
        if (!docId) return alert('No PDF attached.');
        window.open(contractService.buildDownloadUrl(contract.id, docId), '_blank');
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!(await confirmAction('Are you sure you want to delete this contract? This action cannot be undone.', 'Delete Contract'))) return;
        try {
            await contractService.delete(id);
            setData((prev) => {
                const current = Array.isArray(prev?.contracts) ? prev.contracts : [];
                return { ...prev, contracts: current.filter(c => c.id !== id) };
            });
        } catch (err) {
            console.error(err);
            alert('Failed to delete contract: ' + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="contracts-shell">
            <header className="contracts-header">
                <div>
                    <p className="breadcrumb">Administration ▸ Contracts</p>
                    <h1>Contracts</h1>
                    <p className="muted">Manage signed agreements, parties, and royalty terms.</p>
                </div>
                <div className="header-actions">
                    <button className="btn orange" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Add Contract
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
                        <option value="Terminated">Terminated</option>
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="All">Type: All</option>
                        {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label className="checkbox-filter">
                        <input type="checkbox" checked={showExpiringSoon} onChange={e => setShowExpiringSoon(e.target.checked)} />
                        Expiring Soon
                    </label>
                </div>
                <div className="search-box-inline">
                    <Search size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or parties..." />
                </div>
            </div>

            <div className="panel">
                {loading ? (
                    <div className="placeholder">Loading contracts...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">No contracts found.</div>
                ) : (
                    <table className="contracts-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Title</th>
                                <th>Parties</th>
                                <th>Assets</th>
                                <th>Dates</th>
                                <th>Completeness</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(c => (
                                <tr key={c.id} onClick={() => navigate(`/contracts/${c.id}`)}>
                                    <td>
                                        <span className={`status-badge ${STATUS_COLORS[c.status]}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="strong">{c.title} <div className="muted small mono">{c.contract_number}</div></td>
                                    <td>
                                        <div title={c.parties?.map(p => p.external_name || p.display_name).join(', ')}>
                                            {(c.counts?.parties ?? c.parties?.length ?? 0)} parties
                                        </div>
                                    </td>
                                    <td>
                                        {(c.counts?.tracks ?? c.counts?.assets ?? c.assets?.length ?? 0)} tracks
                                        <div className="small muted">
                                            <button className="link-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}?tab=assets`); }}>Open Assets</button>
                                        </div>
                                    </td>
                                    <td>
                                        {(c.dates?.effective_date || c.effective_date || c.start_date || '—')} → {(c.dates?.expiration_date || c.end_date || '—')}
                                    </td>
                                    <td>
                                        {(() => {
                                            const cv = getCompletenessView(c);
                                            return (
                                        <span className={`status-badge ${COMPLETENESS_COLOR_CLASS[cv.color] || 'neutral'}`}>
                                                    {cv.color.toUpperCase()} {cv.score}%
                                                </span>
                                            );
                                        })()}
                                        {counts?.total ? <div className="small muted">Total: {counts.total}</div> : null}
                                    </td>
                                    <td className="actions">
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}`); }}>View</button>
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}?tab=parties`); }}>
                                            Add Parties
                                        </button>
                                        <button className="ghost-btn" onClick={(e) => handleDownload(e, c)} disabled={!c.documents?.length}>
                                            <Download size={14} /> PDF
                                        </button>
                                        <button className="ghost-btn danger" onClick={(e) => handleDelete(e, c.id)}>
                                            <Trash2 size={14} />
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
                    if (created?.contract_id) navigate(`/contracts/${created.contract_id}`);
                }}
            />
        </div>
    );
};

export default ContractsList;
