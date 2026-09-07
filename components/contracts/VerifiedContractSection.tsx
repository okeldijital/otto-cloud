"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props {
  contractId: string | number;
}

type ReviewItem = {
  documentId: string;
  filename: string;
  extractionId: string;
};

/**
 * Read-only Verified Contract domain view (Milestone 3.2).
 * Editing only via verification workspace.
 *
 * When no verified contract exists yet, this tab also surfaces the persisted
 * workflow state so users are never left with an ambiguous empty state.
 */
export default function VerifiedContractSection({ contractId }: Props) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [reviewItem, setReviewItem] = useState<ReviewItem | null>(null);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const loadReviewState = useCallback(async () => {
    try {
      const docsRes = await api.get(
        `/contracts/${contractId}/documents?includeDeleted=false`
      );
      const docs = docsRes.data?.data?.items ?? docsRes.data?.items ?? [];
      const activeDocs = Array.isArray(docs)
        ? docs.filter((d: any) => d?.document?.status === "active")
        : [];

      for (const item of activeDocs) {
        try {
          const res = await api.get(
            `/contracts/${contractId}/documents/${item.document.id}/extractions`
          );
          const data = res.data?.data;
          if (data?.extractionId && data?.extractionStatus === "awaiting_verification") {
            setReviewItem({
              documentId: item.document.id,
              filename: item.document.originalFilename,
              extractionId: data.extractionId,
            });
            return;
          }
        } catch {
          // A document without an available extraction is not a review handoff.
        }
      }
      setReviewItem(null);
    } catch {
      setReviewItem(null);
    }
  }, [contractId]);

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const [vRes, hRes] = await Promise.all([
        api.get(`/contracts/${contractId}/verified`),
        api.get(`/contracts/${contractId}/verified/history`),
      ]);
      const nextVerified = vRes.data?.data?.verified ?? null;
      setVerified(nextVerified);
      setHistory(hRes.data?.data ?? null);
      if (!nextVerified) await loadReviewState();
      else setReviewItem(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Unable to load verified contract."
      );
    } finally {
      setLoading(false);
    }
  }, [contractId, loadReviewState]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-sm text-text-secondary py-6 justify-center">
          <Loader2 className="animate-spin" size={16} /> Loading verified contract…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-danger">{error}</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => load()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!verified) {
    return (
      <Card title="Verified Contract">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-10 h-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileCheck2 size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={reviewItem ? "warn" : "neutral"} size="sm">
                  {reviewItem ? "Review required" : "Not verified"}
                </Badge>
              </div>
              <h3 className="text-base font-semibold text-white mt-2">
                {reviewItem
                  ? "Extraction is complete. Human verification is the next step."
                  : "No verified contract has been promoted yet."}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {reviewItem
                  ? "Review the extracted fields against the signed PDF, correct or reject anything inaccurate, then complete verification. Only the verified layer is available to downstream modules."
                  : "Complete human verification for a signed agreement to promote trusted business data."}
              </p>
            </div>
          </div>

          {reviewItem && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary font-semibold">
                  Next action
                </p>
                <p className="text-sm text-white mt-1">Review {reviewItem.filename}</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  window.location.href =
                    `/contracts/${contractId}/verification?document_id=${encodeURIComponent(reviewItem.documentId)}&extraction_id=${encodeURIComponent(reviewItem.extractionId)}`;
                }}
              >
                Open verification
                <ArrowRight size={14} />
              </Button>
            </div>
          )}

          <p className="text-xs text-text-secondary">
            Downstream modules (Releases, Rights, Royalties, Reporting) consume this
            surface only — never raw AI drafts.
          </p>
        </div>
      </Card>
    );
  }

  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "Title", value: verified.title },
    { label: "Type", value: verified.documentType },
    { label: "Reference", value: verified.referenceNumber },
    { label: "Effective", value: verified.effectiveDateText },
    { label: "Expiration", value: verified.expirationDateText },
    { label: "Territory", value: verified.territorySummary },
    { label: "Currency", value: verified.currency },
    { label: "Term", value: verified.termSummary },
    { label: "Governing law", value: verified.governingLaw },
    { label: "Rights", value: verified.rightsSummary },
    { label: "Obligations", value: verified.obligationsSummary },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Verified Contract"
        headerAction={
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">
              <ShieldCheck size={12} className="mr-1 inline" />
              v{verified.version} current
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? "Hide history" : "History"}
            </Button>
          </div>
        }
      >
        <p className="text-xs text-text-secondary mb-4">
          Read-only domain view · Legal source remains the PDF · Edit only in verification
          workspace
        </p>
        <dl className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-white/5 pb-2"
            >
              <dt className="text-xs text-text-secondary uppercase tracking-wide">
                {r.label}
              </dt>
              <dd className="text-sm text-white sm:text-right max-w-xl whitespace-pre-wrap break-words">
                {r.value || "—"}
              </dd>
            </div>
          ))}
        </dl>

        {verified.parties?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase text-text-secondary mb-2">
              Parties
            </h4>
            <ul className="space-y-1">
              {verified.parties.map((p: any) => (
                <li key={p.id} className="text-sm text-white">
                  {p.name}
                  {p.role ? (
                    <span className="text-text-secondary"> · {p.role}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 text-[11px] text-text-secondary font-mono space-y-0.5">
          <div>Session: {verified.verificationSessionId}</div>
          <div>Extraction: {verified.extractionId}</div>
          <div>Document: {verified.documentId}</div>
          <div>
            Promoted:{" "}
            {verified.promotedAt
              ? new Date(verified.promotedAt).toLocaleString()
              : "—"}{" "}
            by user #{verified.promotedBy ?? "—"}
          </div>
        </div>
      </Card>

      {showHistory && history && (
        <Card title="Verified version history">
          <ul className="space-y-2 text-sm">
            {(history.versions || []).map((v: any) => (
              <li
                key={v.id}
                className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-2"
              >
                <span>
                  v{v.version} {v.isCurrent ? "(current)" : ""} — {v.title || "Untitled"}
                </span>
                <span className="text-xs text-text-secondary">
                  {v.promotedAt ? new Date(v.promotedAt).toLocaleString() : ""}
                </span>
              </li>
            ))}
          </ul>
          {(history.events || []).length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs uppercase text-text-secondary mb-2">
                Domain events
              </h4>
              <ul className="space-y-1 text-xs text-text-secondary">
                {history.events.slice(0, 20).map((e: any) => (
                  <li key={e.id}>
                    <span className="text-white">{e.eventType}</span> ·{" "}
                    {e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
