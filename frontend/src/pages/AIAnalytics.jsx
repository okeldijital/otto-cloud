import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import aiClient from '../api/aiClient';
import aiAnalyticsClient from '../api/aiAnalyticsClient';

const cardStyle = {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

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
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '1200px', display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart3 size={24} />
                            AI Analytics
                        </h1>
                        <p style={{ margin: '0.35rem 0 0 0', color: '#6b7280' }}>
                            Governed analytics for AI extraction and resolution flow.
                        </p>
                    </div>
                </div>

                <div style={{ ...cardStyle, display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>From</label>
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>To</label>
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                    <button
                        onClick={load}
                        style={{
                            border: '1px solid #d1d5db',
                            background: 'white',
                            borderRadius: '8px',
                            padding: '0.55rem 0.85rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                {loading && <div style={cardStyle}>Loading analytics...</div>}
                {!loading && error && <div style={cardStyle}>Error: {error}</div>}
                {!loading && !error && !aiEnabled && <div style={cardStyle}>AI disabled / analytics unavailable.</div>}

                {!loading && !error && aiEnabled && (
                    <>
                        <section style={{ display: 'grid', gap: '0.75rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Overview (KPIs)</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                <div style={cardStyle}>
                                    <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>Contracts Processed</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.35rem' }}>{overview?.contracts_processed_count ?? 0}</div>
                                </div>
                                <div style={cardStyle}>
                                    <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>Resolution Runs</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.35rem' }}>{overview?.resolution_runs_count ?? 0}</div>
                                </div>
                                <div style={cardStyle}>
                                    <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>Links Persisted</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.35rem' }}>{overview?.links_persisted_count ?? 0}</div>
                                </div>
                                <div style={cardStyle}>
                                    <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>Unresolved</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.35rem' }}>{overview?.unresolved_count ?? 0}</div>
                                </div>
                            </div>
                        </section>

                        <section style={{ display: 'grid', gap: '0.75rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Contracts Analytics</h2>
                            <div style={{ ...cardStyle, overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Run ID</th>
                                            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Created</th>
                                            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Links</th>
                                            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Needs Review</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contracts.length === 0 && (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '0.7rem', color: '#6b7280' }}>No runs available.</td>
                                            </tr>
                                        )}
                                        {contracts.map((row) => (
                                            <tr key={row.run_id}>
                                                <td style={{ padding: '0.55rem', borderBottom: '1px solid #f3f4f6' }}>{row.run_id}</td>
                                                <td style={{ padding: '0.55rem', borderBottom: '1px solid #f3f4f6' }}>{row.created_at || '-'}</td>
                                                <td style={{ padding: '0.55rem', borderBottom: '1px solid #f3f4f6' }}>{row.links_count}</td>
                                                <td style={{ padding: '0.55rem', borderBottom: '1px solid #f3f4f6' }}>{row.needs_review ? 'Yes' : 'No'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section style={{ display: 'grid', gap: '0.75rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Catalog Analytics</h2>
                            <div style={{ ...cardStyle, overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Entity Type</th>
                                            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {catalog.length === 0 && (
                                            <tr>
                                                <td colSpan={2} style={{ padding: '0.7rem', color: '#6b7280' }}>No catalog analytics available.</td>
                                            </tr>
                                        )}
                                        {catalog.map((item) => (
                                            <tr key={item.entity_type}>
                                                <td style={{ padding: '0.55rem', borderBottom: '1px solid #f3f4f6' }}>{item.entity_type}</td>
                                                <td style={{ padding: '0.55rem', borderBottom: '1px solid #f3f4f6' }}>{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default AIAnalytics;
