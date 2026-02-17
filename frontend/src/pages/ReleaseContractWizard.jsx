import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import { aiClient } from '../api/aiClient';
import { attach as attachIntegration, plan as integrationPlan } from '../api/aiReleaseIntegrationClient';

const steps = ['Select Release', 'Extract Contract', 'Integration Plan', 'Ready'];

const cardStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    background: '#fff',
};

const ReleaseContractWizard = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [activeStep, setActiveStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [featureDisabled, setFeatureDisabled] = useState(false);

    const [releases, setReleases] = useState([]);
    const [releaseId, setReleaseId] = useState(id || '');

    const [selectedFile, setSelectedFile] = useState(null);
    const [extractResult, setExtractResult] = useState(null);
    const [planResult, setPlanResult] = useState(null);
    const [attachResult, setAttachResult] = useState(null);
    const [reviewConfirmed, setReviewConfirmed] = useState(false);

    useEffect(() => {
        const loadReleases = async () => {
            try {
                const rows = await CatalogService.getAll('releases', { limit: 2000 });
                setReleases(Array.isArray(rows) ? rows : []);
            } catch (loadError) {
                setError(loadError?.response?.data?.detail || 'Failed to load releases.');
            }
        };
        loadReleases();
    }, []);

    const selectedRelease = useMemo(
        () => releases.find((row) => String(row.id) === String(releaseId)),
        [releases, releaseId]
    );

    const runExtract = async () => {
        if (!releaseId) {
            setError('Select a release first.');
            return;
        }
        if (!selectedFile) {
            setError('Upload a contract PDF to continue.');
            return;
        }

        setLoading(true);
        setError('');
        setFeatureDisabled(false);

        try {
            const extraction = await aiClient.extractContract(selectedFile);
            setExtractResult(extraction);
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
            const response = await integrationPlan(Number(releaseId), extractResult);
            if (response?.featureDisabled) {
                setFeatureDisabled(true);
                return;
            }
            setPlanResult(response);
            setAttachResult(null);
            setReviewConfirmed(false);
            setActiveStep(4);
        } catch (runError) {
            setError(runError?.response?.data?.detail || runError?.message || 'Integration plan failed.');
        } finally {
            setLoading(false);
        }
    };

    const runAttach = async () => {
        if (!releaseId || !planResult) {
            setError('Run the integration plan before attach.');
            return;
        }

        if (planResult?.needs_review && !reviewConfirmed) {
            setError('You must confirm mismatch review before attach.');
            return;
        }

        setLoading(true);
        setError('');
        setFeatureDisabled(false);

        try {
            const response = await attachIntegration({
                release_id: Number(releaseId),
                wizard_plan: planResult,
                contract_extract: extractResult || undefined,
                reviewed_mismatches: reviewConfirmed,
            });
            if (response?.featureDisabled) {
                setFeatureDisabled(true);
                return;
            }
            setAttachResult(response);
        } catch (runError) {
            setError(runError?.response?.data?.detail || runError?.message || 'Attach failed.');
        } finally {
            setLoading(false);
        }
    };

    const suggestedActions = planResult?.suggested_actions || [];
    const missingFlags = planResult?.missing_flags || [];

    return (
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <Link to={releaseId ? `/catalog/releases/${releaseId}` : '/catalog/releases'} className="back-link">
                    ← Back to Release
                </Link>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem' }}>Release Integration Wizard</h1>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Read-only planning and validation only. No DB writes or attachments in this step.
                </p>

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
                        AI release integration feature is disabled.
                    </div>
                )}
                {error && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: '#fff7ed', color: '#c2410c' }}>
                        {error}
                    </div>
                )}

                <div style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
                    <section style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>1) Select/Confirm Release</h3>
                        <select
                            value={releaseId}
                            onChange={(e) => {
                                setReleaseId(e.target.value);
                                setActiveStep(2);
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
                        <h3 style={{ marginTop: 0 }}>2) Upload/Select Contract PDF (Extract)</h3>
                        <input type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                        <div style={{ marginTop: '0.75rem' }}>
                            <button className="btn-primary" onClick={runExtract} disabled={loading}>
                                {loading ? 'Running...' : 'Run Contract Extract'}
                            </button>
                        </div>
                        {extractResult && (
                            <p style={{ marginTop: '0.75rem', color: '#0f766e', fontWeight: 600 }}>
                                Extraction ready: {extractResult?.contract_title || 'Untitled contract'}
                            </p>
                        )}
                    </section>

                    <section style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>3) Integration Plan</h3>
                        <button className="btn-primary" onClick={runPlan} disabled={loading || !extractResult || !releaseId}>
                            {loading ? 'Running...' : 'Run Integration Plan'}
                        </button>

                        {planResult && (
                            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                                <div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Matched Entities</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <strong>Artists</strong>
                                            <ul style={{ margin: '0.25rem 0 0 1rem' }}>
                                                {(planResult.matches?.release_artists || []).map((row) => (
                                                    <li key={`artist-${row.id}`}>{row.name} {row.contract_match ? '(match)' : '(no match)'}</li>
                                                ))}
                                                {(planResult.matches?.release_artists || []).length === 0 && <li>none</li>}
                                            </ul>
                                        </div>
                                        <div>
                                            <strong>Tracks</strong>
                                            <ul style={{ margin: '0.25rem 0 0 1rem' }}>
                                                {(planResult.matches?.release_tracks || []).map((row) => (
                                                    <li key={`track-${row.id}`}>{row.name} {row.contract_match ? '(match)' : '(no match)'}</li>
                                                ))}
                                                {(planResult.matches?.release_tracks || []).length === 0 && <li>none</li>}
                                            </ul>
                                        </div>
                                        <div>
                                            <strong>Works</strong>
                                            <ul style={{ margin: '0.25rem 0 0 1rem' }}>
                                                {(planResult.matches?.release_works || []).map((row) => (
                                                    <li key={`work-${row.id}`}>{row.name} {row.contract_match ? '(match)' : '(no match)'}</li>
                                                ))}
                                                {(planResult.matches?.release_works || []).length === 0 && <li>none</li>}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

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
                                    <h4 style={{ marginBottom: '0.5rem' }}>Suggested Actions</h4>
                                    <ul style={{ margin: '0.25rem 0 0 1rem' }}>
                                        {suggestedActions.slice(0, 10).map((row, idx) => (
                                            <li key={`action-${idx}`}>
                                                {row.target}: {row.display_name} ({Math.round((row.confidence || 0) * 100)}%)
                                            </li>
                                        ))}
                                        {suggestedActions.length === 0 && <li>none</li>}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </section>

                    <section style={cardStyle}>
                        <h3 style={{ marginTop: 0 }}>4) Ready to attach</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                            Planning is complete. Attach persists append-only AI-owned references only.
                        </p>
                        {planResult?.needs_review && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', background: '#fffbeb', color: '#92400e' }}>
                                Release flagged: missing {missingFlags.length}. Review mismatches before attach.
                            </div>
                        )}
                        {planResult?.needs_review && (
                            <label style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={reviewConfirmed}
                                    onChange={(e) => setReviewConfirmed(e.target.checked)}
                                />
                                I reviewed mismatches and missing flags.
                            </label>
                        )}
                        <div style={{ marginTop: '0.75rem' }}>
                            <button
                                className="btn-primary"
                                onClick={runAttach}
                                disabled={loading || !planResult || (planResult?.needs_review && !reviewConfirmed)}
                            >
                                {loading ? 'Running...' : 'Attach to Release'}
                            </button>
                        </div>
                        {attachResult && (
                            <div style={{ marginTop: '0.75rem', color: '#0f766e', fontWeight: 600 }}>
                                Attached run #{attachResult.run_id} (
                                {attachResult?.attached_counts?.runs_created || 0} run,{' '}
                                {attachResult?.attached_counts?.links_created || 0} links)
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
