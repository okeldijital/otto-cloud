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
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

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

    if (loading && !data) return <div className="p-8 text-center text-text-secondary animate-pulse">Loading status quo insight…</div>;
    if (error) return <div className="p-8"><div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl">{error}</div></div>;

    const { summary, alerts, contracts, works } = data;

    const getStatusVariant = (status) => {
        const s = status?.toUpperCase();
        if (s === 'GREEN') return 'success';
        if (s === 'AMBER') return 'warning';
        if (s === 'RED') return 'danger';
        return 'neutral';
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-premium-glass border border-white/5 rounded-[32px] p-8 mb-8 flex flex-col gap-6 shadow-glass backdrop-blur-2xl">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <p className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-2">Administration ▸ Status Quo</p>
                        <h1 className="text-4xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-tight mb-2">Status Quo Dashboard</h1>
                        <p className="text-text-secondary">Live monitoring of legal compliance and registration health.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <Button
                            variant="primary"
                            onClick={handleRecompute}
                            disabled={recomputing}
                            className={recomputing ? 'opacity-70 cursor-not-allowed' : ''}
                        >
                            <RefreshCw size={16} className={`mr-2 ${recomputing ? 'animate-spin' : ''}`} />
                            {recomputing ? 'Recomputing...' : 'Recompute Gaps'}
                        </Button>
                        <Badge variant={getStatusVariant(summary.overall_status)} size="lg" className="px-4 py-2 text-sm font-bold">
                            {summary.overall_status === 'GREEN' ? <CheckCircle size={18} className="mr-2" /> : <AlertTriangle size={18} className="mr-2" />}
                            Overall Health: {summary.overall_status}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Contracts Red</p>
                            <p className="text-4xl font-black text-danger drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">{summary.red_contracts}</p>
                        </div>
                        <div className="p-3 bg-danger/10 text-danger rounded-xl border border-danger/20">
                            <FileText size={24} />
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Works Red</p>
                            <p className="text-4xl font-black text-danger drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">{summary.red_works}</p>
                        </div>
                        <div className="p-3 bg-danger/10 text-danger rounded-xl border border-danger/20">
                            <ShieldCheck size={24} />
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total Active</p>
                            <p className="text-4xl font-black text-white">{contracts.length + works.length}</p>
                        </div>
                        <div className="p-3 bg-white/5 text-text-secondary rounded-xl border border-white/10">
                            <Clock size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters Row */}
            <div className="bg-premium-glass border border-white/5 rounded-2xl p-4 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-text-secondary border border-white/10">
                        <Filter size={18} />
                    </div>
                    <select 
                        value={filter.status} 
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent appearance-none font-medium"
                    >
                        <option value="All" className="bg-[#0f1115]">All Statuses</option>
                        <option value="RED" className="bg-[#0f1115]">RED (Action Required)</option>
                        <option value="AMBER" className="bg-[#0f1115]">AMBER (Warning)</option>
                        <option value="GREEN" className="bg-[#0f1115]">GREEN (Compliance)</option>
                    </select>
                    <select 
                        value={filter.type} 
                        onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                        className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent appearance-none font-medium"
                    >
                        <option value="All" className="bg-[#0f1115]">All Types</option>
                        <option value="contract" className="bg-[#0f1115]">Contracts</option>
                        <option value="work" className="bg-[#0f1115]">Works</option>
                    </select>
                </div>
                <Button variant="ghost" onClick={() => alert('PDF Report Export stub.')}>
                    <Download size={16} className="mr-2" /> Download Report
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Critical Attention */}
                <Card title="Critical Attention (RED)" noPadding className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-white/5">
                        {(alerts.missing_signed_pdf || []).map((item, i) => (
                            <div 
                                key={`pdf-${i}`} 
                                className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer flex items-center gap-4 group" 
                                onClick={() => navigate(`/admin-of-works/contracts/${item.id}`)}
                            >
                                <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0 border border-danger/20 group-hover:scale-110 transition-transform">
                                    <AlertTriangle size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold truncate">{item.title}</p>
                                    <p className="text-sm text-danger/80">Missing signed PDF document</p>
                                </div>
                                <ChevronRight size={18} className="text-text-secondary group-hover:text-white transition-colors shrink-0" />
                            </div>
                        ))}
                        {(alerts.missing_registration_proof || []).map((item, i) => (
                            <div 
                                key={`proof-${i}`} 
                                className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer flex items-center gap-4 group" 
                                onClick={() => navigate(`/admin-of-works/works/${item.work_id}`)}
                            >
                                <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0 border border-danger/20 group-hover:scale-110 transition-transform">
                                    <AlertTriangle size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold truncate">{item.title}</p>
                                    <p className="text-sm text-danger/80">Missing registration proof</p>
                                </div>
                                <ChevronRight size={18} className="text-text-secondary group-hover:text-white transition-colors shrink-0" />
                            </div>
                        ))}
                        {(!alerts.missing_signed_pdf?.length && !alerts.missing_registration_proof?.length) && (
                            <div className="p-8 text-center text-text-secondary">
                                <CheckCircle size={32} className="mx-auto mb-3 text-success/50" />
                                <p>No critical alerts found.</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Aggregated View */}
                <Card title="Aggregated View" noPadding className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto max-h-[600px]">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-[#0f1115]/90 backdrop-blur border-b border-white/5 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Status</th>
                                    <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Item</th>
                                    <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Type</th>
                                    <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Reasons</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
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
                                        className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <Badge variant={getStatusVariant(item.status_quo?.status)}>
                                                {item.status_quo?.status || 'UNKNOWN'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-white font-bold group-hover:text-accent transition-colors">{item.title}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-md uppercase tracking-widest">{item.type}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {(item.status_quo?.reasons || []).map((r, ri) => (
                                                    <div key={ri} className="text-sm text-text-secondary line-clamp-1 group-hover:line-clamp-none transition-all">• {r}</div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default StatusQuoDashboard;
