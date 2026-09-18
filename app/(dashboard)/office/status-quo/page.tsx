"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, RefreshCw, Search, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

type QueueItem = {
  id: string;
  severity: "critical" | "warning";
  entityType: string;
  entityId: string;
  entityTitle: string;
  issueType: string;
  summary: string;
  href: string;
};

type QueueSummary = {
  total: number;
  critical: number;
  warning: number;
  entities: number;
};

const ISSUE_LABELS: Record<string, string> = {
  "release.missing_tracks": "Missing tracks",
  "release.missing_artists": "Missing artists",
  "release.missing_contract": "Missing contract",
  "track.unassigned_release": "Unassigned release",
  "contract.unlinked": "Unlinked contract",
};

const SEVERITY_VARIANTS = {
  critical: "critical",
  warning: "warn",
} as const;

export default function OfficeStatusQuoPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState<QueueSummary>({ total: 0, critical: 0, warning: 0, entities: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severity, setSeverity] = useState<"all" | "critical" | "warning">("all");
  const [entityType, setEntityType] = useState("all");
  const [query, setQuery] = useState("");

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await api.get("/office/status-quo");
      setItems(response.data?.items || []);
      setSummary(response.data?.summary || { total: 0, critical: 0, warning: 0, entities: 0 });
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load the status queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchQueue();
  }, []);

  const entityTypes = useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.entityType)))],
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (severity !== "all" && item.severity !== severity) return false;
      if (entityType !== "all" && item.entityType !== entityType) return false;
      if (!q) return true;
      return [
        item.entityTitle,
        item.entityType,
        item.entityId,
        item.summary,
        ISSUE_LABELS[item.issueType] || item.issueType,
      ].some((value) => value.toLowerCase().includes(q));
    });
  }, [items, severity, entityType, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Status Queue"
        subtitle="Derived operational issues that require a relationship or completeness correction."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void fetchQueue()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[180px] items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-danger/30 bg-danger/10 text-danger">
              <ShieldAlert size={17} />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none text-text-primary">{summary.total}</p>
              <p className="mt-1 text-xs text-text-secondary">Open issues</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <button
            type="button"
            onClick={() => setSeverity("critical")}
            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
              severity === "critical" ? "border-danger/40 bg-danger/10 text-danger" : "border-border text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            }`}
          >
            {summary.critical} blocking
          </button>
          <button
            type="button"
            onClick={() => setSeverity("warning")}
            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
              severity === "warning" ? "border-warning/40 bg-warning/10 text-warning" : "border-border text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            }`}
          >
            {summary.warning} warnings
          </button>
          <button
            type="button"
            onClick={() => setSeverity("all")}
            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
              severity === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            }`}
          >
            {summary.entities} entities affected
          </button>
        </div>
      </Card>

      <Card noPadding>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <select
            className="input w-auto"
            aria-label="Filter status queue by entity"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "Entity: All" : type}
              </option>
            ))}
          </select>
          <div className="ml-auto flex min-w-[260px] items-center gap-2">
            <Search size={15} className="text-text-secondary" />
            <input
              className="input w-full"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search issues, entities..."
              aria-label="Search status queue"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Evaluating relationship integrity…</div>
        ) : error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert size={28} className="mx-auto mb-3 text-success" />
            <h2 className="text-base font-semibold text-text-primary">No outstanding issues</h2>
            <p className="mt-1 text-sm text-text-secondary">
              The queue is derived from current relationships; fixing the source record removes the issue automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="p-4 font-semibold">Issue</th>
                  <th className="p-4 font-semibold">Entity</th>
                  <th className="p-4 font-semibold">Severity</th>
                  <th className="p-4 font-semibold">Relationship state</th>
                  <th className="p-4 font-semibold"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-border transition-colors hover:bg-surface-elevated">
                    <td className="p-4">
                      <p className="text-sm font-medium text-text-primary">
                        {ISSUE_LABELS[item.issueType] || item.issueType}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">{item.summary}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-text-primary">{item.entityTitle}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-secondary">
                        {item.entityType} #{item.entityId}
                      </p>
                    </td>
                    <td className="p-4">
                      <Badge variant={SEVERITY_VARIANTS[item.severity]} size="sm">
                        {item.severity === "critical" ? "Blocking" : "Warning"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <AlertTriangle size={14} className={item.severity === "critical" ? "text-danger" : "text-warning"} />
                        Requires source relationship update
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <a href={item.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                        Open entity
                        <ArrowUpRight size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
