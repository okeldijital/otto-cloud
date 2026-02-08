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
    ShieldCheck,
    RefreshCw
} from 'lucide-react';
import { officeReportsService } from '../../services/officeReportsService';
import api, { BASE_URL } from '../../lib/api';
import { isTauriEnv, downloadFile } from '../../lib/tauri';
import PageHeader from '../../components/ui/PageHeader';

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

    const handleDownload = async (run) => {
        if (isTauriEnv()) {
            try {
                await downloadFile(`/office/reports/runs/${run.id}/export`, `report_${run.id}.xlsx`);
            } catch (error) {
                console.error('Download failed', error);
                alert('Download failed');
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
            console.error('Download failed', error);
        }
    };

    const handleShare = async (runId) => {
        try {
            const res = await api.post(`/office/reports/runs/${runId}/share`);
            const fullUrl = `${BASE_URL}${res.data.url}`;
            alert(`Report shared as document: ${fullUrl}`);
            window.open(fullUrl, '_blank');
        } catch (error) {
            alert('Sharing failed');
        }
    };

    return (
        <div className="page-container p-8">
            <PageHeader
                title="Office — Reports"
                subtitle="Generate and export operational intelligence."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {reports.map((report) => {
                    const Icon = REPORT_ICONS[report.id] || FileText;
                    return (
                        <div key={report.id} className="panel group hover:border-primary/50 transition-all flex flex-col">
                            <div className="p-6 flex flex-col flex-1">
                                <div className="p-3 bg-primary/10 rounded-xl text-primary w-fit mb-4 group-hover:scale-110 transition-transform">
                                    <Icon size={24} />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{report.title}</h3>
                                <p className="text-muted text-sm mb-6 flex-1">{report.description}</p>
                            </div>
                            <div className="p-4 bg-surface-secondary border-t border-border mt-auto">
                                <button
                                    className="btn btn-primary btn-md w-full flex items-center justify-center gap-2"
                                    onClick={() => handleRun(report.id)}
                                    disabled={isRunning === report.id}
                                >
                                    {isRunning === report.id ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                                    {isRunning === report.id ? 'Running...' : 'Run Report'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="panel shadow-lg">
                <div className="panel-header bg-surface-secondary">
                    <h2 className="font-bold flex items-center gap-2">
                        <Clock size={18} className="text-primary" />
                        Recent Report Runs
                    </h2>
                    <button className="btn-icon btn-sm" onClick={fetchRuns} title="Refresh List">
                        <RefreshCw size={14} />
                    </button>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Report Type</th>
                                <th>Generated At</th>
                                <th>Rows</th>
                                <th className="actions-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingRuns ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-muted">
                                        <div className="flex flex-col items-center gap-2 text-sm">
                                            <RefreshCw size={24} className="animate-spin opacity-20" />
                                            Loading runs...
                                        </div>
                                    </td>
                                </tr>
                            ) : runs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-muted">
                                        No recent runs. Start by clicking "Run Report" above.
                                    </td>
                                </tr>
                            ) : (
                                runs.map((run) => (
                                    <tr key={run.id}>
                                        <td>
                                            {run.status === 'done' ? (
                                                <span className="badge badge-success">Ready</span>
                                            ) : run.status === 'failed' ? (
                                                <span className="badge badge-danger">Failed</span>
                                            ) : (
                                                <span className="badge badge-primary animate-pulse">Processing</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="font-medium text-sm">
                                                {runs.find(r => r.id === run.id)?.report_type || run.report_definition_id ? `Def #${run.report_definition_id}` : run.parameters?.report_type || 'ADHOC'}
                                            </div>
                                            <div className="text-[10px] text-muted">ID: {run.id}</div>
                                        </td>
                                        <td className="text-sm text-muted">
                                            {new Date(run.created_at).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className="badge badge-gray">{run.row_count || 0} rows</span>
                                        </td>
                                        <td className="actions-cell">
                                            {run.status === 'done' && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button className="btn-icon" onClick={() => handleDownload(run)} title="Download Excel">
                                                        <Download size={18} />
                                                    </button>
                                                    <a
                                                        href={`${BASE_URL}/office/reports/runs/${run.id}/export.pdf`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn-icon"
                                                        title="Preview PDF"
                                                    >
                                                        <Eye size={18} />
                                                    </a>
                                                    <button
                                                        className="btn-icon"
                                                        title="Share (Store as Doc)"
                                                        onClick={() => handleShare(run.id)}
                                                    >
                                                        <Share2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 panel padded border-primary/20 bg-primary/5">
                <div className="flex gap-4">
                    <ShieldCheck className="text-primary" size={24} />
                    <div>
                        <h4 className="font-bold">Governance Lock Version 1.0</h4>
                        <p className="text-sm text-muted mt-1">All reports are deterministically generated based on organization-scoped database relationships. Direct PDF analysis is disabled to ensure 100% data integrity and compliance with OTTO Governance Laws.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
