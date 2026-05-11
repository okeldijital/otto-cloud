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
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

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
        const items = contract.parties_summary?.items;
        if (!items || items.length === 0) return '';
        return items.map((p) => {
            let line = p.display || p.name || `${p.party_type || 'Party'} #${p.entity_id || ''}`;
            if (p.kind === 'group' && p.member_preview?.length) {
                line += `\nMembers: ${p.member_preview.map(m => m.name).join(', ')}`;
            }
            return line;
        }).join('\n');
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
        <div className="page-container p-6 max-w-7xl mx-auto">
            <PageHeader
                title="Contracts"
                subtitle="Upload signed PDFs, then capture parties, assets, and terms."
                actions={
                    <Button variant="primary" className="shadow-glow" onClick={() => setShowCreate(true)}>
                        <Plus size={16} className="mr-2" /> Add New Contract
                    </Button>
                }
            />

            <div className="bg-premium-glass border border-white/5 rounded-[24px] p-4 flex flex-col md:flex-row gap-4 mb-6 shadow-sm backdrop-blur-xl">
                <div className="flex flex-wrap gap-4 items-center flex-grow">
                    <Filter size={16} className="text-text-secondary" />
                    <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50 transition-colors" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">Status: All</option>
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Archived">Archived</option>
                    </select>
                    <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50 transition-colors" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="All">Type: All</option>
                        {CONTRACT_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50 transition-colors" value={expiring} onChange={(e) => setExpiring(Number(e.target.value))}>
                        {EXPIRING_BUCKETS.map((b) => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:max-w-xs focus-within:border-accent/50 transition-colors">
                    <Search size={16} className="text-text-secondary" />
                    <input
                        className="bg-transparent border-none text-sm text-white outline-none w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search contracts or CTR number"
                    />
                </div>
            </div>

            <div className="bg-premium-glass border border-white/5 rounded-[24px] shadow-glass overflow-hidden backdrop-blur-xl">
                {loading ? (
                    <div className="py-16 text-center text-text-secondary">Loading contracts…</div>
                ) : error ? (
                    <div className="py-8 px-6 bg-danger/10 text-danger border-l-4 border-danger">{error}</div>
                ) : filtered.length === 0 ? (
                    contracts.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center">
                            <h3 className="text-xl font-bold text-white mb-2">Upload a signed contract PDF to begin.</h3>
                            <p className="text-text-secondary mb-6">OTTO does not create contracts — it organizes them.</p>
                            <Button variant="primary" className="shadow-glow" onClick={() => setShowCreate(true)}>
                                <Plus size={16} className="mr-2" /> Upload Contract (PDF)
                            </Button>
                        </div>
                    ) : (
                        <div className="py-16 text-center">
                            <h3 className="text-xl font-bold text-white mb-2">No contracts match your filters.</h3>
                            <p className="text-text-secondary">Adjust filters or clear search.</p>
                        </div>
                    )
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="bg-white/[0.02]">
                                <tr>
                                    <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">Status</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">Title</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">Parties</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">Assets</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">Document</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">Term</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c) => (
                                    <tr key={c.id} onClick={() => navigate(`/contracts/${c.id}`)} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors group cursor-pointer">
                                        <td className="px-6 py-5">
                                            <Badge variant={STATUS_COLORS[(c.status || '').toLowerCase()] || 'neutral'} size="sm">
                                                {((c.status || '—') + '').toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 font-medium">
                                            <button className="text-white hover:text-accent font-bold transition-colors text-left" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}`); }}>
                                                {c.title || 'Untitled contract'}
                                            </button>
                                            <div className="text-text-secondary font-mono text-xs mt-1">{c.contract_number || '—'}</div>
                                        </td>
                                        <td className="px-6 py-5 text-sm" title={partyTooltip(c)} style={{ cursor: c.parties_summary?.count ? 'help' : 'default' }}>
                                            {c.parties_summary?.count > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {c.parties_summary.items.slice(0, 3).map((p, idx) => (
                                                        <span key={idx} className="flex items-center gap-2">
                                                            <span className="truncate text-white" style={{ maxWidth: 180 }}>{p.name}</span>
                                                            {p.kind === 'group' && <Badge variant="success" size="sm">GROUP</Badge>}
                                                        </span>
                                                    ))}
                                                    {c.parties_summary.count > 3 && <span className="text-text-secondary text-xs">+{c.parties_summary.count - 3} more</span>}
                                                </div>
                                            ) : (
                                                <span className="text-text-secondary text-sm">{(c.counts?.parties ?? 0)} parties</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-sm text-white">{(c.counts?.tracks ?? c.counts?.assets ?? c.assets?.length ?? c.asset_count ?? 0)} tracks</td>
                                        <td className="px-6 py-5">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-text-secondary mb-1">
                                                <FileText size={12} /> {(c.counts?.documents ?? c.documents?.length) ? `v${c.counts?.documents ?? c.documents?.length}` : c.primary_document_id ? 'PDF' : '—'}
                                            </div>
                                            <div>
                                                {(() => {
                                                    const view = getCompletenessView(c);
                                                    return (
                                                        <Badge variant={HEALTH_COLORS[view.color] || 'neutral'} size="sm">
                                                            {view.color.toUpperCase()}
                                                        </Badge>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-5 text-sm ${isExpired(c.end_date) ? 'text-danger' : 'text-white'}`}>
                                            {(c.dates?.effective_date || c.effective_date || c.start_date || '—')} → {(c.dates?.expiration_date || c.end_date || '—')}
                                            {c.completeness?.score != null && (
                                                <div className="text-text-secondary text-xs mt-1">Score: {c.completeness.score}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}`); }}>View</Button>
                                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}?tab=parties`); }}>Add Parties</Button>
                                                <Button variant="ghost" size="sm" onClick={(e) => handleDownload(e, c)}>
                                                    <Download size={14} /> Download
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
