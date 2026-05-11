import React, { useState, useEffect } from 'react';
import {
    FileText, BarChart3, Play, Eye, Download, Share2, CheckCircle2, Clock, 
    AlertCircle, FileSearch, ListTodo, Calendar, ShieldCheck, RefreshCw, 
    Plus, Save, Trash2, ChevronRight, LayoutDashboard, Settings2, X
} from 'lucide-react';
import api, { BASE_URL } from '../../lib/api';
import { isTauriEnv, downloadFile } from '../../lib/tauri';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ReportVisualizer from '../../components/office/ReportVisualizer';

const REPORT_ICONS = {
    status_quo: ShieldCheck,
    documents_coverage: FileSearch,
    tasks_progress: ListTodo,
    events_timeline: Calendar,
    contracts_audit: AlertCircle
};

const Reports = () => {
    const [runs, setRuns] = useState([]);
    const [definitions, setDefinitions] = useState([]);
    const [isLoadingRuns, setIsLoadingRuns] = useState(false);
    const [isLoadingDefs, setIsLoadingDefs] = useState(false);
    const [isRunning, setIsRunning] = useState(null);
    const [selectedRun, setSelectedRun] = useState(null);
    const [view, setView] = useState('overview'); // 'overview' or 'definitions'

    const reports = [
        { id: 'status_quo', title: 'Status Quo Report', description: 'Deterministic audit of data gaps between contracts, works, and registrations.' },
        { id: 'documents_coverage', title: 'Documents Coverage', description: 'Analysis of entity-to-document ratios spotlighting missing assets.' },
        { id: 'tasks_progress', title: 'Tasks Progress', description: 'Snapshot of operational throughput and blocked items.' },
        { id: 'events_timeline', title: 'Events Timeline', description: '30-day outlook of upcoming releases and major deadlines.' },
        { id: 'contracts_audit', title: 'Contracts Audit', description: 'Detailed analysis of missing contract files, unlinked releases, and orphaned contracts.' }
    ];

    const fetchData = async () => {
        setIsLoadingRuns(true);
        setIsLoadingDefs(true);
        try {
            const [runsRes, defsRes] = await Promise.all([
                api.get('/office/reports/runs'),
                api.get('/office/reports/definitions')
            ]);
            setRuns(runsRes.data);
            setDefinitions(defsRes.data);
        } catch (error) {
            console.error('Failed to fetch reports data', error);
        } finally {
            setIsLoadingRuns(false);
            setIsLoadingDefs(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRun = async (reportType, definitionId = null) => {
        setIsRunning(reportType);
        try {
            let res;
            if (definitionId) {
                res = await api.post(`/office/reports/definitions/${definitionId}/run`);
            } else {
                res = await api.post('/office/reports/run', { report_type: reportType, parameters: {} });
            }
            await fetchData();
            // Automatically select the new run for visualization
            if (res.data && res.data.id) {
                setSelectedRun(res.data);
            }
        } catch (error) {
            alert('Report run failed');
        } finally {
            setIsRunning(null);
        }
    };

    const handleDownload = async (run) => {
        if (isTauriEnv()) {
            try {
                // Point to the new consolidated export endpoint
                await downloadFile(`/office/reports/runs/${run.id}/export`, `report_${run.id}.xlsx`);
            } catch (error) {
                console.error('Download failed', error);
            }
            return;
        }

        try {
            const response = await api.get(`/office/reports/runs/${run.id}/export`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${run.id}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Export failed. Please try downloading individual artifacts.');
        }
    };

    const handleShare = async (runId) => {
        try {
            const res = await api.post(`/office/reports/runs/${runId}/share`);
            alert(`Report shared as document. ID: ${res.data.document_id}`);
        } catch (error) {
            alert('Sharing failed');
        }
    };

    const handleDeleteDefinition = async (id) => {
        if (!window.confirm('Delete this report template?')) return;
        try {
            await api.delete(`/office/reports/definitions/${id}`);
            setDefinitions(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            alert('Failed to delete template');
        }
    };

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newDef, setNewDef] = useState({ name: '', description: '', report_type: 'status_quo' });

    const handleCreateDefinition = async (e) => {
        e.preventDefault();
        try {
            await api.post('/office/reports/definitions', { ...newDef, config: {} });
            setIsCreateModalOpen(false);
            setNewDef({ name: '', description: '', report_type: 'status_quo' });
            fetchData();
        } catch (err) {
            alert('Failed to create template');
        }
    };

    return (
        <div className="flex flex-col gap-xl p-xl max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Modal for creating new template */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-xl bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface border border-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-xl py-lg border-b border-border bg-surface-elevated/20 flex justify-between items-center">
                            <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                                <Plus size={16} className="text-accent" />
                                Create Template
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-text-secondary hover:text-text-primary"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateDefinition} className="p-xl flex flex-col gap-lg">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Template Name</label>
                                <input 
                                    required
                                    type="text" 
                                    className="bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                                    placeholder="e.g. Monthly Compliance Audit"
                                    value={newDef.name}
                                    onChange={e => setNewDef({...newDef, name: e.target.value})}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Description</label>
                                <textarea 
                                    className="bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 transition-colors min-h-[100px]"
                                    placeholder="Purpose of this report..."
                                    value={newDef.description}
                                    onChange={e => setNewDef({...newDef, description: e.target.value})}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Report Engine</label>
                                <select 
                                    className="bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 transition-colors appearance-none"
                                    value={newDef.report_type}
                                    onChange={e => setNewDef({...newDef, report_type: e.target.value})}
                                >
                                    {reports.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                </select>
                            </div>
                            <div className="pt-lg flex gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" variant="primary" className="flex-1">Create Template</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
                <PageHeader
                    title="Office Intelligence"
                    subtitle="Deterministic reporting and operational analysis."
                />
                <div className="flex bg-surface-elevated/50 p-1 rounded-xl border border-border">
                    <button 
                        onClick={() => setView('overview')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'overview' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        <LayoutDashboard size={14} /> Overview
                    </button>
                    <button 
                        onClick={() => setView('definitions')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'definitions' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        <Settings2 size={14} /> Templates ({definitions.length})
                    </button>
                </div>
            </div>

            {view === 'overview' ? (
                <>
                    {/* Report Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
                        {reports.map((report) => {
                            const Icon = REPORT_ICONS[report.id] || FileText;
                            const lastRun = runs.find(r => {
                                const type = r.parameters?.report_type;
                                return type === report.id;
                            });
                            
                            return (
                                <div key={report.id} className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden flex flex-col group hover:border-accent/40 transition-all hover:shadow-glow shadow-sm backdrop-blur-md">
                                    <div className="p-xl flex flex-col flex-1">
                                        <div className="flex justify-between items-start mb-lg">
                                            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                                <Icon size={24} />
                                            </div>
                                            {lastRun && (
                                                <div className="flex flex-col items-end">
                                                    <Badge variant={lastRun.status === 'done' ? 'success' : 'danger'} size="xs">
                                                        {lastRun.status === 'done' ? 'Ready' : 'Failed'}
                                                    </Badge>
                                                    <span className="text-[9px] text-text-secondary mt-1 opacity-50">
                                                        {new Date(lastRun.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-text-primary mb-2 tracking-tight">{report.title}</h3>
                                        <p className="text-text-secondary text-sm leading-relaxed opacity-70 flex-1">{report.description}</p>
                                    </div>
                                    <div className="p-md bg-white/[0.02] border-t border-white/5 flex gap-2">
                                        {lastRun && lastRun.status === 'done' && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="flex-1 text-xs"
                                                onClick={() => setSelectedRun(lastRun)}
                                            >
                                                <Eye size={14} /> View
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRun(report.id)}
                                            loading={isRunning === report.id}
                                            className={`${lastRun ? 'flex-1' : 'w-full'} text-accent font-bold gap-2`}
                                        >
                                            <Play size={14} fill="currentColor" /> Run
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
                        {/* Recent Runs Table */}
                        <div className="lg:col-span-2 bg-premium-glass border border-white/5 rounded-[24px] shadow-glass overflow-hidden backdrop-blur-xl">
                            <div className="px-xl py-lg border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                                <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                                    <Clock size={16} className="text-accent" />
                                    Operational History
                                </h2>
                                <button className="p-2 hover:bg-black/5 rounded-lg transition-colors text-text-secondary" onClick={fetchData}>
                                    <RefreshCw size={14} className={isLoadingRuns ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[10px] text-text-secondary uppercase tracking-widest font-bold bg-white/[0.02]">
                                            <th className="px-xl py-4">Status</th>
                                            <th className="px-xl py-4">Type</th>
                                            <th className="px-xl py-4">Generated</th>
                                            <th className="px-xl py-4">Rows</th>
                                            <th className="px-xl py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {runs.length === 0 && !isLoadingRuns ? (
                                            <tr>
                                                <td colSpan="5" className="px-xl py-12 text-center text-text-secondary italic text-sm">
                                                    No recent activity found.
                                                </td>
                                            </tr>
                                        ) : (
                                            runs.slice(0, 10).map((run) => (
                                                <tr 
                                                    key={run.id} 
                                                    className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${selectedRun?.id === run.id ? 'bg-accent/10 border-l-2 border-l-accent' : ''}`}
                                                    onClick={() => setSelectedRun(run)}
                                                >
                                                    <td className="px-xl py-4">
                                                        {run.status === 'done' ? (
                                                            <Badge variant="success">Ready</Badge>
                                                        ) : run.status === 'failed' ? (
                                                            <Badge variant="danger">Failed</Badge>
                                                        ) : (
                                                            <Badge variant="info" className="animate-pulse">Active</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-xl py-4">
                                                        <div className="font-bold text-sm text-white capitalize">
                                                            {(run.parameters?.report_type || 'Status Quo').replace('_', ' ')}
                                                        </div>
                                                        <div className="text-[10px] text-text-secondary font-mono opacity-50">#{run.id}</div>
                                                    </td>
                                                    <td className="px-xl py-4 text-xs text-text-secondary">
                                                        {new Date(run.created_at).toLocaleDateString()} at {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-xl py-4">
                                                        <div className="text-xs font-mono bg-surface-elevated px-2 py-0.5 rounded w-fit border border-border">
                                                            {run.row_count || 0}
                                                        </div>
                                                    </td>
                                                    <td className="px-xl py-4">
                                                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                            <button className="p-2 hover:text-accent transition-colors" onClick={() => handleDownload(run)} title="Download XLSX">
                                                                <Download size={16} />
                                                            </button>
                                                            <button className="p-2 hover:text-accent transition-colors" onClick={() => handleShare(run.id)} title="Archive">
                                                                <Share2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Visualization Sidebar */}
                        <div className="bg-premium-glass border border-white/5 rounded-[24px] shadow-glass flex flex-col min-h-[400px] backdrop-blur-xl">
                            <div className="px-xl py-lg border-b border-white/5 bg-white/[0.02]">
                                <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                                    <BarChart3 size={16} className="text-accent" />
                                    Live Insight
                                </h2>
                            </div>
                            <div className="p-xl flex-1 flex flex-col justify-center">
                                {selectedRun && selectedRun.status === 'done' ? (
                                    <ReportVisualizer 
                                        runId={selectedRun.id} 
                                        reportType={selectedRun.parameters?.report_type || 'status_quo'} 
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center text-text-secondary opacity-40 py-xl">
                                        <Eye size={48} className="mb-4" />
                                        <p className="text-sm">Select a successful run<br/>to view visual breakdown.</p>
                                    </div>
                                )}
                            </div>
                            {selectedRun && (
                                <div className="p-md bg-white/[0.02] border-t border-white/5 flex justify-between items-center px-xl">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Run ID: {selectedRun.id}</span>
                                    <Button variant="ghost" size="xs" onClick={() => setSelectedRun(null)} className="text-danger"><X size={12} /></Button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* Templates / Definitions View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                    {definitions.map((def) => (
                        <div key={def.id} className="bg-premium-glass border border-white/5 rounded-[24px] p-xl flex flex-col group hover:border-accent/40 transition-all shadow-sm hover:shadow-glow backdrop-blur-md">
                            <div className="flex justify-between items-start mb-lg">
                                <div className="w-10 h-10 bg-accent/5 text-accent rounded-lg flex items-center justify-center">
                                    <FileText size={20} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        className="p-2 hover:bg-danger/10 hover:text-danger rounded-lg transition-colors text-text-secondary"
                                        onClick={() => handleDeleteDefinition(def.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-text-primary mb-2">{def.name}</h3>
                            <p className="text-text-secondary text-xs mb-xl flex-1">{def.description || 'No description provided.'}</p>
                            
                            <div className="pt-xl border-t border-white/5 mt-auto flex justify-between items-center">
                                <Badge variant="gray" className="text-[10px] uppercase font-bold">{def.report_type.replace('_', ' ')}</Badge>
                                <Button 
                                    variant="primary" 
                                    size="sm" 
                                    onClick={() => handleRun(def.report_type, def.id)}
                                    loading={isRunning === def.report_type}
                                >
                                    Run Template
                                </Button>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-white/[0.02] border-2 border-dashed border-white/10 rounded-[24px] p-xl flex flex-col items-center justify-center gap-4 group hover:border-accent/50 hover:bg-white/[0.05] transition-all min-h-[220px]"
                    >
                        <div className="w-12 h-12 bg-surface border border-border rounded-full flex items-center justify-center text-text-secondary group-hover:bg-accent/10 group-hover:text-accent group-hover:border-accent/30 transition-all">
                            <Plus size={24} />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-bold text-text-primary">New Template</div>
                            <div className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Custom Configuration</div>
                        </div>
                    </button>
                </div>
            )}

            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-xl flex gap-xl items-start">
                <div className="w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-1">Governance Integrity Protocol</h4>
                    <p className="text-xs text-text-secondary leading-relaxed opacity-70">
                        All intelligence outputs are generated using deterministic logic engines. 
                        Direct LLM inference on raw data is disabled for this module to ensure 100% data fidelity and regulatory compliance.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Reports;
