import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Upload, Edit3, Plus, Trash, Download, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import { confirmAction } from '../lib/tauri';
import contractService from '../services/contractService';
import EntityForm from '../components/EntityForm';
import EntityTypeahead from '../components/contracts/EntityTypeahead';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

const STATUS_COLORS = {
    Draft: 'neutral',
    Active: 'success',
    Expired: 'muted',
    Terminated: 'danger',
};

const HEALTH_COLORS = {
    RED: 'danger',
    AMBER: 'warning',
    GREEN: 'success',
};

const ROLE_OPTIONS = ['Artist', 'Label', 'Publisher', 'Licensee', 'Licensor', 'Producer', 'Other'];
const ASSET_TYPES = ['Track', 'Work', 'Release'];
const SCOPE_TYPES = ['INCLUSION', 'EXCLUSION'];
const TABS = ['documents', 'overview', 'parties', 'assets', 'financials'];

const ContractDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState('documents');

    const [metaModalOpen, setMetaModalOpen] = useState(false);
    const [metaForm, setMetaForm] = useState({});

    const [financialModalOpen, setFinancialModalOpen] = useState(false);
    const [financialForm, setFinancialForm] = useState({});

    const [partyModalOpen, setPartyModalOpen] = useState(false);
    const [partyForm, setPartyForm] = useState({
        party_mode: 'system',
        entity_type: 'artist',
        role: '',
        entity: null,
        external_name: '',
        split_percent: '',
        notes: '',
    });

    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [assetForm, setAssetForm] = useState({
        asset_type: 'Track',
        scope_type: 'INCLUSION',
        assets: [],
        notes: '',
    });

    const [docModalOpen, setDocModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await contractService.getById(id);
                const data = res.data || res;
                setContract(data);
                setSelectedDoc(latestDoc(data));
                setMetaForm({
                    title: data.title || '',
                    contract_number: data.contract_number || '',
                    contract_type: data.type || 'Recording', // Fixed: mapped from type to contract_type
                    territory: data.territory || '',
                    exclusivity: data.exclusivity || '',
                    start_date: data.start_date || '',
                    end_date: data.end_date || '',
                    signed_date: data.signed_date || '',
                    status: data.status || 'Draft',
                    status_quo_override: data.status_quo_override || '',
                    notes: data.notes || '',
                });
                setFinancialForm({
                    royalty_description: data.royalty_description || '',
                    advances_amount: data.advances_amount || '',
                    advances_currency: data.advances_currency || 'USD',
                    recoupment_notes: data.recoupment_notes || '',
                });
            } catch (err) {
                console.error(err);
                setError('Unable to load contract.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const latestDoc = (data) => {
        if (!data?.documents?.length) return null;
        return [...data.documents].sort((a, b) => (b.version || 0) - (a.version || 0))[0];
    };

    const documentsWithVersions = useMemo(() => {
        if (!contract?.documents) return [];
        return [...contract.documents].sort((a, b) => (b.version || 0) - (a.version || 0));
    }, [contract]);

    const saveMetadata = async (e) => {
        e.preventDefault();
        const payload = Object.entries(metaForm).reduce((acc, [key, val]) => {
            if (val === '' || val === null || typeof val === 'undefined') return acc;
            if (key === 'contract_type') {
                acc['type'] = val;
            } else {
                acc[key] = val;
            }
            return acc;
        }, {});
        if (payload.status === 'Active' && (!contract.documents || contract.documents.length === 0)) {
            alert('Attach at least one PDF before marking Active.');
            return;
        }
        try {
            const res = await contractService.update(id, payload);
            setContract(res.data || res);
            setMetaModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save metadata');
        }
    };

    const saveFinancials = async (e) => {
        e.preventDefault();
        const payload = {
            ...financialForm,
        };
        if (payload.advances_amount === '' || payload.advances_amount === null) delete payload.advances_amount;
        if (payload.advances_amount) payload.advances_amount = Number(payload.advances_amount);
        if (payload.advances_currency === '') delete payload.advances_currency;
        if (payload.royalty_description === '') delete payload.royalty_description;
        if (payload.recoupment_notes === '') delete payload.recoupment_notes;
        try {
            const res = await contractService.update(id, payload);
            setContract(res.data || res);
            setFinancialModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save financials');
        }
    };

    const addParty = async (e) => {
        e.preventDefault();
        const payload =
            partyForm.party_mode === 'system'
                ? {
                    entity_type: (partyForm.entity?.entity_type || partyForm.entity_type || 'artist').toString().replace(/^./, (m) => m.toUpperCase()),
                    entity_id: partyForm.entity?.id,
                    role: partyForm.role,
                    split_percent: Number(partyForm.split_percent) || null,
                    notes: partyForm.notes || null,
                }
                : {
                    entity_type: 'External',
                    external_name: partyForm.external_name,
                    role: partyForm.role,
                    split_percent: Number(partyForm.split_percent) || null,
                    notes: partyForm.notes || null,
                };

        const exists = (contract?.parties || []).some((p) => {
            if (payload.entity_type === 'External') {
                return p.external_name?.toLowerCase() === payload.external_name?.toLowerCase();
            }
            return p.entity_type === payload.entity_type && p.entity_id === payload.entity_id;
        });
        if (exists) {
            alert('This party is already linked.');
            return;
        }

        try {
            const res = await contractService.addParty(id, payload);
            const data = res.data || res;
            setContract(data);
            setPartyModalOpen(false);
            setPartyForm({
                party_mode: 'system',
                entity_type: 'artist',
                role: '',
                entity: null,
                external_name: '',
                split_percent: '',
                notes: '',
            });
        } catch (err) {
            console.error(err);
            alert('Failed to add party');
        }
    };

    const removeParty = async (partyId) => {
        if (!(await confirmAction('Remove this party?', 'Remove Party'))) return;
        try {
            const res = await contractService.removeParty(id, partyId);
            setContract(res.data || res);
        } catch (err) {
            console.error(err);
            alert('Failed to remove party');
        }
    };

    const addAssets = async (e) => {
        e.preventDefault();
        if (!assetForm.assets.length) {
            alert('Select at least one asset.');
            return;
        }

        try {
            for (const asset of assetForm.assets) {
                await contractService.addAsset(id, {
                    asset_type: assetForm.asset_type,
                    asset_id: asset.id,
                    scope_type: assetForm.scope_type,
                    notes: assetForm.notes || '',
                });
            }
            const refreshed = await contractService.getById(id);
            const data = refreshed.data || refreshed;
            setContract(data);
            setAssetModalOpen(false);
            setAssetForm({
                asset_type: 'Track',
                scope_type: 'INCLUSION',
                assets: [],
                notes: '',
            });
        } catch (err) {
            console.error(err);
            alert('Failed to add assets');
        }
    };

    const createPartyInline = async () => {
        if (!partyForm.external_name?.trim()) return;
        try {
            let res;
            if (partyForm.entity_type === 'artist') res = await contractService.createArtistInline(partyForm.external_name.trim());
            else if (partyForm.entity_type === 'organization') res = await contractService.createOrganizationInline(partyForm.external_name.trim());
            else res = await contractService.createIndividualInline(partyForm.external_name.trim());
            const data = res.data || res;
            setPartyForm({
                ...partyForm,
                party_mode: 'system',
                entity: {
                    id: data.id,
                    entity_type: partyForm.entity_type,
                    name: data.name,
                    label: data.name,
                },
            });
        } catch (err) {
            console.error(err);
            alert('Failed to create entity');
        }
    };

    const removeAsset = async (assetId) => {
        if (!(await confirmAction('Remove this asset?', 'Remove Asset'))) return;
        try {
            const res = await contractService.removeAsset(id, assetId);
            setContract(res.data || res);
        } catch (err) {
            console.error(err);
            alert('Failed to remove asset');
        }
    };

    const uploadDocument = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            alert('Choose a PDF first.');
            return;
        }
        setUploading(true);
        try {
            const docRes = await contractService.addDocument(id, selectedFile);
            const data = docRes.data || docRes;
            setContract(data);
            setSelectedDoc(latestDoc(data));
            setSelectedFile(null);
            setDocModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setUploading(false);
            setDragActive(false);
        }
    };

    const downloadDoc = (doc) => {
        if (!doc) return;
        const url = contractService.buildDownloadUrl(contract.id, doc.id);
        window.open(url, '_blank');
    };

    const downloadLatest = () => downloadDoc(selectedDoc || latestDoc(contract));

    const onDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.length) {
            setSelectedFile(e.dataTransfer.files[0]);
            setDocModalOpen(true);
        }
    };

    const deleteContract = async () => {
        if (!(await confirmAction('Are you sure you want to delete this contract? This action cannot be undone.', 'Delete Contract'))) return;
        try {
            await contractService.delete(contract.id);
            navigate('/contracts');
        } catch (err) {
            console.error(err);
            alert('Failed to delete contract');
        }
    };

    if (loading) return <div className="placeholder">Loading contract…</div>;
    if (error || !contract) return <div className="error-banner">{error || 'Not found'}</div>;

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            <button className="mb-6 inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors font-bold text-sm" onClick={() => navigate('/contracts')}>
                <ChevronLeft size={16} /> Back to Contracts
            </button>

            {/* Header / Hero Section */}
            <div className="bg-premium-glass border border-white/5 rounded-[32px] p-8 mb-8 flex flex-col gap-6 shadow-glass backdrop-blur-2xl">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-tight mb-2">{contract.title}</h1>
                        <p className="text-text-secondary font-mono bg-white/5 inline-block px-3 py-1 rounded-lg border border-white/10">{contract.contract_number}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {(contract.status_quo || contract.status_quo_reasons) && (
                            <Badge variant={HEALTH_COLORS[(contract.status_quo?.status || '').toUpperCase()] || 'neutral'} title={(contract.status_quo_reasons || contract.status_quo?.reasons || []).join(', ')}>
                                Health: {contract.status_quo?.status || 'RED'}
                                {contract.status_quo_override && <span className="opacity-70 ml-1">(Override)</span>}
                            </Badge>
                        )}
                        <Badge variant={STATUS_COLORS[contract.status] || 'neutral'}>
                            {contract.status}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => setDocModalOpen(true)}>
                            <Upload size={16} className="mr-1.5" /> Upload Payload
                        </Button>
                        <Button variant="primary" size="sm" onClick={downloadLatest}>
                            <Download size={16} className="mr-1.5" /> View PDF
                        </Button>
                        <Button variant="danger" className="bg-danger/10 hover:bg-danger/20 text-danger border-transparent" size="sm" onClick={deleteContract} title="Delete Contract">
                            <Trash size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto bg-premium-glass border border-white/5 rounded-2xl p-1 mb-6 hide-scrollbar shadow-sm">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap flex-1 text-center ${activeTab === tab ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'documents' && (
                    <div className="flex flex-col gap-6">
                        <div
                            className={`border-2 border-dashed rounded-[24px] p-8 text-center transition-all ${dragActive ? 'border-accent bg-accent/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={onDrop}
                        >
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-text-secondary">
                                <Upload size={24} />
                            </div>
                            <p className="text-white font-bold text-lg mb-2">Drag & drop signed PDF</p>
                            <p className="text-text-secondary text-sm">Or <button className="text-accent hover:underline focus:outline-none" onClick={() => setDocModalOpen(true)}>browse files</button></p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 flex flex-col gap-3">
                                {documentsWithVersions.length === 0 && <div className="bg-premium-glass border border-white/5 rounded-[24px] p-8 text-center text-text-secondary">No documents uploaded yet.</div>}
                                {documentsWithVersions.map((doc) => (
                                    <button
                                        key={doc.id}
                                        className={`p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all group ${selectedDoc?.id === doc.id ? 'bg-white/10 border-white/20 shadow-glow' : 'bg-premium-glass border-white/5 hover:border-white/20'}`}
                                        onClick={() => setSelectedDoc(doc)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 ${selectedDoc?.id === doc.id ? 'text-accent' : 'text-text-secondary group-hover:text-white'}`}>
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <div className={`font-bold text-sm mb-1 ${selectedDoc?.id === doc.id ? 'text-white' : 'text-text-primary'}`}>v{doc.version || '?'} • {doc.file_name}</div>
                                                <div className="text-text-secondary text-xs">
                                                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            <button className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors" onClick={(e) => { e.stopPropagation(); downloadDoc(doc); }} title="Download">
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="lg:col-span-2 bg-premium-glass border border-white/5 rounded-[24px] p-2 min-h-[600px] overflow-hidden flex flex-col shadow-glass">
                                {!selectedDoc ? (
                                    <div className="flex-1 flex items-center justify-center text-text-secondary">Select a document to preview.</div>
                                ) : (
                                    <div className="flex-1 bg-white/[0.02] rounded-2xl overflow-hidden border border-white/5 relative">
                                        <object
                                            data={contractService.buildFileUrl(selectedDoc.file_path)}
                                            type="application/pdf"
                                            className="w-full h-full"
                                        >
                                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                                <p className="text-text-secondary mb-4">PDF preview unavailable.</p>
                                                <Button variant="primary" onClick={() => downloadDoc(selectedDoc)}>Download instead</Button>
                                            </div>
                                        </object>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Key Terms" noPadding contentClassName="p-0">
                            <div className="divide-y divide-white/5">
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Type</span>
                                    <span className="text-white font-medium">{contract.contract_type || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</span>
                                    <Badge variant={STATUS_COLORS[contract.status] || 'neutral'}>{contract.status || '—'}</Badge>
                                </div>
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Effective</span>
                                    <span className="text-white font-medium">{contract.start_date || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">End</span>
                                    <span className="text-white font-medium">{contract.end_date || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Signed</span>
                                    <span className="text-white font-medium">{contract.signed_date || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Territory</span>
                                    <span className="text-white font-medium">{contract.territory || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center p-4">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Exclusivity</span>
                                    <span className="text-white font-medium">{contract.exclusivity || '—'}</span>
                                </div>
                            </div>
                        </Card>
                        
                        <Card 
                            title="Notes" 
                            headerAction={
                                <Button variant="ghost" size="sm" onClick={() => setMetaModalOpen(true)}>
                                    <Edit3 size={14} className="mr-1.5" /> Edit
                                </Button>
                            }
                            contentClassName="p-6 text-white whitespace-pre-wrap"
                        >
                            {contract.notes || <span className="text-text-secondary italic">No notes captured yet.</span>}
                        </Card>
                    </div>
                )}

                {activeTab === 'parties' && (
                    <Card 
                        title="Parties" 
                        headerAction={
                            <Button variant="primary" size="sm" onClick={() => setPartyModalOpen(true)}>
                                <Plus size={16} className="mr-1.5" /> Add Party
                            </Button>
                        }
                        noPadding
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Role</th>
                                        <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Party</th>
                                        <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Split%</th>
                                        <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Notes</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(contract.parties || []).map((p) => (
                                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-white font-medium">{p.role}</td>
                                            <td className="px-6 py-4 text-white font-bold">{p.external_name || p.display_name || `${p.entity_type || ''} #${p.entity_id || ''} `}</td>
                                            <td className="px-6 py-4 text-text-primary">{p.split_percent ? `${p.split_percent}%` : '—'}</td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">{p.notes || '—'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => removeParty(p.id)}>
                                                    <Trash size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!contract.parties || contract.parties.length === 0) && (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary">No parties yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {activeTab === 'assets' && (
                    <Card 
                        title="Assets" 
                        headerAction={
                            <Button variant="primary" size="sm" onClick={() => setAssetModalOpen(true)}>
                                <Plus size={16} className="mr-1.5" /> Link Assets
                            </Button>
                        }
                        noPadding
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Asset Type</th>
                                        <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Asset</th>
                                        <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Scope</th>
                                        <th className="px-6 py-4 text-[10px] text-text-secondary uppercase tracking-widest font-bold">Notes</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(contract.assets || []).map((a) => (
                                        <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-white font-medium">{a.asset_type}</td>
                                            <td className="px-6 py-4 text-text-secondary font-mono text-sm">ID {a.asset_id}</td>
                                            <td className="px-6 py-4"><Badge variant="gray" size="xs">{a.scope_type}</Badge></td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">{a.notes || '—'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => removeAsset(a.id)}>
                                                    <Trash size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!contract.assets || contract.assets.length === 0) && (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary">No assets linked.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {activeTab === 'financials' && (
                    <Card 
                        title="Financials" 
                        headerAction={
                            <Button variant="secondary" size="sm" onClick={() => setFinancialModalOpen(true)}>
                                <Edit3 size={14} className="mr-1.5" /> Edit
                            </Button>
                        }
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Royalty Description</label>
                                <p className="text-white">{contract.royalty_description || '—'}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Advances</label>
                                <p className="text-white text-lg font-mono">
                                    {contract.advances_amount
                                        ? `${contract.advances_currency || 'USD'} ${contract.advances_amount}`
                                        : '—'}
                                </p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Recoupment Notes</label>
                                <p className="text-white">{contract.recoupment_notes || '—'}</p>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Metadata Modal */}
            <EntityForm
                isOpen={metaModalOpen}
                onClose={() => setMetaModalOpen(false)}
                title="Edit Contract Metadata"
                onSubmit={saveMetadata}
            >
                <div className="form-group">
                    <label>Title</label>
                    <input
                        className="input"
                        value={metaForm.title}
                        onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Contract Number</label>
                    <input
                        className="input"
                        value={metaForm.contract_number}
                        onChange={(e) => setMetaForm({ ...metaForm, contract_number: e.target.value })}
                        required
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Type</label>
                        <input
                            className="input"
                            value={metaForm.contract_type} // Note: logic maps this to `type` in payload if needed, verify `saveMetadata`
                            onChange={(e) => setMetaForm({ ...metaForm, contract_type: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Health Override</label>
                        <select
                            className="input"
                            value={metaForm.status_quo_override || ''}
                            onChange={(e) => setMetaForm({ ...metaForm, status_quo_override: e.target.value || null })}
                        >
                            <option value="">(Auto-Calculated)</option>
                            <option value="GREEN">Green</option>
                            <option value="AMBER">Amber</option>
                            <option value="RED">Red</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <select
                            className="input"
                            value={metaForm.status}
                            onChange={(e) => setMetaForm({ ...metaForm, status: e.target.value })}
                        >
                            <option>Draft</option>
                            <option>Active</option>
                            <option>Expired</option>
                            <option>Terminated</option>
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Territory</label>
                        <input
                            className="input"
                            value={metaForm.territory}
                            onChange={(e) => setMetaForm({ ...metaForm, territory: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Exclusivity</label>
                        <input
                            className="input"
                            value={metaForm.exclusivity}
                            onChange={(e) => setMetaForm({ ...metaForm, exclusivity: e.target.value })}
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Effective Date</label>
                        <input
                            type="date"
                            className="input"
                            value={metaForm.start_date || ''}
                            onChange={(e) => setMetaForm({ ...metaForm, start_date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>End Date</label>
                        <input
                            type="date"
                            className="input"
                            value={metaForm.end_date || ''}
                            onChange={(e) => setMetaForm({ ...metaForm, end_date: e.target.value })}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Signed Date</label>
                    <input
                        type="date"
                        className="input"
                        value={metaForm.signed_date || ''}
                        onChange={(e) => setMetaForm({ ...metaForm, signed_date: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Notes</label>
                    <textarea
                        className="input"
                        rows={3}
                        value={metaForm.notes}
                        onChange={(e) => setMetaForm({ ...metaForm, notes: e.target.value })}
                    />
                </div>
            </EntityForm>

            {/* Financials Modal */}
            <EntityForm
                isOpen={financialModalOpen}
                onClose={() => setFinancialModalOpen(false)}
                title="Edit Financials"
                onSubmit={saveFinancials}
            >
                <div className="form-group">
                    <label>Royalty Description</label>
                    <textarea
                        className="input"
                        rows={3}
                        value={financialForm.royalty_description}
                        onChange={(e) => setFinancialForm({ ...financialForm, royalty_description: e.target.value })}
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Advances Amount</label>
                        <input
                            type="number"
                            className="input"
                            value={financialForm.advances_amount}
                            onChange={(e) => setFinancialForm({ ...financialForm, advances_amount: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Currency</label>
                        <input
                            className="input"
                            value={financialForm.advances_currency}
                            onChange={(e) => setFinancialForm({ ...financialForm, advances_currency: e.target.value })}
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Recoupment Notes</label>
                    <textarea
                        className="input"
                        rows={3}
                        value={financialForm.recoupment_notes}
                        onChange={(e) => setFinancialForm({ ...financialForm, recoupment_notes: e.target.value })}
                    />
                </div>
            </EntityForm>

            {/* Party Modal */}
            <EntityForm
                isOpen={partyModalOpen}
                onClose={() => setPartyModalOpen(false)}
                title="Add Party"
                onSubmit={addParty}
            >
                <div className="form-row">
                    <label className="radio">
                        <input
                            type="radio"
                            checked={partyForm.party_mode === 'system'}
                            onChange={() => setPartyForm({ ...partyForm, party_mode: 'system' })}
                        /> System entity
                    </label>
                    <label className="radio">
                        <input
                            type="radio"
                            checked={partyForm.party_mode === 'external'}
                            onChange={() => setPartyForm({ ...partyForm, party_mode: 'external' })}
                        /> External
                    </label>
                </div>
                <div className="form-group">
                    <label>Role</label>
                    <select
                        className="input"
                        value={partyForm.role}
                        required
                        onChange={(e) => setPartyForm({ ...partyForm, role: e.target.value })}
                    >
                        <option value="">Select role</option>
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r}>{r}</option>
                        ))}
                    </select>
                </div>
                {partyForm.party_mode === 'system' ? (
                    <>
                        <div className="form-group">
                            <label>Entity Type</label>
                            <select
                                className="input"
                                value={partyForm.entity_type}
                                onChange={(e) => setPartyForm({ ...partyForm, entity_type: e.target.value, entity: null })}
                            >
                                <option value="artist">Artist</option>
                                <option value="organization">Organization</option>
                                <option value="individual">Individual</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Entity Lookup</label>
                            <EntityTypeahead
                                placeholder="Search org entities…"
                                mode="party"
                                partyTypes={partyForm.entity_type}
                                onSelect={(entity) => setPartyForm({ ...partyForm, entity })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Create Inline (if not found)</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    className="input"
                                    value={partyForm.external_name}
                                    placeholder="New entity name"
                                    onChange={(e) => setPartyForm({ ...partyForm, external_name: e.target.value })}
                                />
                                <button type="button" className="btn" onClick={createPartyInline}>Create</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="form-group">
                        <label>External Name</label>
                        <input
                            className="input"
                            value={partyForm.external_name}
                            required
                            onChange={(e) => setPartyForm({ ...partyForm, external_name: e.target.value })}
                        />
                    </div>
                )}
                <div className="form-row">
                    <div className="form-group">
                        <label>Split % (optional)</label>
                        <input
                            type="number"
                            className="input"
                            value={partyForm.split_percent}
                            onChange={(e) => setPartyForm({ ...partyForm, split_percent: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <input
                            className="input"
                            value={partyForm.notes}
                            onChange={(e) => setPartyForm({ ...partyForm, notes: e.target.value })}
                        />
                    </div>
                </div>
            </EntityForm>

            {/* Asset Modal */}
            <EntityForm
                isOpen={assetModalOpen}
                onClose={() => setAssetModalOpen(false)}
                title="Link Assets"
                onSubmit={addAssets}
            >
                <div className="form-row">
                    <div className="form-group">
                        <label>Asset Type</label>
                        <select
                            className="input"
                            value={assetForm.asset_type}
                            onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })}
                        >
                            {ASSET_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Scope</label>
                        <select
                            className="input"
                            value={assetForm.scope_type}
                            onChange={(e) => setAssetForm({ ...assetForm, scope_type: e.target.value })}
                        >
                            {SCOPE_TYPES.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label>Select Assets</label>
                    <EntityTypeahead
                        multiple
                        onChange={(assets) => setAssetForm({ ...assetForm, assets })}
                        placeholder="Search by title or code"
                        assetType={assetForm.asset_type}
                        mode="asset"
                    />
                </div>
                <div className="form-group">
                    <label>Notes</label>
                    <input
                        className="input"
                        value={assetForm.notes}
                        onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                    />
                </div>
            </EntityForm>

            {/* Document upload */}
            <EntityForm
                isOpen={docModalOpen}
                onClose={() => { setDocModalOpen(false); setSelectedFile(null); }}
                title="Upload Contract PDF"
                onSubmit={uploadDocument}
                isSubmitting={uploading}
            >
                <div className="form-group">
                    <label>Choose File (PDF)</label>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        required
                    />
                </div>
                <p className="muted small">PDF is the source of truth. Each upload becomes a new version.</p>
            </EntityForm>
        </div>
    );
};

export default ContractDetail;
