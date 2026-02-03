import React, { useState, useEffect } from 'react';
import {
    FileText,
    BarChart3,
    Play,
    Eye,
    Download,
    Share2,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileSearch,
    ListTodo,
    Calendar,
    ShieldCheck
} from 'lucide-react';
import { officeReportsService } from '../../services/officeReportsService';
import api from '../../lib/api';

const REPORT_ICONS = {
    status_quo: ShieldCheck,
    documents_coverage: FileSearch,
    tasks_progress: ListTodo,
    events_timeline: Calendar
};

const Reports = () => {
    const [runs, setRuns] = useState([]);
    const [isLoadingRuns, setIsLoadingRuns] = useState(false);
    const [isRunning, setIsRunning] = useState(null); // Report type being run

    const reports = [
        { id: 'status_quo', title: 'Status Quo Report', description: 'Deterministic audit of data gaps between contracts, works, and registrations.' },
        { id: 'documents_coverage', title: 'Documents Coverage', description: 'Analysis of entity-to-document ratios spotlighting missing assets.' },
        { id: 'tasks_progress', title: 'Tasks Progress', description: 'Snapshot of operational throughput and blocked items.' },
        { id: 'events_timeline', title: 'Events Timeline', description: '30-day outlook of upcoming releases and major deadlines.' }
    ];

    const fetchRuns = async () => {
        setIsLoadingRuns(true);
        try {
            const res = await api.get('/office/reports/runs');
            setRuns(res.data);
        } catch (error) {
            console.error('Failed to fetch runs', error);
        } finally {
            setIsLoadingRuns(false);
        }
    };

    useEffect(() => {
        fetchRuns();
    }, []);

    const handleRun = async (reportType) => {
        setIsRunning(reportType);
        try {
            await api.post('/office/reports/run', { report_type: reportType, parameters: {} });
            await fetchRuns();
        } catch (error) {
            alert('Report run failed');
        } finally {
            setIsRunning(null);
        }
    };

    const handleShare = async (runId) => {
        try {
            const res = await api.post(`/office/reports/runs/${runId}/share`);
            alert(`Report shared as document: ${res.data.url}`);
            window.open(res.data.url, '_blank');
        } catch (error) {
            alert('Sharing failed');
        }
    };

    return (
        <div className="page-container p-8">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-3xl font-bold">Office — Reports</h1>
                    <p className="text-gray-400">Generate and export operational intelligence.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {reports.map((report) => {
                    const Icon = REPORT_ICONS[report.id] || FileText;
                    return (
                        <div key={report.id} className="bg-secondary-bg border border-border rounded-xl p-6 flex flex-col hover:border-primary/50 transition-all group">
                            <div className="p-3 bg-primary/10 rounded-lg text-primary w-fit mb-4 group-hover:scale-110 transition-transform">
                                <Icon size={24} />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{report.title}</h3>
                            <p className="text-gray-400 text-sm mb-6 flex-1">{report.description}</p>
                            <button
                                className="btn-primary w-full flex items-center justify-center gap-2 py-2"
                                onClick={() => handleRun(report.id)}
                                disabled={isRunning === report.id}
                            >
                                <Play size={16} fill="currentColor" />
                                {isRunning === report.id ? 'Running...' : 'Run Report'}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="bg-secondary-bg border border-border rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                        <Clock size={18} className="text-primary" />
                        Recent Report Runs
                    </h2>
                    <button className="text-xs text-primary hover:underline" onClick={fetchRuns}>Refresh List</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Report Type</th>
                                <th className="px-6 py-4">Generated At</th>
                                <th className="px-6 py-4">Rows</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoadingRuns ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        Loading runs...
                                    </td>
                                </tr>
                            ) : runs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No recent runs. Start by clicking "Run Report" above.
                                    </td>
                                </tr>
                            ) : (
                                runs.map((run) => (
                                    <tr key={run.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            {run.status === 'done' ? (
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                                                    <CheckCircle2 size={14} /> Ready
                                                </span>
                                            ) : run.status === 'failed' ? (
                                                <span className="flex items-center gap-1.5 text-rose-400 text-sm font-medium">
                                                    <AlertCircle size={14} /> Failed
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-blue-400 text-sm font-medium">
                                                    <Clock size={14} className="animate-pulse" /> Processing
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-200 uppercase">{run.report_definition_id ? `Def #${run.report_definition_id}` : run.parameters?.report_type || 'ADHOC'}</span>
                                            <span className="block text-xs text-gray-400">Run ID: {run.id}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {new Date(run.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{run.row_count || 0} rows</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {run.status === 'done' && (
                                                    <>
                                                        <a
                                                            href={`/api/office/reports/runs/${run.id}/export.pdf`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-gray-400 hover:text-primary transition-colors"
                                                            title="Preview PDF"
                                                        >
                                                            <Eye size={18} />
                                                        </a>
                                                        <button
                                                            className="text-gray-400 hover:text-emerald-400 transition-colors"
                                                            title="Share (Store as Doc)"
                                                            onClick={() => handleShare(run.id)}
                                                        >
                                                            <Share2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex gap-4">
                    <ShieldCheck className="text-primary mt-1" size={24} />
                    <div>
                        <h4 className="font-bold text-gray-200">Governance Lock Version 1.0</h4>
                        <p className="text-sm text-gray-400 mt-1">All reports are deterministically generated based on organization-scoped database relationships. Direct PDF analysis is disabled to ensure 100% data integrity and compliance with OTTO Governance Laws.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
