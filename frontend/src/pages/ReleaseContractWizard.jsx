import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import contractService from '../services/contractService';
import { aiClient } from '../api/aiClient';
import { ingest as ingestIntegration, plan as integrationPlan } from '../api/aiReleaseIntegrationClient';

const steps = ['Select Release', 'Select Contract PDF', 'Plan', 'Ingest'];

const cardStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    background: '#fff',
};

const ReleaseContractWizard = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();

    const [activeStep, setActiveStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [featureDisabled, setFeatureDisabled] = useState(false);

    const [releases, setReleases] = useState([]);
    const [contracts, setContracts] = useState([]);

    const [releaseId, setReleaseId] = useState(searchParams.get('release_id') || id || '');
    const [selectedContractId, setSelectedContractId] = useState(searchParams.get('contract_id') || '');
    const [selectedDocId, setSelectedDocId] = useState(searchParams.get('doc_id') || '');
    const [selectedFile, setSelectedFile] = useState(null);

    const [extractResult, setExtractResult] = useState(null);
    const [planResult, setPlanResult] = useState(null);
    const [ingestResult, setIngestResult] = useState(null);
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [releaseRows, contractRows] = await Promise.all([
                    CatalogService.getAll('releases', { limit: 2000 }),
                    contractService.getAll({ limit: 500 }),
                ]);
                setReleases(Array.isArray(releaseRows) ? releaseRows : []);
                setContracts(Array.isArray(contractRows?.data || contractRows) ? (contractRows?.data || contractRows) : []);
            } catch (loadError) {
                setError(loadError?.response?.data?.detail || 'Failed to load wizard data.');
            }
        };
        load();
    }, []);

    const selectedRelease = useMemo(
        () => releases.find((row) => String(row.id) === String(releaseId)),
        [releases, releaseId]
    );

    const releaseContracts = useMemo(() => {
        if (!releaseId) return contracts;
        return contracts.filter((contract) => {
            const assets = contract?.assets || [];
            return assets.some(
                (asset) => String(asset.asset_type || '').toLowerCase() === 'release' && String(asset.asset_id) === String(releaseId)
            );
        });
    }, [contracts, releaseId]);

    const selectedContract = useMemo(
        () => releaseContracts.find((row) => String(row.id) === String(selectedContractId)) || contracts.find((row) => String(row.id) === String(selectedContractId)),
        [releaseContracts, contracts, selectedContractId]
    );

    const selectedContractDocs = useMemo(
        () => (selectedContract?.documents || []).slice().sort((a, b) => (b.version || 0) - (a.version || 0)),
        [selectedContract]
    );

    useEffect(() => {
        if (selectedContractDocs.length === 0) {
            setSelectedDocId('');
            return;
        }
        if (!selectedDocId) {
            setSelectedDocId(String(selectedContractDocs[0].id));
        }
    }, [selectedContractDocs, selectedDocId]);

    const resolveSourceFile = async () => {
        if (selectedFile) return selectedFile;
        if (!selectedContractId || !selectedDocId) return null;

        const token = localStorage.getItem('token');
        const downloadUrl = contractService.buildDownloadUrl(selectedContractId, selectedDocId);
        const response = await fetch(downloadUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error(`Failed to fetch selected contract PDF (${response.status})`);

        const blob = await response.blob();
        const name = selectedContractDocs.find((doc) => String(doc.id) === String(selectedDocId))?.file_name || `contract_${selectedContractId}.pdf`;
        return new File([blob], name, { type: 'application/pdf' });
    };

    const runExtract = async () => {
        if (!releaseId) {
            setError('Select a release first.');
            return;
        }

        setLoading(true);
        setError('');
        setFeatureDisabled(false);

        try {
            const sourceFile = await resolveSourceFile();
            if (!sourceFile) {
                throw new Error('Choose an existing contract PDF or upload a local PDF.');
            }
            const extraction = await aiClient.extractContract(sourceFile);
            setExtractResult(extraction);
            setPlanResult(null);
            setIngestResult(null);
            setAcknowledged(false);
            setActiveStep(3);
        } catch (runError) {
            setError(runError?.response?.data?.detail || runError?.message || 'Contract extraction failed.');
        } finally {
            setLoading(false);
        }
    };

    const runPlan = async () => {
        if (!releaseId || !extractResult) {
            setError('Release + extraction are required before planning.');
            return;
        }

        setLoading(true);
        setError('');
        setFeatureDisabled(false);

        try {
            const response = await integrationPlan({ release_id: Number(releaseId), contract_extract: extractResult, mode: 'readonly' });
            if (response?.featureDisabled) {
                setFeatureDisabled(true);
                return;
            }
            setPlanResult(response);
            setIngestResult(null);
            setAcknowledged(false);
            setActiveStep(4);
        } catch (runError) {
            setError(runError?.response?.data?.detail || runError?.message || 'Integration plan failed.');
        } finally {
            setLoading(false);
        }
    };

    const runIngest = async () => {
        if (!releaseId || !planResult) {
            setError('Run plan before ingest.');
            return;
        }
        if ((planResult?.missing_flags || []).length > 0 && !acknowledged) {
            setError('Acknowledge missing flags before ingest.');
            return;
        }

        setLoading(true);
        setError('');
        setFeatureDisabled(false);

        try {
            const sourceFile = await resolveSourceFile();
            if (!sourceFile) throw new Error('Missing contract PDF source for ingest.');

            const response = await ingestIntegration({
                release_id: Number(releaseId),
                file: sourceFile,
                contract_id: selectedContractId ? Number(selectedContractId) : undefined,
            });
            if (response?.featureDisabled) {
                setFeatureDisabled(true);
                return;
            }
            setIngestResult(response);
        } catch (runError) {
            setError(runError?.response?.data?.detail || runError?.message || 'Ingest failed.');
        } finally {
            setLoading(false);
        }
    };

    const missingFlags = planResult?.missing_flags || [];
    const canIngest = !!planResult && (missingFlags.length === 0 || acknowledged);

    return (
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <Link to={releaseId ? `/catalog/releases/${releaseId}` : '/catalog/releases'} className="back-link">
                    ← Back to Release
                </Link>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem' }}>Release Contract Ingest Wizard</h1>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Upload/select contract PDF, validate plan, then ingest AI linkage records.
                </p>

                <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', background: '#eff6ff', color: '#1d4ed8' }}>
                    This will not modify existing catalog data; it stores AI linkage records only.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    {steps.map((title, idx) => {
                        const stepNum = idx + 1;
                        const active = stepNum === activeStep;
                        return (
                            <div
                                key={title}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '999px',
                                    border: active ? '1px solid #0f766e' : '1px solid #cbd5e1',
                                    background: active ? '#ccfbf1' : '#f8fafc',
                                    color: active ? '#0f766e' : '#475569',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                }}
                            >
                                {stepNum}. {title}
                            </div>
                        );
                    })}
                </div>

                {featureDisabled && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: '#fef2f2', color: '#b91c1c' }}>
                        AI contract ingest is disabled.
                    </div>
                )}
                {error && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: '#fff7ed', color: '#c2410c' }}>
                        {error}
                    </div>
                )}

                <div style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
                    <section style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>1) Select Release</h3>
                        <select
                            value={releaseId}
                            onChange={(e) => {
                                setReleaseId(e.target.value);
                                setActiveStep(2);
                                setSelectedContractId('');
                                setSelectedDocId('');
                                setExtractResult(null);
                                setPlanResult(null);
                                setIngestResult(null);
                            }}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="">Choose release</option>
                            {releases.map((row) => (
                                <option key={row.id} value={row.id}>
                                    #{row.id} {row.title}
                                </option>
                            ))}
                        </select>
                    </section>

                    <section style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>2) Select/Upload Contract PDF</h3>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <select
                                value={selectedContractId}
                                onChange={(e) => {
                                    setSelectedContractId(e.target.value);
                                    setSelectedDocId('');
                                    setSelectedFile(null);
                                }}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">Select existing contract (optional)</option>
                                {releaseContracts.map((contract) => (
                                    <option key={contract.id} value={contract.id}>
                                        #{contract.id} {contract.title}
                                    </option>
                                ))}
                            </select>

                            {selectedContractId && (
                                <select
                                    value={selectedDocId}
                                    onChange={(e) => {
                                        setSelectedDocId(e.target.value);
                                        setSelectedFile(null);
                                    }}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="">Select contract PDF version</option>
                                    {selectedContractDocs.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            v{doc.version || 1} {doc.file_name || `Document ${doc.id}`}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Or upload a local PDF</div>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => {
                                    setSelectedFile(e.target.files?.[0] || null);
                                    if (e.target.files?.[0]) {
                                        setSelectedContractId('');
                                        setSelectedDocId('');
                                    }
                                }}
                            />

                            <div>
                                <button className="btn-primary" onClick={runExtract} disabled={loading || !releaseId}>
                                    {loading ? 'Running...' : 'Run Contract Extract'}
                                </button>
                            </div>
                        </div>
                    </section>

                    <section style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>3) Plan</h3>
                        <button className="btn-primary" onClick={runPlan} disabled={loading || !extractResult || !releaseId}>
                            {loading ? 'Running...' : 'Run Integration Plan'}
                        </button>

                        {planResult && (
                            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                                <div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Missing Flags</h4>
                                    <ul style={{ margin: '0.25rem 0 0 1rem' }}>
                                        {missingFlags.map((flag, idx) => (
                                            <li key={`flag-${idx}`}>{flag.message}</li>
                                        ))}
                                        {missingFlags.length === 0 && <li>none</li>}
                                    </ul>
                                </div>

                                <div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Entity Matches</h4>
                                    <ul style={{ margin: '0.25rem 0 0 1rem' }}>
                                        {(planResult?.matches?.release_artists || []).map((row) => (
                                            <li key={`artist-${row.id}`}>Artist: {row.name} ({row.contract_match ? 'match' : 'review'})</li>
                                        ))}
                                        {(planResult?.matches?.release_tracks || []).map((row) => (
                                            <li key={`track-${row.id}`}>Track: {row.name} ({row.contract_match ? 'match' : 'review'})</li>
                                        ))}
                                        {(planResult?.matches?.release_works || []).map((row) => (
                                            <li key={`work-${row.id}`}>Work: {row.name} ({row.contract_match ? 'match' : 'review'})</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </section>

                    <section style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>4) Ingest</h3>
                        {missingFlags.length > 0 && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                                I acknowledge missing flags and continue.
                            </label>
                        )}

                        <button className="btn-primary" onClick={runIngest} disabled={loading || !canIngest}>
                            {loading ? 'Running...' : 'Ingest'}
                        </button>

                        {ingestResult && (
                            <div style={{ marginTop: '0.9rem', padding: '0.75rem 1rem', borderRadius: '10px', background: '#f0fdf4', color: '#166534' }}>
                                <div>contract_document_id: {ingestResult.contract_document_id}</div>
                                <div>run_id: {ingestResult.run_id}</div>
                                <div>links_created_count: {ingestResult.links_created_count}</div>
                                <div>idempotent_hit: {String(ingestResult.idempotent_hit)}</div>
                                {selectedContractId && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <Link to={`/admin-of-works/contracts/${selectedContractId}`}>View ingest record</Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" onClick={() => navigate(releaseId ? `/catalog/releases/${releaseId}` : '/catalog/releases')}>
                        Close
                    </button>
                </div>
            </div>

            {selectedRelease && (
                <div style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.9rem' }}>
                    Selected release: #{selectedRelease.id} {selectedRelease.title}
                </div>
            )}
        </div>
    );
};

export default ReleaseContractWizard;
