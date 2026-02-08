import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    FileText,
    Upload,
    Edit3,
    CheckCircle,
    AlertCircle,
    Trash,
    Download,
    Link as LinkIcon,
    ChevronLeft
} from 'lucide-react';
import { confirmAction } from '../../lib/tauri';
import worksAdminService from '../../services/worksAdminService';
import EntityForm from '../../components/EntityForm';

const STATUS_COLORS = {
    Unknown: 'neutral',
    Submitted: 'warning',
    Registered: 'success',
    Rejected: 'danger',
};

const WorksAdminDetail = () => {
    const { work_id } = useParams();
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({});

    const [docModalOpen, setDocModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [docType, setDocType] = useState('RegistrationProof');
    const [selectedDoc, setSelectedDoc] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await worksAdminService.getByWork(work_id);
                const data = res.data || res;
                setAdmin(data);
                if (data.documents?.length) {
                    setSelectedDoc(data.documents[0]);
                }
                setEditForm({
                    registration_status: data.registration_status,
                    registered_with: data.registered_with || '',
                    registration_date: data.registration_date || '',
                    registration_reference: data.registration_reference || '',
                    notes: data.notes || '',
                });
            } catch (err) {
                console.error(err);
                setError('Failed to load administration detail.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [work_id]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await worksAdminService.update(admin.id, editForm);
            setAdmin(res.data || res);
            setEditModalOpen(false);
        } catch (err) {
            alert('Update failed');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        setUploading(true);
        try {
            const res = await worksAdminService.addDocument(admin.id, docType, selectedFile);
            const data = res.data || res;
            setAdmin(data);
            setSelectedDoc(data.documents[data.documents.length - 1]);
            setDocModalOpen(false);
        } catch (err) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!(await confirmAction('Delete this document?', 'Delete Document'))) return;
        try {
            const res = await worksAdminService.deleteDocument(admin.id, docId);
            setAdmin(res.data || res);
            if (selectedDoc?.id === docId) {
                setSelectedDoc(null);
            }
        } catch (err) {
            alert('Delete failed');
        }
    };

    if (loading) return <div className="placeholder">Loading administration detail…</div>;
    if (error || !admin) return <div className="error-banner">{error || 'Not found'}</div>;

    const sq = admin.status_quo || { status: 'UNKNOWN', reasons: [] };

    return (
        <div className="contracts-shell">
            <header className="contracts-header">
                <div>
                    <button className="back-link" onClick={() => navigate('/admin-of-works/works')}>
                        <ChevronLeft size={16} /> Back to list
                    </button>
                    <h1>Admin: {admin.work?.title}</h1>
                    <div className="flex-row gap-2 mt-1">
                        <span className="muted mono small">Work ID #{admin.work_id}</span>
                        <span className={`status-badge ${sq.status.toLowerCase()}`}>
                            {sq.status} Status
                        </span>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn ghost" onClick={() => setEditModalOpen(true)}>
                        <Edit3 size={16} /> Edit Metadata
                    </button>
                    <button className="btn orange" onClick={() => setDocModalOpen(true)}>
                        <Upload size={16} /> Upload Proof
                    </button>
                </div>
            </header>

            <div className="grid-2">
                <div className="panel padded">
                    <h3 className="section-title">Registration Details</h3>
                    <ul className="kv">
                        <li><span>Status</span><strong><span className={`status-badge ${STATUS_COLORS[admin.registration_status]}`}>{admin.registration_status}</span></strong></li>
                        <li><span>Society/Registry</span><strong>{admin.registered_with || '—'}</strong></li>
                        <li><span>Reg. Date</span><strong>{admin.registration_date || '—'}</strong></li>
                        <li><span>Reference</span><strong>{admin.registration_reference || '—'}</strong></li>
                        <li><span>ISWC</span><strong>{admin.work?.iswc_code || <span className="danger-text">Missing ISWC</span>}</strong></li>
                    </ul>
                    <div className="mt-2">
                        <h4 className="eyebrow">Reasons / Requirements</h4>
                        <div className="reasons-list">
                            {sq.reasons.map((r, i) => (
                                <div key={i} className="small muted flex-row gap-1">
                                    <AlertCircle size={12} className={sq.status === 'RED' ? 'danger-text' : 'warning-text'} /> {r}
                                </div>
                            ))}
                            {sq.reasons.length === 0 && <div className="small success-text flex-row gap-1"><CheckCircle size={12} /> Requirements met</div>}
                        </div>
                    </div>
                </div>

                <div className="panel padded">
                    <h3 className="section-title">Linked Contracts</h3>
                    <div className="linked-list">
                        {admin.linked_contracts?.map((lc, i) => (
                            <div key={i} className="linked-item" onClick={() => navigate(`/admin-of-works/contracts/${lc.contract_id}`)}>
                                <LinkIcon size={16} className="muted" />
                                <div>
                                    <p className="strong">{lc.title}</p>
                                    <p className="small muted">Contract Status: {lc.contract_status}</p>
                                </div>
                                <span className={`status-badge thin ${lc.relationship_status.toLowerCase()} ml-auto`}>
                                    {lc.relationship_status}
                                </span>
                            </div>
                        ))}
                        {(!admin.linked_contracts || admin.linked_contracts.length === 0) && (
                            <p className="placeholder">No contracts linked to this work.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="panel padded mt-1">
                <h3 className="section-title">Documents & Proof</h3>
                <div className="document-stack">
                    <div className="document-versions">
                        {admin.documents?.map(doc => (
                            <div key={doc.id} className={`document-card ${selectedDoc?.id === doc.id ? 'active' : ''}`} onClick={() => setSelectedDoc(doc)}>
                                <FileText size={20} />
                                <div>
                                    <div className="strong">{doc.doc_type}</div>
                                    <div className="muted small">{doc.file_name}</div>
                                </div>
                                <div className="flex-row gap-1 ml-auto">
                                    <button className="ghost-btn" onClick={(e) => { e.stopPropagation(); window.open(worksAdminService.buildDownloadUrl(admin.id, doc.id), '_blank'); }}><Download size={14} /></button>
                                    <button className="ghost-btn danger" onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}><Trash size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {(!admin.documents || admin.documents.length === 0) && <p className="placeholder">No proof documents uploaded.</p>}
                    </div>
                    <div className="document-preview">
                        {selectedDoc ? (
                            <iframe src={worksAdminService.buildDownloadUrl(admin.id, selectedDoc.id)} className="pdf-viewer" title="PDF Viewer" />
                        ) : (
                            <div className="placeholder">Select a document to preview.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EntityForm isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Update Registration Info" onSubmit={handleUpdate}>
                <div className="form-group">
                    <label>Registration Status</label>
                    <select className="input" value={editForm.registration_status} onChange={e => setEditForm({ ...editForm, registration_status: e.target.value })}>
                        <option value="Unknown">Unknown</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Registered">Registered</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Registered With (PRO/Publisher)</label>
                    <input className="input" value={editForm.registered_with} onChange={e => setEditForm({ ...editForm, registered_with: e.target.value })} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Registration Date</label>
                        <input type="date" className="input" value={editForm.registration_date} onChange={e => setEditForm({ ...editForm, registration_date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Reference #</label>
                        <input className="input" value={editForm.registration_reference} onChange={e => setEditForm({ ...editForm, registration_reference: e.target.value })} />
                    </div>
                </div>
                <div className="form-group">
                    <label>Internal Notes</label>
                    <textarea className="input" rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
            </EntityForm>

            <EntityForm isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="Upload Documentation" onSubmit={handleUpload} isSubmitting={uploading}>
                <div className="form-group">
                    <label>Document Type</label>
                    <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
                        <option value="RegistrationProof">Registration Proof</option>
                        <option value="SplitSheet">Split Sheet</option>
                        <option value="MetadataConfirmation">Metadata Confirmation</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Choose File (PDF/Image)</label>
                    <input type="file" onChange={e => setSelectedFile(e.target.files[0])} required />
                </div>
            </EntityForm>
        </div>
    );
};

export default WorksAdminDetail;
