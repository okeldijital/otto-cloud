import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Search, Filter, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import worksAdminService from '../../services/worksAdminService';

const STATUS_COLORS = {
    Unknown: 'neutral',
    Submitted: 'warning',
    Registered: 'success',
    Rejected: 'danger',
};

const WorksAdminList = () => {
    const navigate = useNavigate();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await worksAdminService.getAll();
                setAdmins(res.data || res || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load works administration records.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = useMemo(() => {
        return admins.filter((a) => {
            const matchesSearch = (a.work?.title || '').toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'All' || a.registration_status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [admins, search, statusFilter]);

    return (
        <div className="contracts-shell">
            <header className="contracts-header">
                <div>
                    <p className="breadcrumb">Administration ▸ Works Administration</p>
                    <h1>Works Administration</h1>
                    <p className="muted">Evidence of registration, ISWCs, and linked publishing contracts.</p>
                </div>
            </header>

            <div className="panel filters-row">
                <div className="filter-group">
                    <Filter size={16} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">All Registration Statuses</option>
                        <option value="Registered">Registered</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Unknown">Unknown</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
                <div className="search-box-inline">
                    <Search size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by work title..." />
                </div>
            </div>

            <div className="panel">
                {loading ? (
                    <div className="placeholder">Loading administration records...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">No records found. Works must be in catalog to appear here.</div>
                ) : (
                    <table className="contracts-table">
                        <thead>
                            <tr>
                                <th>Work ID</th>
                                <th>Title</th>
                                <th>Registration Status</th>
                                <th>Registered With</th>
                                <th>Proof Docs</th>
                                <th>Status Quo</th>
                                <th>Links</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(a => (
                                <tr key={a.id} onClick={() => navigate(`/admin-of-works/works/${a.work_id}`)}>
                                    <td className="mono small">#{a.work_id}</td>
                                    <td className="strong">{a.work?.title || 'Unknown Work'}</td>
                                    <td>
                                        <span className={`status-badge ${STATUS_COLORS[a.registration_status] || 'neutral'}`}>
                                            {a.registration_status}
                                        </span>
                                    </td>
                                    <td>{a.registered_with || '—'}</td>
                                    <td>
                                        <div className="flex-row gap-1">
                                            <FileText size={14} className="muted" /> {a.documents?.length || 0}
                                        </div>
                                    </td>
                                    <td>
                                        {a.status_quo && (
                                            <span className={`status-badge ${a.status_quo.status.toLowerCase()}`} title={a.status_quo.reasons.join('\n')}>
                                                {a.status_quo.status}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="small muted">
                                            {a.linked_contracts?.length || 0} contracts
                                        </div>
                                    </td>
                                    <td className="actions">
                                        <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); navigate(`/admin-of-works/works/${a.work_id}`); }}>Detail</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default WorksAdminList;
