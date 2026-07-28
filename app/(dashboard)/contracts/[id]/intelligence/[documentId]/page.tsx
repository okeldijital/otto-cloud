"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Brain,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ExtractionStatusBadge from "@/components/contracts/intelligence/ExtractionStatusBadge";
import VerificationFieldCard from "@/components/contracts/intelligence/VerificationFieldCard";
import PDFViewerPanel from "@/components/documents/pdf/PDFViewerPanel";
import api from "@/lib/api";
import { DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD } from "@/lib/document-intelligence/constants";

/**
 * Document Intelligence + Human Verification Workspace (Milestone 3.1).
 * Left: PDF · Center: AI draft fields · Right: verified layer
 */
export default function DocumentIntelligencePage() {
  const { id: contractId, documentId } = useParams<{
    id: string;
    documentId: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [job, setJob] = useState<any>(null);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [verification, setVerification] = useState<any>(null);
  const [canVerify, setCanVerify] = useState(true);
  const [starting, setStarting] = useState(false);
  const [fieldBusy, setFieldBusy] = useState<string | null>(null);
  const [unsavedNote, setUnsavedNote] = useState(false);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [fieldSearch, setFieldSearch] = useState("");
  const [showPdf, setShowPdf] = useState(true);

  const loadExtraction = useCallback(async () => {
    const statusRes = await api.get(
      `/contracts/${contractId}/documents/${documentId}/extractions`
    );
    const statusData = statusRes.data?.data;
    setJob(statusData?.job ?? null);
    return statusData?.extractionId as string | null;
  }, [contractId, documentId]);

  const loadVerification = useCallback(
    async (extId: string) => {
      const res = await api.get(
        `/contracts/${contractId}/documents/${documentId}/verifications`,
        { params: { extractionId: extId } }
      );
      setVerification(res.data?.data?.verification ?? null);
      setCanVerify(res.data?.data?.permissions?.canVerify !== false);
      setUnsavedNote(false);
    },
    [contractId, documentId]
  );

  const load = useCallback(async () => {
    try {
      setError("");
      const extId = await loadExtraction();
      setExtractionId(extId);
      if (extId) {
        await loadVerification(extId);
      } else {
        setVerification(null);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to load workspace."
      );
    } finally {
      setLoading(false);
    }
  }, [loadExtraction, loadVerification]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const active =
      job && ["queued", "running", "retrying"].includes(job.status);
    if (!active) return;
    const t = setInterval(() => void load(), 2500);
    return () => clearInterval(t);
  }, [job, load]);

  const startExtraction = async () => {
    setStarting(true);
    setError("");
    try {
      await api.post(
        `/contracts/${contractId}/documents/${documentId}/extractions`
      );
      setSuccess("Extraction queued.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to start extraction.");
    } finally {
      setStarting(false);
    }
  };

  const patchField = async (
    fieldKey: string,
    action: string,
    value?: string
  ) => {
    if (!extractionId) return;
    setFieldBusy(fieldKey);
    setError("");
    try {
      const res = await api.patch(
        `/contracts/${contractId}/documents/${documentId}/verifications/fields`,
        { extractionId, fieldKey, action, value }
      );
      setVerification(res.data?.data?.verification ?? null);
      setUnsavedNote(true);
      setSuccess(`Field ${action} applied.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to update field.");
    } finally {
      setFieldBusy(null);
    }
  };

  const bulk = async (action: "accept_above_threshold" | "reject_all") => {
    if (!extractionId) return;
    setStarting(true);
    setError("");
    try {
      const res = await api.post(
        `/contracts/${contractId}/documents/${documentId}/verifications/fields`,
        {
          extractionId,
          action,
          confidenceThreshold: DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD,
        }
      );
      setVerification(res.data?.data?.verification ?? null);
      setUnsavedNote(true);
      setSuccess(`Bulk ${action.replace(/_/g, " ")} done.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Bulk update failed.");
    } finally {
      setStarting(false);
    }
  };

  const complete = async () => {
    if (!extractionId) return;
    if (
      !window.confirm(
        "Mark verification complete? This promotes reviewed fields to the verified layer. AI drafts remain stored separately."
      )
    ) {
      return;
    }
    setStarting(true);
    setError("");
    try {
      const res = await api.post(
        `/contracts/${contractId}/documents/${documentId}/verifications/complete`,
        { extractionId, confirm: true }
      );
      setVerification(res.data?.data?.verification ?? null);
      setUnsavedNote(false);
      setSuccess("Verification completed. Verified data stored separately from AI drafts.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (Array.isArray(err?.response?.data?.errors)
            ? err.response.data.errors.join(", ")
            : "Unable to complete verification.")
      );
    } finally {
      setStarting(false);
    }
  };

  const reopen = async () => {
    if (!extractionId) return;
    if (!window.confirm("Reopen verification? A new session version will be created.")) {
      return;
    }
    setStarting(true);
    setError("");
    try {
      const res = await api.post(
        `/contracts/${contractId}/documents/${documentId}/verifications/reopen`,
        { extractionId }
      );
      setVerification(res.data?.data?.verification ?? null);
      setSuccess("Verification reopened as a new session version.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to reopen.");
    } finally {
      setStarting(false);
    }
  };

  const filteredFields = useMemo(() => {
    let list = verification?.fields || [];
    if (filterStatus !== "all") {
      list = list.filter((f: any) => f.verificationState === filterStatus);
    }
    if (filterConfidence === "high") {
      list = list.filter((f: any) => f.confidence >= 0.95);
    } else if (filterConfidence === "medium") {
      list = list.filter((f: any) => f.confidence >= 0.8 && f.confidence < 0.95);
    } else if (filterConfidence === "low") {
      list = list.filter((f: any) => f.confidence < 0.8);
    }
    if (fieldSearch.trim()) {
      const q = fieldSearch.toLowerCase();
      list = list.filter(
        (f: any) =>
          f.fieldLabel.toLowerCase().includes(q) ||
          f.fieldKey.toLowerCase().includes(q) ||
          String(f.workingValue || "")
            .toLowerCase()
            .includes(q) ||
          String(f.extractedValue || "")
            .toLowerCase()
            .includes(q)
      );
    }
    return list;
  }, [verification, filterStatus, filterConfidence, fieldSearch]);

  if (loading) {
    return (
      <div className="p-12 text-center text-text-secondary flex flex-col items-center gap-3">
        <Loader2 className="animate-spin" />
        Loading verification workspace…
      </div>
    );
  }

  const processing =
    job && ["queued", "running", "retrying"].includes(job.status);
  const progress = verification?.progress;
  const completed = verification?.session?.status === "completed";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/contracts/${contractId}?tab=documents`)}
          className="text-text-secondary hover:text-white"
          aria-label="Back to repository"
        >
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title="Verification Workspace"
          subtitle="AI drafts stay immutable · Humans produce verified business data"
          actions={
            <div className="flex flex-wrap gap-2 items-center">
              <ExtractionStatusBadge
                status={
                  verification?.extractionStatus ||
                  verification?.session?.status ||
                  job?.status
                }
              />
              {unsavedNote && !completed && (
                <Badge variant="warn" size="sm">
                  Session has updates
                </Badge>
              )}
              {!extractionId && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={startExtraction}
                  disabled={starting}
                >
                  <Brain size={14} /> Start extraction
                </Button>
              )}
              {canVerify && extractionId && !completed && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={complete}
                  disabled={starting || !progress?.canComplete}
                  title={
                    progress?.canComplete
                      ? "Complete verification"
                      : "Review all fields first"
                  }
                >
                  <ShieldCheck size={14} /> Complete
                </Button>
              )}
              {canVerify && completed && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={reopen}
                  disabled={starting}
                >
                  <RefreshCw size={14} /> Reopen
                </Button>
              )}
            </div>
          }
        />
      </div>

      {!canVerify && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary">
          View-only: you can inspect drafts and verified values but cannot modify verification.
        </div>
      )}

      {error && (
        <div
          className="flex gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success" role="status">
          {success}
          <button type="button" className="ml-3 underline text-xs" onClick={() => setSuccess("")}>
            Dismiss
          </button>
        </div>
      )}

      {processing && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm" role="status">
          <Loader2 size={16} className="animate-spin text-primary" />
          Extraction {job.status}…
        </div>
      )}

      {progress && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex flex-wrap justify-between gap-2 text-xs text-text-secondary mb-2">
            <span>
              Progress: {progress.reviewed}/{progress.total} reviewed (
              {progress.percent}%)
            </span>
            <span>
              Accepted {progress.accepted} · Rejected {progress.rejected} · Draft{" "}
              {progress.draft}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {progress.requiredPending?.length > 0 && (
            <p className="text-xs text-warning mt-2">
              Required still draft: {progress.requiredPending.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left — PDF */}
        <section className="xl:col-span-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Original PDF
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPdf((v) => !v)}>
              {showPdf ? "Hide" : "Show"}
            </Button>
          </div>
          {showPdf ? (
            <PDFViewerPanel
              contractId={contractId}
              documentId={documentId}
              title="Legal source"
              onClose={() => setShowPdf(false)}
            />
          ) : (
            <Card>
              <p className="text-sm text-text-secondary">
                PDF is the legal source of truth.
              </p>
            </Card>
          )}
        </section>

        {/* Center — AI draft fields */}
        <section className="xl:col-span-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            AI draft fields
          </h3>

          {canVerify && extractionId && !completed && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={starting}
                onClick={() => bulk("accept_above_threshold")}
              >
                Accept ≥{Math.round(DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD * 100)}%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={starting}
                onClick={() => bulk("reject_all")}
              >
                Reject all
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1">
              <Search
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="search"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields…"
                className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="accepted">Accepted</option>
              <option value="edited">Edited</option>
              <option value="rejected">Rejected</option>
              <option value="verified">Verified</option>
            </select>
            <select
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              aria-label="Filter by confidence"
            >
              <option value="all">All confidence</option>
              <option value="high">High 95%+</option>
              <option value="medium">Medium 80–94%</option>
              <option value="low">Low &lt;80%</option>
            </select>
          </div>

          {!extractionId ? (
            <Card>
              <p className="text-sm text-text-secondary">
                Start extraction to generate AI draft fields for review.
              </p>
            </Card>
          ) : filteredFields.length === 0 ? (
            <Card>
              <p className="text-sm text-text-secondary">No fields match filters.</p>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filteredFields.map((field: any) => (
                <VerificationFieldCard
                  key={field.id}
                  field={field}
                  canVerify={canVerify}
                  disabled={completed}
                  busy={fieldBusy === field.fieldKey || starting}
                  onAccept={() => patchField(field.fieldKey, "accept")}
                  onReject={() => patchField(field.fieldKey, "reject")}
                  onEdit={(value) => patchField(field.fieldKey, "edit", value)}
                  onReset={() => patchField(field.fieldKey, "reset")}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right — Verified layer */}
        <section className="xl:col-span-3 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Verified values
          </h3>
          <Card>
            <p className="text-xs text-text-secondary mb-3">
              Trusted business data promoted on completion. AI drafts remain stored
              separately and are never overwritten.
            </p>
            {verification?.isDocumentVerified ? (
              <Badge variant="success" size="sm">
                Document verified (session v{verification.session?.version})
              </Badge>
            ) : (
              <Badge variant="warn" size="sm">
                Not verified — human review required
              </Badge>
            )}
          </Card>

          {(verification?.verifiedFields || []).length === 0 ? (
            <Card>
              <p className="text-sm text-text-secondary">
                No verified values yet. Complete verification to promote the layer.
              </p>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {verification.verifiedFields.map((v: any) => (
                <div
                  key={v.fieldKey}
                  className="rounded-xl border border-success/20 bg-success/5 p-3"
                >
                  <div className="flex justify-between gap-2 text-xs mb-1">
                    <span className="font-semibold uppercase text-text-secondary">
                      {v.fieldLabel}
                    </span>
                    <Badge variant="success" size="sm">
                      {v.decision}
                    </Badge>
                  </div>
                  <p className="text-sm text-white whitespace-pre-wrap break-words">
                    {v.verifiedValue ?? (
                      <span className="italic text-text-secondary">Rejected</span>
                    )}
                  </p>
                  {v.aiValue != null && String(v.aiValue) !== String(v.verifiedValue) && (
                    <p className="text-[11px] text-text-secondary mt-1">
                      AI was: {v.aiValue}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {(verification?.history || []).length > 0 && (
            <Card title="Recent history">
              <ul className="space-y-1.5 text-xs text-text-secondary max-h-40 overflow-y-auto">
                {verification.history.slice(0, 15).map((h: any) => (
                  <li key={h.id}>
                    <span className="text-white">{h.action}</span>
                    {h.fieldKey ? ` · ${h.fieldKey}` : ""}
                    <span className="block opacity-70">
                      {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
