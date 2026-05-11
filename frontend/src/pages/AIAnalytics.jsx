import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import aiClient from '../api/aiClient';
import aiAnalyticsClient from '../api/aiAnalyticsClient';

const AIAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [error, setError] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [overview, setOverview] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [catalog, setCatalog] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const health = await aiClient.health();
            const enabled = health?.enabled === true;
            setAiEnabled(enabled);
            if (!enabled) {
                setOverview(null);
                setContracts([]);
                setCatalog([]);
                return;
            }

            const params = {};
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;

            const [overviewData, contractsData, catalogData] = await Promise.all([
                aiAnalyticsClient.getOverview(params),
                aiAnalyticsClient.getContracts({ ...params, limit: 50 }),
                aiAnalyticsClient.getCatalog(params),
            ]);

            setOverview(overviewData);
            setContracts(contractsData?.contracts || []);
            setCatalog(catalogData?.catalog || []);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to load AI analytics.');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <BarChart3 size={32} className="text-accent" />
                        AI Analytics
                    </h1>
                    <p className="mt-2 text-text-secondary text-sm font-medium">
                        Governed analytics for AI extraction and resolution flow.
                    </p>
                </div>

                <div className="flex items-end gap-3 p-2 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">
                    <div className="space-y-1 px-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">From</label>
                        <input 
                            type="date" 
                            value={fromDate} 
                            onChange={(e) => setFromDate(e.target.value)} 
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accent/40 transition-all"
                        />
                    </div>
                    <div className="space-y-1 px-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">To</label>
                        <input 
                            type="date" 
                            value={toDate} 
                            onChange={(e) => setToDate(e.target.value)} 
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accent/40 transition-all"
                        />
                    </div>
                    <button
                        onClick={load}
                        className="p-2.5 bg-accent text-[#0f1115] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="bg-premium-glass border border-white/5 rounded-[24px] p-12 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Synthesizing Intelligence...</p>
                </div>
            ) : error ? (
                <div className="p-6 bg-danger/10 border border-danger/20 rounded-[24px] flex items-center gap-4 text-danger">
                    <AlertTriangle size={24} />
                    <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
                </div>
            ) : !aiEnabled ? (
                <div className="bg-premium-glass border border-white/5 rounded-[24px] p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <RefreshCw size={32} className="text-text-secondary opacity-20" />
                    </div>
                    <p className="text-xs font-black text-text-secondary uppercase tracking-widest">AI disabled / analytics unavailable.</p>
                </div>
            ) : (
                <>
                    <section className="space-y-4">
                        <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                            Executive Summary
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Contracts Processed', value: overview?.contracts_processed_count ?? 0, icon: FileText },
                                { label: 'Resolution Runs', value: overview?.resolution_runs_count ?? 0, icon: RefreshCw },
                                { label: 'Links Persisted', value: overview?.links_persisted_count ?? 0, icon: CheckCircle },
                                { label: 'Unresolved Delta', value: overview?.unresolved_count ?? 0, icon: AlertTriangle, danger: (overview?.unresolved_count > 0) }
                            ].map((kpi, i) => (
                                <div key={i} className="bg-premium-glass border border-white/5 p-6 rounded-[24px] shadow-glass relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 group-hover:text-white transition-colors">{kpi.label}</div>
                                        <div className={`text-2xl font-black ${kpi.danger ? 'text-danger' : 'text-white'}`}>{kpi.value}</div>
                                    </div>
                                    <kpi.icon size={48} className="absolute -right-2 -bottom-2 text-white/[0.03] group-hover:text-accent/10 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <section className="space-y-4">
                            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                                Contract Intelligence Runs
                            </h2>
                            <div className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden shadow-glass">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-white/[0.02]">
                                            <tr>
                                                <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Run ID</th>
                                                <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Created</th>
                                                <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Links</th>
                                                <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Review</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {contracts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-xs font-bold text-text-secondary uppercase tracking-widest italic">No runs available</td>
                                                </tr>
                                            ) : (
                                                contracts.map((row) => (
                                                    <tr key={row.run_id} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="p-4 text-xs font-mono font-bold text-white">#{row.run_id}</td>
                                                        <td className="p-4 text-xs font-medium text-text-secondary">{row.created_at || '-'}</td>
                                                        <td className="p-4 text-xs font-bold text-accent">{row.links_count}</td>
                                                        <td className="p-4">
                                                            <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                                                                row.needs_review ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'
                                                            }`}>
                                                                {row.needs_review ? 'REQUIRED' : 'PASSED'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                                Catalog Distribution
                            </h2>
                            <div className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden shadow-glass">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-white/[0.02]">
                                            <tr>
                                                <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Entity Type</th>
                                                <th className="text-right text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Registry Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {catalog.length === 0 ? (
                                                <tr>
                                                    <td colSpan={2} className="p-8 text-center text-xs font-bold text-text-secondary uppercase tracking-widest italic">Registry empty</td>
                                                </tr>
                                            ) : (
                                                catalog.map((item) => (
                                                    <tr key={item.entity_type} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="p-4 text-xs font-black text-white uppercase tracking-tighter">{item.entity_type}</td>
                                                        <td className="p-4 text-right text-sm font-black text-accent">{item.count.toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </div>
                </>
            )}
        </div>
    );
};

export default AIAnalytics;
