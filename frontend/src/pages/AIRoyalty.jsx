import React, { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { CatalogService } from '../services/catalog';
import aiRoyaltyClient from '../api/aiRoyaltyClient';

const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const inputStyle = {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.55rem 0.65rem',
    background: '#fff',
};

const AIRoyalty = () => {
    const [loading, setLoading] = useState(false);
    const [bootLoading, setBootLoading] = useState(true);
    const [error, setError] = useState('');

    const [releases, setReleases] = useState([]);
    const [releaseSearch, setReleaseSearch] = useState('');
    const [releaseId, setReleaseId] = useState('');
    const [contractDocumentId, setContractDocumentId] = useState('');
    const [useLatestAttached, setUseLatestAttached] = useState(true);
    const [grossRevenue, setGrossRevenue] = useState('');
    const [units, setUnits] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [persistEnabled, setPersistEnabled] = useState(true);
    const [persistResult, setPersistResult] = useState(true);
    const [response, setResponse] = useState(null);

    useEffect(() => {
        const load = async () => {
            setBootLoading(true);
            setError('');
            try {
                const [health, releaseRows] = await Promise.all([
                    aiRoyaltyClient.getHealth(),
                    CatalogService.getAll('releases', { limit: 2000 }),
                ]);
                const rows = Array.isArray(releaseRows) ? releaseRows : [];
                setReleases(rows);
                const canPersist = !!health?.enabled_flags?.AI_ROYALTY_PERSIST_ENABLED;
                setPersistEnabled(canPersist);
                setPersistResult(canPersist);
            } catch (loadError) {
                setError(loadError?.response?.data?.detail || 'Failed to load AI royalty page.');
            } finally {
                setBootLoading(false);
            }
        };
        load();
    }, []);

    const filteredReleases = useMemo(() => {
        const term = releaseSearch.trim().toLowerCase();
        if (!term) return releases;
        return releases.filter((row) => `${row.id} ${row.title || ''}`.toLowerCase().includes(term));
    }, [releases, releaseSearch]);

    const selectedRelease = useMemo(
        () => releases.find((row) => String(row.id) === String(releaseId)),
        [releases, releaseId]
    );

    const onSimulate = async () => {
        if (!releaseId) {
            setError('Select a release to run simulation.');
            return;
        }
        setLoading(true);
        setError('');
        setResponse(null);
        try {
            const payload = {
                release_id: Number(releaseId),
                mode: 'simulate',
                assume_missing_parties_as_unknown: true,
                persist_result: !!persistResult,
            };
            if (!useLatestAttached && contractDocumentId) {
                payload.contract_document_id = Number(contractDocumentId);
            }
            if (grossRevenue !== '') payload.gross_revenue = Number(grossRevenue);
            if (units !== '') payload.units = Number(units);
            if (periodStart) payload.period_start = periodStart;
            if (periodEnd) payload.period_end = periodEnd;

            const sim = await aiRoyaltyClient.simulate(payload);
            if (sim?.featureDisabled) {
                setError('AI royalty simulation is disabled.');
                return;
            }
            setResponse(sim);
        } catch (runError) {
            setError(runError?.response?.data?.detail || runError?.message || 'Simulation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '1200px', display: 'grid', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Calculator size={24} />
                        AI Royalties
                    </h1>
                    <p style={{ margin: '0.35rem 0 0', color: '#6b7280' }}>
                        Deterministic royalty simulation for release-linked AI contract intelligence.
                    </p>
                </div>

                <div style={{ ...cardStyle, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                    Does not modify Catalog/Network/Contracts data.
                </div>

                {bootLoading && <div style={cardStyle}>Loading...</div>}
                {!bootLoading && (
                    <div style={cardStyle}>
                        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem' }}>Release search</label>
                                <input value={releaseSearch} onChange={(e) => setReleaseSearch(e.target.value)} style={inputStyle} placeholder="Search by id/title" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem' }}>Release</label>
                                <select value={releaseId} onChange={(e) => setReleaseId(e.target.value)} style={inputStyle}>
                                    <option value="">Select release</option>
                                    {filteredReleases.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            #{row.id} {row.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem' }}>Gross revenue</label>
                                <input value={grossRevenue} onChange={(e) => setGrossRevenue(e.target.value)} style={inputStyle} type="number" min="0" step="0.01" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem' }}>Units</label>
                                <input value={units} onChange={(e) => setUnits(e.target.value)} style={inputStyle} type="number" min="0" step="1" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem' }}>Period start</label>
                                <input value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={inputStyle} type="date" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem' }}>Period end</label>
                                <input value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inputStyle} type="date" />
                            </div>
                        </div>

                        <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.55rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" checked={useLatestAttached} onChange={(e) => setUseLatestAttached(e.target.checked)} />
                                Use latest attached contract document
                            </label>
                            {!useLatestAttached && (
                                <div style={{ maxWidth: '360px' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.3rem' }}>contract_document_id (optional)</label>
                                    <input
                                        value={contractDocumentId}
                                        onChange={(e) => setContractDocumentId(e.target.value)}
                                        style={inputStyle}
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="e.g. 123"
                                    />
                                </div>
                            )}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={persistResult}
                                    disabled={!persistEnabled}
                                    onChange={(e) => setPersistResult(e.target.checked)}
                                />
                                Persist result {!persistEnabled ? '(disabled by backend flag)' : ''}
                            </label>
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <button className="btn-primary" disabled={loading || !releaseId} onClick={onSimulate}>
                                {loading ? 'Simulating...' : 'Simulate'}
                            </button>
                        </div>
                    </div>
                )}

                {error && <div style={{ ...cardStyle, color: '#b91c1c', background: '#fef2f2', borderColor: '#fecaca' }}>{error}</div>}

                {response && (
                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>Results</h3>
                        <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                            release_id: {response.release_id}
                            {selectedRelease ? ` (${selectedRelease.title})` : ''}
                            {' | '}
                            org_id: {response.org_id}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.45rem' }}>Party</th>
                                        <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.45rem' }}>%</th>
                                        <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.45rem' }}>Amount</th>
                                        <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.45rem' }}>Rationale</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(response.results || []).length === 0 && (
                                        <tr>
                                            <td style={{ padding: '0.55rem', color: '#64748b' }} colSpan={4}>No computed split results.</td>
                                        </tr>
                                    )}
                                    {(response.results || []).map((row, idx) => (
                                        <tr key={`${row.party_display_name}-${idx}`}>
                                            <td style={{ padding: '0.55rem', borderBottom: '1px solid #f1f5f9' }}>{row.party_display_name}</td>
                                            <td style={{ padding: '0.55rem', borderBottom: '1px solid #f1f5f9' }}>{row.percent}</td>
                                            <td style={{ padding: '0.55rem', borderBottom: '1px solid #f1f5f9' }}>{row.amount == null ? '-' : row.amount}</td>
                                            <td style={{ padding: '0.55rem', borderBottom: '1px solid #f1f5f9' }}>{row.rationale || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: '0.85rem', display: 'grid', gap: '0.35rem', color: '#334155' }}>
                            <div>splits_total: {response.splits_total}</div>
                            <div>integrity.total_equals_100: {String(response?.integrity?.total_equals_100)}</div>
                            <div>integrity.over_allocated: {String(response?.integrity?.over_allocated)}</div>
                            <div>integrity.under_allocated: {String(response?.integrity?.under_allocated)}</div>
                            <div>persisted: {String(response.persisted)} | run_id: {response.run_id || '-'}</div>
                            <div>idempotent_hit: {String(response.idempotent_hit)}</div>
                        </div>

                        {(response.warnings || []).length > 0 && (
                            <div style={{ marginTop: '0.8rem', padding: '0.7rem 0.8rem', borderRadius: '10px', background: '#fff7ed', color: '#9a3412' }}>
                                <strong>Warnings</strong>
                                <ul style={{ margin: '0.45rem 0 0 1rem' }}>
                                    {(response.warnings || []).map((w, idx) => <li key={`w-${idx}`}>{w}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIRoyalty;
