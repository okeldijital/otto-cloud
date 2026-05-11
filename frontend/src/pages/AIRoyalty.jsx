import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, CheckCircle, AlertTriangle } from 'lucide-react';
import { CatalogService } from '../services/catalog';
import aiRoyaltyClient from '../api/aiRoyaltyClient';

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
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                    <Calculator size={32} className="text-accent" />
                    AI Royalties
                </h1>
                <p className="mt-2 text-text-secondary text-sm font-medium">
                    Deterministic royalty simulation for release-linked AI contract intelligence.
                </p>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-2xl px-6 py-4 flex items-center gap-3">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>
                <p className="text-xs font-bold text-accent uppercase tracking-widest">
                    Simulation Mode Active • No persistent data modification
                </p>
            </div>

            {bootLoading ? (
                <div className="bg-premium-glass border border-white/5 rounded-[24px] p-12 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Synchronizing Registry...</p>
                </div>
            ) : (
                <div className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden backdrop-blur-xl">
                    <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                        <h2 className="text-xs font-black text-white uppercase tracking-widest">Simulation Parameters</h2>
                    </div>
                    
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Catalog Search</label>
                                <input 
                                    value={releaseSearch} 
                                    onChange={(e) => setReleaseSearch(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent/40 transition-all" 
                                    placeholder="Search by ID or Title..." 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Target Release</label>
                                <select 
                                    value={releaseId} 
                                    onChange={(e) => setReleaseId(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent/40 appearance-none"
                                >
                                    <option value="" className="bg-[#0f1115]">Select a release</option>
                                    {filteredReleases.map((row) => (
                                        <option key={row.id} value={row.id} className="bg-[#0f1115]">
                                            #{row.id} | {row.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Gross Revenue ($)</label>
                                <input 
                                    value={grossRevenue} 
                                    onChange={(e) => setGrossRevenue(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent/40" 
                                    type="number" min="0" step="0.01" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Consumption Units</label>
                                <input 
                                    value={units} 
                                    onChange={(e) => setUnits(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent/40" 
                                    type="number" min="0" step="1" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Period Start</label>
                                <input 
                                    value={periodStart} 
                                    onChange={(e) => setPeriodStart(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent/40" 
                                    type="date" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Period End</label>
                                <input 
                                    value={periodEnd} 
                                    onChange={(e) => setPeriodEnd(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent/40" 
                                    type="date" 
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-4">
                            <label className="flex items-center gap-3 group cursor-pointer">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={useLatestAttached} 
                                        onChange={(e) => setUseLatestAttached(e.target.checked)} 
                                        className="peer hidden"
                                    />
                                    <div className="w-5 h-5 border-2 border-white/10 rounded bg-white/5 peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
                                        <div className="w-2 h-2 bg-[#0f1115] rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-text-secondary group-hover:text-white transition-colors">Auto-link latest attached contract document</span>
                            </label>

                            {!useLatestAttached && (
                                <div className="max-w-xs space-y-2 animate-in slide-in-from-left-2 duration-300">
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Document Registry ID</label>
                                    <input
                                        value={contractDocumentId}
                                        onChange={(e) => setContractDocumentId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent/40"
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 123"
                                    />
                                </div>
                            )}

                            <label className="flex items-center gap-3 group cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={persistResult}
                                        disabled={!persistEnabled}
                                        onChange={(e) => setPersistResult(e.target.checked)}
                                        className="peer hidden"
                                    />
                                    <div className="w-5 h-5 border-2 border-white/10 rounded bg-white/5 peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center disabled:opacity-30">
                                        <div className="w-2 h-2 bg-[#0f1115] rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-text-secondary group-hover:text-white transition-colors">
                                    Persist simulation results to ledger {!persistEnabled && <span className="text-danger ml-2 opacity-50">(Unauthorized)</span>}
                                </span>
                            </label>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <button 
                                className="px-12 py-4 bg-accent text-[#0f1115] rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-accent/20" 
                                disabled={loading || !releaseId} 
                                onClick={onSimulate}
                            >
                                {loading ? 'Computing Intelligence...' : 'Run Simulation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-center gap-3 text-danger">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
                        <Calculator size={16} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
                </div>
            )}

            {response && (
                <div className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500 shadow-glass">
                    <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
                        <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle size={16} className="text-success" />
                            Synthesized Results
                        </h2>
                        <span className="text-[10px] font-black text-text-secondary uppercase bg-white/5 px-3 py-1 rounded-full border border-white/10">
                            RUN_ID: {response.run_id || 'LOCAL'}
                        </span>
                    </div>

                    <div className="p-6 space-y-8">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                <div className="text-[10px] font-black text-text-secondary uppercase mb-1">Target</div>
                                <div className="text-sm font-bold text-white truncate">{selectedRelease?.title || response.release_id}</div>
                            </div>
                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                <div className="text-[10px] font-black text-text-secondary uppercase mb-1">Total Splits</div>
                                <div className={`text-sm font-bold ${response.splits_total === 100 ? 'text-success' : 'text-danger'}`}>{response.splits_total}%</div>
                            </div>
                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                <div className="text-[10px] font-black text-text-secondary uppercase mb-1">Ledger State</div>
                                <div className="text-sm font-bold text-white uppercase tracking-tighter">{response.persisted ? 'Committed' : 'Volatile'}</div>
                            </div>
                            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                <div className="text-[10px] font-black text-text-secondary uppercase mb-1">Integrity</div>
                                <div className={`text-sm font-bold uppercase ${response?.integrity?.total_equals_100 ? 'text-success' : 'text-danger'}`}>
                                    {response?.integrity?.total_equals_100 ? 'Verified' : 'Corrupted'}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden border border-white/5 rounded-2xl">
                            <table className="w-full border-collapse">
                                <thead className="bg-white/[0.02]">
                                    <tr>
                                        <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Party</th>
                                        <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Split %</th>
                                        <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Yield</th>
                                        <th className="text-left text-[10px] font-black text-text-secondary uppercase tracking-widest p-4 border-b border-white/5">Logic Rationale</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(response.results || []).length === 0 && (
                                        <tr>
                                            <td className="p-8 text-center text-xs font-bold text-text-secondary uppercase tracking-widest italic" colSpan={4}>No compute artifacts found</td>
                                        </tr>
                                    )}
                                    {(response.results || []).map((row, idx) => (
                                        <tr key={`${row.party_display_name}-${idx}`} className="hover:bg-white/[0.01] transition-colors">
                                            <td className="p-4 text-sm font-bold text-white">{row.party_display_name}</td>
                                            <td className="p-4 text-sm font-bold text-accent">{row.percent}%</td>
                                            <td className="p-4 text-sm font-bold text-white font-mono">${row.amount == null ? '0.00' : row.amount.toFixed(2)}</td>
                                            <td className="p-4 text-xs font-medium text-text-secondary leading-relaxed">{row.rationale || 'Default algorithmic allocation'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {(response.warnings || []).length > 0 && (
                            <div className="p-4 bg-warning/5 border border-warning/10 rounded-2xl">
                                <div className="flex items-center gap-2 text-warning mb-2">
                                    <AlertTriangle size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Neural Warning Logs</span>
                                </div>
                                <ul className="space-y-1">
                                    {(response.warnings || []).map((w, idx) => (
                                        <li key={`w-${idx}`} className="text-xs font-medium text-warning/80 leading-relaxed">• {w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIRoyalty;
