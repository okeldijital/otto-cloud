import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import api from '../../lib/api';
import { RefreshCw, BarChart3, PieChart as PieChartIcon, TrendingUp, AlertCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const ReportVisualizer = ({ runId, reportType }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/office/reports/runs/${runId}/data`);
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch report data', err);
                setError('Failed to load visualization data.');
            } finally {
                setLoading(false);
            }
        };

        if (runId) fetchData();
    }, [runId]);

    if (loading) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center text-text-secondary gap-3">
                <RefreshCw size={32} className="animate-spin opacity-20" />
                <span className="text-sm font-medium">Preparing visualization...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center text-danger gap-2">
                <AlertCircle size={32} />
                <span className="text-sm font-bold">{error}</span>
            </div>
        );
    }

    if (!data || !data.rows || data.rows.length === 0) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center text-text-secondary opacity-40">
                <BarChart3 size={48} className="mb-2" />
                <span className="text-sm">No data available for visualization</span>
            </div>
        );
    }

    // Process data based on report type
    const renderChart = () => {
        if (reportType === 'status_quo') {
            // Count issues by severity
            const severityCounts = data.rows.reduce((acc, row) => {
                const sev = row.Severity || 'unknown';
                acc[sev] = (acc[sev] || 0) + 1;
                return acc;
            }, {});

            const chartData = Object.entries(severityCounts).map(([name, value]) => ({ name, value }));

            return (
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChartIcon size={18} className="text-accent" />
                        <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Issues by Severity</h4>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (reportType === 'documents_coverage') {
            // Count OK vs MISSING
            const statusCounts = data.rows.reduce((acc, row) => {
                const status = row.Status || 'UNKNOWN';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

            return (
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 size={18} className="text-accent" />
                        <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Document Coverage Status</h4>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'OK' ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (reportType === 'contracts_audit') {
            const issueCounts = data.rows.reduce((acc, row) => {
                const issue = row.Issue || 'Unknown';
                acc[issue] = (acc[issue] || 0) + 1;
                return acc;
            }, {});

            const chartData = Object.entries(issueCounts).map(([name, value]) => ({ name, value }));

            return (
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <AlertCircle size={18} className="text-accent" />
                        <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Audit Findings by Type</h4>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} width={150} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (reportType === 'tasks_progress') {
            const statusCounts = data.rows.reduce((acc, row) => {
                const status = row.Status || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

            return (
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp size={18} className="text-accent" />
                        <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Task Status Distribution</h4>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} width={100} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-8 text-center text-text-secondary">
                Visualization not implemented for this report type yet.
            </div>
        );
    };

    return (
        <div className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderChart()}
        </div>
    );
};

export default ReportVisualizer;
