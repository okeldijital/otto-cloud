import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import contractService from '../services/contractService';
import { wizardPlan } from '../api/aiIntakeClient';
import { plan as validationPlan } from '../api/aiReleaseValidationClient';

const steps = ['Select Release', 'Contract Source', 'Review Plan'];

const ReleaseContractWizard = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [featureDisabled, setFeatureDisabled] = useState(false);
    const [releases, setReleases] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [releaseId, setReleaseId] = useState(id || '');
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedContractId, setSelectedContractId] = useState('');
    const [wizardResult, setWizardResult] = useState(null);
    const [validationResult, setValidationResult] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [releaseRows, contractRows] = await Promise.all([
                    CatalogService.getAll('releases', { limit: 2000 }),
                    contractService.getAll({ limit: 500 }),
                ]);
                setReleases(Array.isArray(releaseRows) ? releaseRows : []);
                const contractData = contractRows?.data || contractRows || [];
                setContracts(Array.isArray(contractData) ? contractData : []);
            } catch (loadError) {
                setError(loadError?.response?.data?.detail || 'Failed to load wizard options.');
            }
        };
        load();
    }, []);

    const selectedRelease = useMemo(
        () => releases.find((row) => String(row.id) === String(releaseId)),
        [releases, releaseId]
    );

    const statusBanner = useMemo(() => {
        const needsReview = validationResult?.validation_plan?.flags?.needs_contract_review;
        if (needsReview === true) return { label: 'Needs Review', tone: '#f59e0b', bg: '#fffbeb' };
        if (needsReview === false) return { label: 'OK', tone: '#16a34a', bg: '#f0fdf4' };
        return { label: 'Awaiting Plan', tone: '#64748b', bg: '#f8fafc' };
    }, [validationResult]);

    const runPlan = async () => {
        if (!releaseId) {
            setError('Select a release first.');
            return;
        }
        setIsLoading(true);
        setError('');
        setFeatureDisabled(false);
        try {
            const wizardResp = await wizardPlan({
                release_id: Number(releaseId),
                file: selectedFile || undefined,
                contract_id: selectedContractId ? Number(selectedContractId) : undefined,
            });
            if (wizardResp?.featureDisabled) {
                setFeatureDisabled(true);
                return;
            }

            const validationResp = await validationPlan({
                release_id: Number(releaseId),
                contract_extract: wizardResp?.extraction,
                contract_id: selectedContractId ? Number(selectedContractId) : undefined,
            });
            if (validationResp?.featureDisabled) {
                setFeatureDisabled(true);
                return;
            }

            setWizardResult(wizardResp);
            setValidationResult(validationResp);
            setStep(3);
        } catch (runError) {
            setError(runError?.response?.data?.detail || runError?.message || 'Failed to run plan.');
        } finally {
            setIsLoading(false);
        }
    };

    const missingChecklist = validationResult?.validation_plan?.flags?.missing_entities || [];
    const mismatchRows = validationResult?.validation_plan?.diff?.mismatched_split_totals || [];

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <Link to={releaseId ? `/catalog/releases/${releaseId}` : '/catalog/releases'} className="back-link">
                    ← Back to Release
                </Link>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem' }}>Release Contract Intake Wizard</h1>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Read-only planning flow. No attach/persist occurs in Step D.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    {steps.map((title, idx) => {
                        const stepNum = idx + 1;
                        const active = stepNum === step;
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
                        Feature disabled
                    </div>
                )}
                {error && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: '#fff7ed', color: '#c2410c' }}>
                        {error}
                    </div>
                )}

                <div style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                        <h3 style={{ marginTop: 0 }}>1) Select Release</h3>
                        <select
                            value={releaseId}
                            onChange={(e) => setReleaseId(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="">Choose release</option>
                            {releases.map((row) => (
                                <option key={row.id} value={row.id}>
                                    #{row.id} {row.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                        <h3 style={{ marginTop: 0 }}>2) Upload Contract PDF or Select Existing Contract</h3>
                        <input type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                        <div style={{ marginTop: '0.75rem' }}>
                            <select
                                value={selectedContractId}
                                onChange={(e) => setSelectedContractId(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">Or choose existing contract attachment</option>
                                {contracts.map((row) => (
                                    <option key={row.id} value={row.id}>
                                        #{row.id} {row.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                        <h3 style={{ marginTop: 0 }}>3) Review Plan</h3>
                        <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: statusBanner.bg, color: statusBanner.tone, fontWeight: 700 }}>
                            {statusBanner.label === 'OK' ? '✅ OK' : statusBanner.label === 'Needs Review' ? '⚠ Needs Review' : '⏳ Awaiting Plan'}
                        </div>

                        {wizardResult && (
                            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                                <div>
                                    <h4>Suggested Entities</h4>
                                    {['artists', 'tracks', 'works', 'orgs', 'individuals'].map((bucket) => (
                                        <div key={bucket} style={{ marginBottom: '0.5rem' }}>
                                            <strong>{bucket}</strong>
                                            <ul style={{ margin: '0.25rem 0 0.5rem 1rem' }}>
                                                {(wizardResult?.suggestions?.[bucket] || []).slice(0, 6).map((sug, idx) => (
                                                    <li key={`${bucket}-${idx}`}>
                                                        {sug.display_name} ({Math.round((sug.confidence || 0) * 100)}%) - {sug.rationale}
                                                    </li>
                                                ))}
                                                {(wizardResult?.suggestions?.[bucket] || []).length === 0 && <li>none</li>}
                                            </ul>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <h4>Missing Data Checklist</h4>
                                    <ul style={{ margin: '0.25rem 0 0.5rem 1rem' }}>
                                        {missingChecklist.length ? missingChecklist.map((item) => <li key={item}>{item}</li>) : <li>none</li>}
                                    </ul>
                                </div>

                                <div>
                                    <h4>Metadata Mismatches</h4>
                                    <ul style={{ margin: '0.25rem 0 0.5rem 1rem' }}>
                                        {mismatchRows.length ? mismatchRows.map((row) => (
                                            <li key={row.group_id}>
                                                {row.group_name}: total {row.total_percent}%
                                            </li>
                                        )) : <li>none</li>}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={runPlan} disabled={isLoading}>
                        {isLoading ? 'Running...' : 'Run Plan'}
                    </button>
                    <button className="btn-secondary" onClick={runPlan} disabled={isLoading}>
                        Refresh
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(releaseId ? `/catalog/releases/${releaseId}` : '/catalog/releases')}>
                        Close
                    </button>
                    <button
                        className="btn-secondary"
                        disabled
                        title="enabled in Step E"
                        style={{ opacity: 0.55, cursor: 'not-allowed' }}
                    >
                        Attach &amp; Persist
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
