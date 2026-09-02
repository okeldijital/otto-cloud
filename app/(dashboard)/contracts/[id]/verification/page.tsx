"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

type Field = {
  fieldKey: string;
  fieldLabel: string;
  extractedValue: string | null;
  workingValue: string | null;
  confidence: number;
  verificationState: string;
  isRequired?: boolean;
  isExtracted?: boolean;
  isNotFound?: boolean;
};
type Verification = {
  extraction?: { id: string; documentId: string; status: string; documentType?: string | null };
  fields?: Field[];
  progress?: { total: number; extracted: number; notFound: number; reviewed: number; pendingReview: number; requiredPending: string[]; canComplete: boolean };
  session?: { id: string; status: string; version: number };
  promotion?: { version?: number; verifiedContractId?: string } | null;
};

export default function ContractVerificationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const documentId = search.get("document_id") || "";
  const extractionId = search.get("extraction_id") || "";
  const [data, setData] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!documentId || !extractionId) { setError("Verification requires document_id and extraction_id."); setLoading(false); return; }
    try {
      const r = await api.get("/ai/contracts/verification", { params: { document_id: documentId, extraction_id: extractionId } });
      setData(r.data?.data || null); setError("");
    } catch (e: any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load verification workspace."); }
    finally { setLoading(false); }
  }, [documentId, extractionId]);
  useEffect(() => { void load(); }, [load]);

  const fieldAction = async (field: Field, action: "accept" | "reject" | "edit", value?: string | null) => {
    setSaving(field.fieldKey); setError(""); setMessage("");
    try {
      await api.patch("/ai/contracts/verification", { document_id: documentId, extraction_id: extractionId, field_key: field.fieldKey, action, value });
      await load();
    } catch (e: any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to update field."); }
    finally { setSaving(null); }
  };

  const complete = async () => {
    if (!window.confirm("Complete verification? All extracted fields must have been reviewed. This creates the authoritative verified contract version.")) return;
    setCompleting(true); setError(""); setMessage("");
    try {
      const r = await api.post("/ai/contracts/verification", { document_id: documentId, extraction_id: extractionId, action: "complete" });
      setData(r.data?.data || null); setMessage("Verification completed. The amendment has been promoted through the verified contract pipeline.");
    } catch (e: any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to complete verification."); }
    finally { setCompleting(false); }
  };

  if (loading) return <div className="p-12 flex justify-center gap-2 text-text-secondary"><Loader2 className="animate-spin" size={18} /> Loading verification workspace…</div>;
  if (error && !data) return <div className="p-12 space-y-4"><p className="text-danger">{error}</p><Button variant="secondary" onClick={() => router.back()}><ChevronLeft size={14} /> Back</Button></div>;

  const fields = data?.fields || [];
  const session = data?.session;
  const completed = session?.status === "completed" || Boolean(data?.promotion);
  const progress = data?.progress;
  const pending = progress?.pendingReview ?? fields.filter((f) => f.isExtracted !== false && f.verificationState === "draft").length;
  const extracted = progress?.extracted ?? fields.filter((f) => f.isExtracted !== false).length;
  const notFound = progress?.notFound ?? fields.filter((f) => f.isNotFound).length;
  const reviewed = progress?.reviewed ?? fields.filter((f) => f.isExtracted !== false && f.verificationState !== "draft").length;

  return <div className="space-y-6">
    <div className="flex items-center gap-3"><button onClick={() => router.back()} className="text-text-secondary hover:text-white"><ChevronLeft size={20} /></button><PageHeader title="Human Verification" subtitle={`Contract ${id}`} actions={<Badge variant={completed ? "success" : "warn"} size="sm">{completed ? "Verified" : "Review required"}</Badge>} /></div>
    {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
    {message && <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{message}</div>}

    <Card title="Verification boundary" subtitle="AI extraction is not authoritative. Review every extracted field before completion.">
      <div className="flex flex-wrap gap-4 text-sm">
        <span>Extraction: <strong>{data?.extraction?.id || extractionId}</strong></span>
        <span>Document: <strong>{data?.extraction?.documentId || documentId}</strong></span>
        <span>Extracted: <strong>{extracted}</strong></span>
        <span>Not found: <strong>{notFound}</strong></span>
        <span>Pending review: <strong>{pending}</strong></span>
        <span>Reviewed: <strong>{reviewed}/{extracted}</strong></span>
      </div>
    </Card>

    <Card title="Extracted fields" subtitle="Fields with a value require human review. Fields not found in the document are informational and do not block completion unless required.">
      <div className="space-y-3">
        {fields.map((f) => {
          const missing = f.isNotFound || f.isExtracted === false || (f.extractedValue == null && (f.workingValue == null || String(f.workingValue).trim() === ""));
          const disabled = completed || saving === f.fieldKey || missing;
          const stateVariant = missing ? "critical" : f.verificationState === "accepted" || f.verificationState === "edited" || f.verificationState === "verified" ? "success" : f.verificationState === "rejected" ? "critical" : "warn";
          return <div key={f.fieldKey} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div><p className="text-sm font-medium text-white">{f.fieldLabel}{f.isRequired ? " · Required" : ""}</p><p className="text-xs text-text-secondary mt-1">{f.fieldKey} · confidence {Math.round((f.confidence || 0) * 100)}%</p></div>
              <Badge variant={stateVariant as any} size="sm">{missing ? "Not found" : f.verificationState}</Badge>
            </div>
            {missing ? <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-text-secondary">No value was extracted from this document. {f.isRequired ? "This required field must be supplied or resolved before completion." : "This optional field does not block verification."}</div> : <div className="mt-3 flex gap-2"><input defaultValue={f.workingValue || f.extractedValue || ""} disabled={disabled} id={`field-${f.fieldKey}`} className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" /><Button variant="secondary" size="sm" disabled={disabled} onClick={() => fieldAction(f, "edit", (document.getElementById(`field-${f.fieldKey}`) as HTMLInputElement)?.value)}><Save size={13} /> Edit & accept</Button><Button variant="secondary" size="sm" disabled={disabled} onClick={() => fieldAction(f, "accept")}><CheckCircle2 size={13} /> Accept</Button><Button variant="ghost" size="sm" disabled={disabled} onClick={() => fieldAction(f, "reject")}><XCircle size={13} /> Reject</Button></div>}
          </div>;
        })}
      </div>
    </Card>

    {!completed && <Card title="Complete verification"><p className="text-sm text-text-secondary mb-4">Completion creates the authoritative verified layer. Optional fields that were not found are recorded as absent and do not require a rejection decision. The source PDF remains unchanged.</p><Button variant="primary" disabled={completing || pending > 0 || Boolean(progress?.requiredPending?.length)} onClick={() => void complete()}>{completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {pending > 0 ? `${pending} extracted fields still require review` : progress?.requiredPending?.length ? `${progress.requiredPending.length} required fields require attention` : "Complete verification"}</Button></Card>}
    {completed && <Card title="Verified"><div className="flex items-center gap-2 text-success"><CheckCircle2 size={18} /><span>Verification completed.</span></div>{data?.promotion?.version && <p className="text-sm text-text-secondary mt-2">Current verified contract version: <strong>v{data.promotion.version}</strong></p>}</Card>}
  </div>;
}
