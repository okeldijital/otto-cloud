import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    ChevronRight,
    FileText,
    ShieldCheck,
    Filter,
    Download,
    RefreshCw
} from 'lucide-react';
import statusQuoService from '../../services/statusQuoService';

const StatusQuoDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState({ status: 'All', type: 'All' });

    const [recomputing, setRecomputing] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter.status !== 'All') params.status_filter = filter.status.toUpperCase();
            if (filter.type !== 'All') params.type_filter = filter.type.toLowerCase();

            const res = await statusQuoService.getDashboard(params);
            setData(res.data || res);
        } catch (err) {
            console.error(err);
            setError('Failed to load status quo dashboard.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filter]);

    const handleRecompute = async () => {
        setRecomputing(true);
        try {
            await statusQuoService.recompute();
            await loadData();
        } catch (err) {
            alert('Recompute failed');
        } finally {
            setRecomputing(false);
        }
    };

    if (loading && !data) return <div className="placeholder">Loading status quo insight…</div>;
    if (error) return <div className="error-banner">{error}</div>;

    const { summary, alerts, contracts, works } = data;

    const getStatusClass = (status) => {
        return status?.toLowerCase() || 'neutral';
    };

    return (
        <div className="contracts-shell">
            <header className="contracts-header">
                <div>
                    <p className="breadcrumb">Administration ▸ Status Quo</p>
                    <h1>Status Quo Dashboard</h1>
                    <p className="muted">Live monitoring of legal compliance and registration health.</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn-primary flex items-center gap-2 ${recomputing ? 'animate-pulse' : ''}`}
                        onClick={handleRecompute}
                        disabled={recomputing}
                    >
                        <RefreshCw size={16} className={recomputing ? 'animate-spin' : ''} />
                        {recomputing ? 'Recomputing...' : 'Recompute Gaps'}
                    </button>
                    <div className={`status-badge big ${getStatusClass(summary.overall_status)}`}>
                        {summary.overall_status === 'GREEN' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        Overall Health: {summary.overall_status}
                    </div>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stats-card">
                    <div>
                        <p className="stats-title">Contracts Red</p>
                        <p className="stats-value">{summary.red_contracts}</p>
                    </div>
                    <FileText className="muted" size={24} />
                </div>
                <div className="stats-card">
                    <div>
                        <p className="stats-title">Works Red</p>
                        <p className="stats-value">{summary.red_works}</p>
                    </div>
                    <ShieldCheck className="muted" size={24} />
                </div>
                <div className="stats-card">
                    <div>
                        <p className="stats-title">Total Active</p>
                        <p className="stats-value">{contracts.length + works.length}</p>
                    </div>
                    <Clock className="muted" size={24} />
                </div>
            </div>

            <div className="panel filters-row">
                <div className="filter-group">
                    <Filter size={16} />
                    <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                        <option value="All">All Statuses</option>
                        <option value="RED">RED (Action Required)</option>
                        <option value="AMBER">AMBER (Warning)</option>
                        <option value="GREEN">GREEN (Compliance)</option>
                    </select>
                    <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
                        <option value="All">All Types</option>
                        <option value="contract">Contracts</option>
                        <option value="work">Works</option>
                    </select>
                </div>
                <button className="ghost-btn" onClick={() => alert('PDF Report Export stub.')}>
                    <Download size={14} /> Download Report
                </button>
            </div>

            <div className="grid-2">
                <div className="panel padded">
                    <h3 className="section-title">Critical Attention (RED)</h3>
                    <div className="alerts-list">
                        {(alerts.missing_signed_pdf || []).map((item, i) => (
                            <div key={`pdf-${i}`} className="alert-item red" onClick={() => navigate(`/admin-of-works/contracts/${item.id}`)}>
                                <AlertTriangle size={16} />
                                <div>
                                    <p className="strong">{item.title}</p>
                                    <p className="small">Missing signed PDF document</p>
                                </div>
                                <ChevronRight size={16} className="ml-auto" />
                            </div>
                        ))}
                        {(alerts.missing_registration_proof || []).map((item, i) => (
                            <div key={`proof-${i}`} className="alert-item red" onClick={() => navigate(`/admin-of-works/works/${item.work_id}`)}>
                                <AlertTriangle size={16} />
                                <div>
                                    <p className="strong">{item.title}</p>
                                    <p className="small">Missing registration proof</p>
                                </div>
                                <ChevronRight size={16} className="ml-auto" />
                            </div>
                        ))}
                        {(!alerts.missing_signed_pdf?.length && !alerts.missing_registration_proof?.length) && (
                            <p className="placeholder">No critical alerts found.</p>
                        )}
                    </div>
                </div>

                <div className="panel padded">
                    <h3 className="section-title">Aggregated View</h3>
                    <div className="scroll-panel" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table className="contracts-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Item</th>
                                    <th>Type</th>
                                    <th>Reasons</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data.aggregated || [...contracts, ...works]).map((item, i) => (
                                    <tr
                                        key={i}
                                        onClick={() => {
                                            const path =
                                                item.type === 'contract' ? `/admin-of-works/contracts/${item.id}` :
                                                    item.type === 'work' ? `/admin-of-works/works/${item.work_id || item.id}` :
                                                        item.type === 'artist' ? `/catalog/artists/${item.id}` :
                                                            item.type === 'release' ? `/catalog/releases/${item.id}` :
                                                                '#';
                                            if (path !== '#') navigate(path);
                                        }}
                                        className="clickable"
                                    >
                                        <td>
                                            <span className={`status-badge ${getStatusClass(item.status_quo.status)}`}>
                                                {item.status_quo.status}
                                            </span>
                                        </td>
                                        <td className="strong">{item.title}</td>
                                        <td className="text-xs uppercase font-bold text-primary">{item.type}</td>
                                        <td>
                                            <div className="reasons-list">
                                                {item.status_quo.reasons.map((r, ri) => (
                                                    <div key={ri} className="small muted">• {r}</div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatusQuoDashboard;
