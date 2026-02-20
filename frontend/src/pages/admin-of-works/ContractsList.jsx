import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { confirmAction } from '../../lib/tauri';
import contractService from '../../services/contractService';
import { getContracts } from '../../services/operations';
import AddContractWizard from '../../components/contracts/AddContractWizard';
import CompletenessBadge from '../../components/contracts/CompletenessBadge';

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



const ContractsList = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({ contracts: [], counts: {}, meta: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isUpdating, setIsUpdating] = useState(false);

    const contracts = useMemo(() => {
        if (Array.isArray(data?.contracts)) return data.contracts;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data)) return data;
        return [];
    }, [data]);
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

    const filtered = useMemo(() => {
        return contracts.filter((c) => {
            const matchesSearch = `${c.title || ''} ${c.contract_number || ''}`.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });
    }, [contracts, search]);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!(await confirmAction('Are you sure you want to delete this contract? This action cannot be undone.', 'Delete Contract'))) return;
        try {
            await contractService.delete(id);
            setData((prev) => {
                const updatedContracts = (prev?.contracts || []).filter(c => c.id !== id);
                const updatedItems = (prev?.items || []).filter(c => c.id !== id);
                const updatedResults = (prev?.results || []).filter(c => c.id !== id);
                return { ...prev, contracts: updatedContracts, items: updatedItems, results: updatedResults };
            });
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (err) {
            console.error(err);
            alert('Failed to delete contract: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filtered.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (e, id) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkActivate = async () => {
        if (!selectedIds.size) return;
        setIsUpdating(true);
        try {
            await Promise.all(
                Array.from(selectedIds).map(id => contractService.update(id, { status: 'Active' }))
            );

            // Re-fetch contracts
            const res = await getContracts();
            setData(res);
            setSelectedIds(new Set());
        } catch (e) {
            console.error('Failed to bulk activate:', e);
            alert('Failed to activate some contracts. Please try again.');
        } finally {
            setIsUpdating(false);
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

            <div className="panel filters-row" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="search-box-inline" style={{ flex: 1 }}>
                    <Search size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contracts..." />
                </div>
                {selectedIds.size > 0 && (
                    <button
                        className="btn"
                        style={{ backgroundColor: '#10b981', color: '#fff' }}
                        disabled={isUpdating}
                        onClick={handleBulkActivate}
                    >
                        {isUpdating ? 'Updating...' : `Mark Active (${selectedIds.size})`}
                    </button>
                )}
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
                                <th style={{ width: 40 }}><input type="checkbox" onChange={handleSelectAll} checked={filtered.length > 0 && selectedIds.size === filtered.length} /></th>
                                <th>Status</th>
                                <th>Completeness</th>
                                <th>Title</th>
                                <th>Parties</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(c => (
                                <tr key={c.id} onClick={() => navigate(`/contracts/${c.id}`)}>
                                    <td onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedIds.has(c.id)} onChange={e => handleSelect(e, c.id)} />
                                    </td>
                                    <td>
                                        <span className={`status-badge ${STATUS_COLORS[c.status]}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td>
                                        <CompletenessBadge completeness={c.status_quo || c.completeness || null} />
                                    </td>
                                    <td className="strong">{c.title} <div className="muted small mono">{c.contract_number}</div></td>
                                    <td title={c.parties_summary?.items?.map(p =>
                                        p.kind === 'group' && p.member_preview?.length
                                            ? `${p.display}\nMembers: ${p.member_preview.map(m => m.name).join(', ')}`
                                            : (p.display || p.name)
                                    ).join('\n') || ''}
                                        style={{ cursor: c.parties_summary?.count ? 'help' : 'default' }}
                                    >
                                        {c.parties_summary?.count > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {c.parties_summary.items.slice(0, 3).map((p, idx) => (
                                                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <span style={{ maxWidth: 160 }} className="truncate">{p.name}</span>
                                                        {p.kind === 'group' && <span className={`status-badge success`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>GROUP</span>}
                                                    </span>
                                                ))}
                                                {c.parties_summary.count > 3 && <span className="muted small">+{c.parties_summary.count - 3} more</span>}
                                            </div>
                                        ) : (
                                            <span className="muted">{(c.counts?.parties ?? 0)} parties</span>
                                        )}
                                    </td>
                                    <td className="actions">
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}`); }}>View</button>
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.id}?edit=true`); }}>Edit</button>
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
