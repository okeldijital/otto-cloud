"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props {
  contractId: string | number;
}

/**
 * Read-only Verified Contract domain view (Milestone 3.2).
 * Editing only via verification workspace.
 */
export default function VerifiedContractSection({ contractId }: Props) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const [vRes, hRes] = await Promise.all([
        api.get(`/contracts/${contractId}/verified`),
        api.get(`/contracts/${contractId}/verified/history`),
      ]);
      setVerified(vRes.data?.data?.verified ?? null);
      setHistory(hRes.data?.data ?? null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Unable to load verified contract."
      );
    } finally {
      setLoading(false);
    }
  }, [contractId]);

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
        <div className="text-sm text-text-secondary space-y-2">
          <p>
            No verified contract domain object yet. Complete human verification
            for a signed agreement to promote trusted business data.
          </p>
          <p className="text-xs">
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
