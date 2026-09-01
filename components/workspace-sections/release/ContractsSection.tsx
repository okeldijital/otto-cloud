"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  HeartPulse,
  History,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import type { SectionProps } from "@/lib/workspace-engine";

const HEALTH_VARIANT: Record<string, string> = {
  healthy: "success",
  warning: "warn",
  critical: "critical",
};

const LC_VARIANT: Record<string, string> = {
  active: "success",
  verified: "primary",
  pending_renewal: "warn",
  expired: "critical",
  terminated: "critical",
  superseded: "neutral",
  archived: "ghost",
  draft: "neutral",
  pending_verification: "warn",
};

/**
 * Release Workspace — Contracts panel.
 * Reads contract projections and permits explicit user-managed Contract linkage.
 * No extraction or catalogue inference occurs here.
 */
export default function ContractsSection({ workspace, onRefresh }: SectionProps) {
  const releaseId =
    workspace?.release_id ||
    workspace?.release?.id ||
    workspace?.entity_id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [tab, setTab] = useState<"contracts" | "timeline" | "health">(
    "contracts"
  );

  const load = useCallback(
    async (refresh = false) => {
      if (!releaseId) {
        setError("Release id not available on workspace");
        setLoading(false);
        return;
      }
      try {
        setError("");
        const q = refresh ? "?refresh=1" : "";
        const [sumRes, tlRes] = await Promise.all([
          api.get(`/releases/${releaseId}/contracts/summary${q}`),
          api.get(`/releases/${releaseId}/contracts/timeline?limit=40`),
        ]);
        setSummary(sumRes.data?.data?.summary || null);
        setTimeline(tlRes.data?.data?.timeline || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Unable to load contract projections"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [releaseId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const linkExistingContract = async () => {
    if (!releaseId || linking) return;
    const raw = window.prompt("Enter the existing OTTO Contract ID to link to this release:");
    if (!raw?.trim()) return;
    const contractId = Number(raw.trim());
    if (!Number.isInteger(contractId) || contractId <= 0) {
      setError("Enter a valid Contract ID.");
      return;
    }

    setLinking(true);
    setError("");
    try {
      await api.post(`/releases/${releaseId}/contracts`, { contractId });
      await load(true);
      onRefresh?.();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to link contract to release"
      );
    } finally {
      setLinking(false);
    }
  };

  const health = summary?.health;
  const contracts = summary?.contracts || [];
  const counts = summary?.counts || {};
  const upcoming = summary?.upcomingDates || [];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-secondary text-sm py-12 justify-center">
        <Loader2 className="animate-spin" size={18} /> Loading contracts…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText size={20} className="text-accent" /> Contracts
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Contract catalogue context for this release · user-managed links
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={linking}
            onClick={linkExistingContract}
          >
            {linking ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Link Contract
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              load(true);
              onRefresh?.();
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh projection
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Linked</p>
          <p className="text-2xl font-bold text-white">{counts.linked ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Health</p>
          <div className="mt-1">
            <Badge variant={(HEALTH_VARIANT[health?.status] || "neutral") as any}>
              {health?.status || "—"}
            </Badge>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Expiring soon</p>
          <p className="text-2xl font-bold text-white">{counts.expiringSoon ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Pending renewal</p>
          <p className="text-2xl font-bold text-white">{counts.pendingRenewal ?? 0}</p>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-2">
        {(
          [
            ["contracts", "Linked contracts"],
            ["health", "Health"],
            ["timeline", "Timeline"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              tab === k
                ? "bg-accent/20 text-white"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "contracts" && (
        <div className="space-y-3">
          {contracts.length === 0 ? (
            <Card className="p-8 text-center text-sm text-text-secondary">
              No contracts linked to this release.
              <p className="mt-2 text-xs">
                Use <span className="text-white">Link Contract</span> to attach an existing OTTO contract.
              </p>
            </Card>
          ) : (
            contracts.map((c: any) => (
              <Card key={c.id || c.contractId} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-white font-medium">
                      {c.contractTitle || `Contract #${c.contractId}`}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      #{c.contractId}
                      {c.relationshipType ? ` · ${c.relationshipType}` : ""}
                      {c.verifiedVersion != null ? ` · verified v${c.verifiedVersion}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={(HEALTH_VARIANT[c.healthStatus] || "neutral") as any}>
                      {c.healthStatus}
                    </Badge>
                    {c.lifecycleStatus && (
                      <Badge variant={(LC_VARIANT[c.lifecycleStatus] || "neutral") as any}>
                        {c.lifecycleStatus}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-text-secondary">Effective</span><p className="text-white">{c.effectiveDate || "—"}</p></div>
                  <div><span className="text-text-secondary">Expiration</span><p className="text-white">{c.expirationDate || "—"}</p></div>
                  <div><span className="text-text-secondary">Renewal</span><p className="text-white">{c.renewalDate || "—"}</p></div>
                  <div><span className="text-text-secondary">Last verified</span><p className="text-white">{c.lastVerifiedAt ? new Date(c.lastVerifiedAt).toLocaleDateString() : "—"}</p></div>
                </div>

                {c.parties?.length > 0 && (
                  <p className="text-xs text-text-secondary">
                    Parties: {c.parties.map((p: any) => p.name).filter(Boolean).join(", ")}
                  </p>
                )}

                {c.rightsSummary && (
                  <p className="text-xs text-text-secondary line-clamp-2">Rights: {c.rightsSummary}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/contracts/${c.contractId}`} className="inline-flex items-center gap-1 text-xs text-accent hover:underline"><ExternalLink size={12} /> Open Contract</Link>
                  <Link href={`/contracts/${c.contractId}?tab=timeline`} className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-white"><History size={12} /> View Timeline</Link>
                  <Link href={`/contracts/${c.contractId}?tab=relationships`} className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-white"><FileText size={12} /> View Relationship</Link>
                </div>
              </Card>
            ))
          )}

          {upcoming.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-white mb-2">Upcoming dates</h4>
              <ul className="space-y-1.5">
                {upcoming.map((d: any, i: number) => (
                  <li key={`${d.contractId}-${d.dateType}-${i}`} className="text-xs flex justify-between gap-2 text-text-secondary">
                    <span>{d.dateType} · {d.contractTitle || `#${d.contractId}`}</span>
                    <span className="text-white">{d.dateValue}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "health" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HeartPulse size={18} className="text-accent" />
            <h3 className="text-white font-medium">Contract health</h3>
            <Badge variant={(HEALTH_VARIANT[health?.status] || "neutral") as any}>{health?.status || "—"}</Badge>
          </div>
          <ul className="space-y-2">
            {(health?.reasons || []).map((r: string, i: number) => (
              <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                {health?.status === "critical" ? <ShieldAlert size={14} className="text-red-400 mt-0.5" /> : health?.status === "warning" ? <AlertTriangle size={14} className="text-amber-400 mt-0.5" /> : <CheckCircle2 size={14} className="text-emerald-400 mt-0.5" />}
                {r}
              </li>
            ))}
          </ul>
          <div className="space-y-2 pt-2 border-t border-white/5">
            {contracts.map((c: any) => (
              <div key={c.contractId} className="flex justify-between text-xs gap-2">
                <span className="text-white truncate">{c.contractTitle || `#${c.contractId}`}</span>
                <Badge variant={(HEALTH_VARIANT[c.healthStatus] || "neutral") as any}>{c.healthStatus}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "timeline" && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><History size={16} /> Unified timeline</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-text-secondary">No timeline entries yet.</p>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-auto">
              {timeline.map((e) => (
                <li key={e.id} className="border-b border-white/5 pb-2 last:border-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-white">{e.title}</span>
                    <span className="text-xs text-text-secondary shrink-0">{e.occurredAt ? new Date(e.occurredAt).toLocaleString() : ""}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{e.entryType}{e.isContractEvent ? " · contract event" : ""}{e.contractId != null ? ` · #${e.contractId}` : ""}</p>
                  {e.description && <p className="text-xs text-text-secondary mt-1">{e.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
