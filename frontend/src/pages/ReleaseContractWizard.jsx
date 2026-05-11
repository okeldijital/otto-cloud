import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CatalogService } from '../services/catalog';
import contractService from '../services/contractService';
import { aiClient } from '../api/aiClient';
import { ingest as ingestIntegration, plan as integrationPlan } from '../api/aiReleaseIntegrationClient';
import { ChevronLeft, Check, AlertCircle, FileText, Bot, Upload } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';

const steps = ['Select Release', 'Select Contract PDF', 'Plan', 'Ingest'];

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
        <div className="max-w-5xl mx-auto px-4 py-8">
            <Link to={releaseId ? `/catalog/releases/${releaseId}` : '/catalog/releases'} className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors font-bold text-sm mb-6">
                <ChevronLeft size={16} /> Back to Release
            </Link>

            <div className="bg-premium-glass border border-white/5 rounded-3xl p-8 shadow-glass backdrop-blur-2xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                        <Bot className="text-accent" size={32} />
                        Release Contract Ingest Wizard
                    </h1>
                    <p className="text-text-secondary">
                        Upload or select a contract PDF, let AI validate the plan, and ingest linkage records automatically.
                    </p>
                </div>

                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-accent text-sm flex items-start gap-3 mb-8">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <strong className="block mb-1 font-bold">Safe Operation</strong>
                        This wizard will not modify your existing catalog data. It only extracts entities and creates AI linkage records for tracking.
                    </div>
                </div>

                {/* Steps indicator */}
                <div className="flex flex-wrap gap-3 mb-8 pb-8 border-b border-white/5">
                    {steps.map((title, idx) => {
                        const stepNum = idx + 1;
                        const active = stepNum === activeStep;
                        const completed = stepNum < activeStep;
                        return (
                            <div
                                key={title}
                                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${
                                    active 
                                        ? 'border-accent/50 bg-accent/10 text-accent shadow-[0_0_15px_rgba(14,165,233,0.2)]' 
                                        : completed
                                        ? 'border-white/20 bg-white/10 text-white'
                                        : 'border-white/5 bg-white/5 text-text-muted'
                                }`}
                            >
                                {completed ? <Check size={14} /> : <span>{stepNum}.</span>}
                                {title}
                            </div>
                        );
                    })}
                </div>

                {featureDisabled && (
                    <div className="mb-8 bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm flex items-center gap-3">
                        <AlertCircle size={18} /> AI contract ingest is currently disabled on your plan.
                    </div>
                )}
                
                {error && (
                    <div className="mb-8 bg-warning/10 border border-warning/20 rounded-xl p-4 text-warning text-sm flex items-center gap-3">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <div className="grid gap-6">
                    {/* Step 1: Select Release */}
                    <section className={`bg-white/5 border border-white/5 rounded-2xl p-6 transition-opacity ${activeStep < 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">1</span>
                            Select Release
                        </h3>
                        <div className="max-w-xl">
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
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
                            >
                                <option value="" className="bg-[#0f1115]">Choose release...</option>
                                {releases.map((row) => (
                                    <option key={row.id} value={row.id} className="bg-[#0f1115]">
                                        #{row.id} - {row.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>

                    {/* Step 2: Select/Upload PDF */}
                    <section className={`bg-white/5 border border-white/5 rounded-2xl p-6 transition-opacity ${activeStep < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">2</span>
                            Select/Upload Contract PDF
                        </h3>
                        <div className="max-w-xl grid gap-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Existing Contract (Optional)</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
                                    value={selectedContractId}
                                    onChange={(e) => {
                                        setSelectedContractId(e.target.value);
                                        setSelectedDocId('');
                                        setSelectedFile(null);
                                    }}
                                >
                                    <option value="" className="bg-[#0f1115]">Select existing contract...</option>
                                    {releaseContracts.map((contract) => (
                                        <option key={contract.id} value={contract.id} className="bg-[#0f1115]">
                                            #{contract.id} - {contract.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedContractId && (
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">PDF Version</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
                                        value={selectedDocId}
                                        onChange={(e) => {
                                            setSelectedDocId(e.target.value);
                                            setSelectedFile(null);
                                        }}
                                    >
                                        <option value="" className="bg-[#0f1115]">Select contract PDF version...</option>
                                        {selectedContractDocs.map((doc) => (
                                            <option key={doc.id} value={doc.id} className="bg-[#0f1115]">
                                                v{doc.version || 1} - {doc.file_name || `Document ${doc.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-4 my-2">
                                <div className="h-[1px] bg-white/10 flex-1"></div>
                                <div className="text-xs font-bold text-text-muted uppercase tracking-widest">OR</div>
                                <div className="h-[1px] bg-white/10 flex-1"></div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Upload Local PDF</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-text-muted shrink-0">
                                        <Upload size={20} />
                                    </div>
                                    <div className="flex-1">
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
                                            className="text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button onClick={runExtract} disabled={loading || !releaseId} icon={Bot}>
                                    {loading ? 'Extracting via AI...' : 'Run Contract Extract'}
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* Step 3: Plan */}
                    <section className={`bg-white/5 border border-white/5 rounded-2xl p-6 transition-opacity ${activeStep < 3 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">3</span>
                                Integration Plan
                            </h3>
                            <Button onClick={runPlan} disabled={loading || !extractResult || !releaseId} variant="secondary">
                                {loading ? 'Planning...' : 'Generate Plan'}
                            </Button>
                        </div>

                        {planResult && (
                            <div className="grid gap-6">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <AlertCircle size={16} className={missingFlags.length > 0 ? "text-warning" : "text-success"} /> 
                                        Missing Flags
                                    </h4>
                                    {missingFlags.length > 0 ? (
                                        <ul className="list-disc ml-5 space-y-1 text-sm text-warning">
                                            {missingFlags.map((flag, idx) => (
                                                <li key={`flag-${idx}`}>{flag.message}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-success font-bold flex items-center gap-2">
                                            <Check size={16} /> No missing flags detected.
                                        </p>
                                    )}
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <FileText size={16} className="text-accent" /> 
                                        Entity Matches
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        {planResult?.matches?.release_artists?.length > 0 && (
                                            <div>
                                                <div className="text-xs font-bold text-text-secondary uppercase mb-2">Artists</div>
                                                <div className="flex flex-col gap-2">
                                                    {planResult.matches.release_artists.map((row) => (
                                                        <div key={`artist-${row.id}`} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm">
                                                            <span className="text-white font-bold">{row.name}</span>
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.contract_match ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                                                {row.contract_match ? 'Match' : 'Review Needed'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {planResult?.matches?.release_tracks?.length > 0 && (
                                            <div>
                                                <div className="text-xs font-bold text-text-secondary uppercase mb-2 mt-4">Tracks</div>
                                                <div className="flex flex-col gap-2">
                                                    {planResult.matches.release_tracks.map((row) => (
                                                        <div key={`track-${row.id}`} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm">
                                                            <span className="text-white font-bold">{row.name}</span>
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.contract_match ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                                                {row.contract_match ? 'Match' : 'Review Needed'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {planResult?.matches?.release_works?.length > 0 && (
                                            <div>
                                                <div className="text-xs font-bold text-text-secondary uppercase mb-2 mt-4">Works</div>
                                                <div className="flex flex-col gap-2">
                                                    {planResult.matches.release_works.map((row) => (
                                                        <div key={`work-${row.id}`} className="flex justify-between items-center bg-white/5 p-2 rounded-lg text-sm">
                                                            <span className="text-white font-bold">{row.name}</span>
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.contract_match ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                                                {row.contract_match ? 'Match' : 'Review Needed'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!planResult?.matches?.release_artists?.length && !planResult?.matches?.release_tracks?.length && !planResult?.matches?.release_works?.length && (
                                            <p className="text-sm text-text-muted">No entity matches found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 4: Ingest */}
                    <section className={`bg-white/5 border border-white/5 rounded-2xl p-6 transition-opacity ${activeStep < 4 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-black">4</span>
                                    Final Ingestion
                                </h3>
                                {missingFlags.length > 0 && (
                                    <label className="flex items-center gap-3 text-sm text-warning cursor-pointer p-3 bg-warning/10 border border-warning/20 rounded-xl mt-3">
                                        <input 
                                            type="checkbox" 
                                            checked={acknowledged} 
                                            onChange={(e) => setAcknowledged(e.target.checked)}
                                            className="w-4 h-4 rounded border-warning/30 bg-white/10 text-warning focus:ring-warning focus:ring-offset-0"
                                        />
                                        <span className="font-bold">I acknowledge the missing flags and wish to proceed anyway.</span>
                                    </label>
                                )}
                            </div>
                            <Button onClick={runIngest} disabled={loading || !canIngest} className={!canIngest ? 'opacity-50' : ''}>
                                {loading ? 'Ingesting...' : 'Confirm & Ingest'}
                            </Button>
                        </div>

                        {ingestResult && (
                            <div className="mt-6 p-5 rounded-xl bg-success/10 border border-success/20 text-success">
                                <h4 className="font-bold mb-3 flex items-center gap-2 text-success">
                                    <Check size={20} /> Ingestion Successful
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <span className="text-success/70 block text-xs uppercase tracking-widest mb-1">Document ID</span>
                                        <span className="font-mono font-bold">{ingestResult.contract_document_id}</span>
                                    </div>
                                    <div>
                                        <span className="text-success/70 block text-xs uppercase tracking-widest mb-1">Run ID</span>
                                        <span className="font-mono font-bold">{ingestResult.run_id}</span>
                                    </div>
                                    <div>
                                        <span className="text-success/70 block text-xs uppercase tracking-widest mb-1">Links Created</span>
                                        <span className="font-mono font-bold text-lg">{ingestResult.links_created_count}</span>
                                    </div>
                                    <div>
                                        <span className="text-success/70 block text-xs uppercase tracking-widest mb-1">Idempotent</span>
                                        <span className="font-mono font-bold">{String(ingestResult.idempotent_hit)}</span>
                                    </div>
                                </div>
                                {selectedContractId && (
                                    <Link 
                                        to={`/admin-of-works/contracts/${selectedContractId}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-success/20 hover:bg-success/30 text-success rounded-lg text-sm font-bold transition-colors"
                                    >
                                        View Ingest Record →
                                    </Link>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                    <Button variant="secondary" onClick={() => navigate(releaseId ? `/catalog/releases/${releaseId}` : '/catalog/releases')}>
                        Cancel
                    </Button>
                    
                    {selectedRelease && (
                        <div className="text-sm text-text-muted font-bold">
                            Operating on: <span className="text-white">#{selectedRelease.id} {selectedRelease.title}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReleaseContractWizard;
