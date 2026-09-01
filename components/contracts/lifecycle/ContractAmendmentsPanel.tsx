"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Edit3, FileSearch, FileUp, Loader2, Plus, Save } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props { contractId: string | number; }

type Draft = {
  title?: string | null;
  documentType?: string | null;
  referenceNumber?: string | null;
  effectiveDateText?: string | null;
  expirationDateText?: string | null;
  governingLaw?: string | null;
  currency?: string | null;
  territorySummary?: string | null;
  termSummary?: string | null;
  rightsSummary?: string | null;
  obligationsSummary?: string | null;
  parties?: Array<{ name: string; role?: string | null }>;
};

const emptyDraft: Draft = { parties: [] };

export default function ContractAmendmentsPanel({ contractId }: Props) {
  const [loading, setLoading] = useState(true);
  const [amendments, setAmendments] = useState<any[]>([]);
  const [canManage, setCanManage] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftLoading, setDraftLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [sourceDocumentId, setSourceDocumentId] = useState<string | null>(null);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [sourceUploading, setSourceUploading] = useState(false);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  const [number, setNumber] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [aRes, lRes] = await Promise.all([
        api.get(`/contracts/${contractId}/amendments`),
        api.get(`/contracts/${contractId}/lifecycle`),
      ]);
      setAmendments(aRes.data?.data?.amendments || []);
      setCanManage(lRes.data?.data?.permissions?.canManage !== false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load amendments.");
    } finally { setLoading(false); }
  }, [contractId]);

  useEffect(() => { void load(); }, [load]);

  const register = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await api.post(`/contracts/${contractId}/amendments`, {
        amendmentNumber: number, effectiveDate: effectiveDate || null, reason: reason || null,
      });
      const amendment = res.data?.data?.amendment;
      setNumber(""); setEffectiveDate(""); setReason("");
      setSuccess("Amendment registered. Create a draft below to edit its proposed terms.");
      await load();
      if (amendment?.id) await openDraft(amendment.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to register amendment.");
    } finally { setSaving(false); }
  };

  const openDraft = async (amendmentId: string) => {
    setDraftLoading(amendmentId); setError(""); setSuccess("");
    try {
      const res = await api.post(`/contracts/${contractId}/amendments/${amendmentId}/draft`);
      const d = res.data?.data?.draft;
      setDraft(d?.content || emptyDraft);
      setSourceDocumentId(d?.sourceDocumentId || null);
      setExtractionId(null);
      setExtractionStatus(null);
      setEditing(amendmentId);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to create amendment draft.");
    } finally { setDraftLoading(null); }
  };

  const saveDraft = async () => {
    if (!editing) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await api.patch(`/contracts/${contractId}/amendments/${editing}/draft`, { content: draft });
      setSuccess("Amendment draft saved. It remains non-authoritative until verified.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to save amendment draft.");
    } finally { setSaving(false); }
  };

  const attachSourceDocument = async (file: File) => {
    if (!editing) return;
    setSourceUploading(true); setError(""); setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/contracts/${contractId}/amendments/${editing}/source-document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const id = res.data?.data?.sourceDocumentId;
      setSourceDocumentId(id || null);
      setExtractionId(null);
      setExtractionStatus(null);
      setSuccess("Amendment PDF attached as a new immutable source document. It is ready for extraction.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to attach amendment PDF.");
    } finally {
      setSourceUploading(false);
      if (sourceInputRef.current) sourceInputRef.current.value = "";
    }
  };

  const startExtraction = async () => {
    if (!sourceDocumentId) return;
    setExtracting(true); setError(""); setSuccess(""); setExtractionStatus("queued");
    try {
      const res = await api.post("/ai/contracts?action=extract", {
        document_id: sourceDocumentId,
        contract_id: Number(contractId),
      });
      const job = res.data?.data || res.data;
      const jobId = job?.id || job?.jobId || job?.job_id || null;
      const initialExtractionId = job?.extractionId || job?.extraction_id || null;
      if (initialExtractionId) setExtractionId(String(initialExtractionId));
      setExtractionStatus(job?.status || "queued");

      if (!jobId) {
        setSuccess("Extraction started. The Contract Intelligence service is processing the amendment PDF.");
        return;
      }

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const statusRes = await api.get("/ai/contracts", {
          params: { action: "extraction_status", document_id: sourceDocumentId, job_id: jobId },
        });
        const status = statusRes.data?.status || statusRes.data?.data?.status || "processing";
        const currentExtractionId = statusRes.data?.extractionId || statusRes.data?.extraction_id || statusRes.data?.data?.extractionId || statusRes.data?.data?.extraction_id;
        if (currentExtractionId) setExtractionId(String(currentExtractionId));
        setExtractionStatus(status);
        if (["completed", "complete", "succeeded", "failed", "error"].includes(String(status).toLowerCase())) break;
      }

      setSuccess("Amendment extraction has completed or reached a terminal state. Human verification is still required before the amendment becomes authoritative.");
    } catch (err: any) {
      setExtractionStatus("failed");
      setError(err?.response?.data?.error || err?.response?.data?.message || "Unable to start amendment extraction.");
    } finally { setExtracting(false); }
  };

  const field = (label: string, key: keyof Draft, multiline = false) => (
    <label className="text-xs text-text-secondary">
      {label}
      {multiline ? (
        <textarea value={(draft[key] as string) || ""} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white" />
      ) : (
        <input value={(draft[key] as string) || ""} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white" />
      )}
    </label>
  );

  if (loading) return <div className="flex justify-center py-12 text-text-secondary gap-2 items-center"><Loader2 className="animate-spin" size={18} /> Loading amendments…</div>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      {success && <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

      {canManage && <Card title="Register amendment">
        <p className="text-xs text-text-secondary mb-3">Create a controlled amendment record. Editing below creates a non-authoritative draft; the original verified contract is never modified.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-text-secondary">Amendment number *<input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="A-001" className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white" /></label>
          <label className="text-xs text-text-secondary">Effective date<input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white" /></label>
          <label className="text-xs text-text-secondary">Reason<input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white" /></label>
        </div>
        <div className="mt-3"><Button variant="primary" size="sm" disabled={saving || !number.trim()} onClick={register}><Plus size={14} /> Register & draft</Button></div>
      </Card>}

      {editing && <Card title="Amendment draft editor">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><p className="text-sm text-white">Proposed changes to the current verified contract</p><p className="text-xs text-text-secondary mt-1">This is a working copy. Saving it does not change the verified contract.</p></div><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={sourceUploading} onClick={() => sourceInputRef.current?.click()}><FileUp size={14} /> {sourceUploading ? "Attaching…" : "Attach amendment PDF"}</Button><input ref={sourceInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void attachSourceDocument(file); }} /><Button variant="primary" size="sm" disabled={saving} onClick={saveDraft}><Save size={14} /> Save draft</Button></div></div>
        <div className="mb-4 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-text-secondary">Attach the finalized amendment PDF here. OTTO stores it as a new source document; it does not overwrite the original contract. The new document must still pass extraction and human verification before becoming authoritative.</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field("Title", "title")}{field("Document type", "documentType")}{field("Reference number", "referenceNumber")}{field("Currency", "currency")}{field("Effective date", "effectiveDateText")}{field("Expiration date", "expirationDateText")}{field("Governing law", "governingLaw")}{field("Territories", "territorySummary", true)}{field("Term", "termSummary", true)}{field("Rights", "rightsSummary", true)}{field("Obligations", "obligationsSummary", true)}
        </div>
        <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"><p className="text-xs text-text-secondary mb-2">Parties</p>{(draft.parties || []).map((p, i) => <div key={i} className="grid grid-cols-2 gap-2 mb-2"><input value={p.name} onChange={(e) => setDraft((d) => ({ ...d, parties: (d.parties || []).map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="Party name" className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white" /><input value={p.role || ""} onChange={(e) => setDraft((d) => ({ ...d, parties: (d.parties || []).map((x, j) => j === i ? { ...x, role: e.target.value } : x) }))} placeholder="Role" className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white" /></div>)}<Button variant="secondary" size="sm" onClick={() => setDraft((d) => ({ ...d, parties: [...(d.parties || []), { name: "", role: "" }] }))}><Plus size={14} /> Add party</Button></div>
        <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary"><Edit3 size={14} /> Editing is isolated from the verified contract and must enter verification before becoming authoritative.</div>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-medium text-white">Source document & extraction</p><p className="text-xs text-text-secondary mt-1">The amendment PDF is the source of truth. Extraction creates derived data only.</p></div>
            {sourceDocumentId && <Badge variant="success" size="sm">PDF attached</Badge>}
          </div>
          {!sourceDocumentId ? <p className="mt-3 text-xs text-text-secondary">Attach the finalized amendment PDF to continue.</p> : <div className="mt-3 space-y-3"><div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-text-secondary break-all">Source document: {sourceDocumentId}</div><div className="flex flex-wrap items-center gap-2"><Button variant="primary" size="sm" disabled={extracting} onClick={() => void startExtraction()}><FileSearch size={14} /> {extracting ? "Extracting…" : extractionId ? "Re-run extraction" : "Start extraction"}</Button>{extractionStatus && <Badge variant={String(extractionStatus).toLowerCase().includes("fail") ? "danger" : "warn"} size="sm">{extractionStatus}</Badge>}{extractionId && <span className="text-xs text-text-secondary">Extraction: {extractionId}</span>}</div><p className="text-xs text-text-secondary">After extraction, the result remains non-authoritative. The next step is human verification, which is required before this amendment can create a new verified contract version.</p></div>}
        </div>
      </Card>}

      <Card title="Amendments">
        {amendments.length === 0 ? <p className="text-sm text-text-secondary">No amendments registered.</p> : <ul className="space-y-2">{amendments.map((a) => <li key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-wrap justify-between gap-2"><div><div className="flex items-center gap-2"><span className="font-medium text-sm text-white">{a.amendmentNumber}</span><Badge variant="warn" size="sm">{a.status}</Badge></div><p className="text-xs text-text-secondary mt-1">Effective {a.effectiveDate || "—"}{a.reason ? ` · ${a.reason}` : ""}{a.linkedVerifiedVersion != null ? ` · linked verified v${a.linkedVerifiedVersion}` : ""}</p></div><div className="flex items-center gap-3"><span className="text-xs text-text-secondary">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</span>{canManage && a.status === "registered" && <Button variant="secondary" size="sm" disabled={draftLoading === a.id} onClick={() => openDraft(a.id)}>{draftLoading === a.id ? <Loader2 size={13} className="animate-spin" /> : <Edit3 size={13} />} Edit draft</Button>}</div></li>)}</ul>}
      </Card>
    </div>
  );
}
