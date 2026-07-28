"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import {
  LIFECYCLE_STATUS_LABELS,
  KEY_DATE_TYPES,
  KEY_DATE_LABELS,
} from "@/lib/contract-lifecycle/constants";

interface Props {
  contractId: string | number;
}

const STATUS_VARIANT: Record<string, string> = {
  draft: "neutral",
  pending_verification: "warn",
  verified: "primary",
  active: "success",
  pending_renewal: "warn",
  expired: "critical",
  terminated: "critical",
  superseded: "neutral",
  archived: "ghost",
};

export default function ContractLifecyclePanel({ contractId }: Props) {
  const [loading, setLoading] = useState(true);
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [canManage, setCanManage] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [intervalMonths, setIntervalMonths] = useState("");
  const [noticeDays, setNoticeDays] = useState("");
  const [notes, setNotes] = useState("");
  const [dateEdits, setDateEdits] = useState<Record<string, string>>({});
  const [supersedesId, setSupersedesId] = useState("");
  const [supersessionReason, setSupersessionReason] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.get(`/contracts/${contractId}/lifecycle`);
      const lc = res.data?.data?.lifecycle;
      setLifecycle(lc);
      setCanManage(res.data?.data?.permissions?.canManage !== false);
      if (lc) {
        setStatus(lc.status);
        setAutoRenew(!!lc.autoRenew);
        setIntervalMonths(
          lc.renewalIntervalMonths != null ? String(lc.renewalIntervalMonths) : ""
        );
        setNoticeDays(
          lc.noticePeriodDays != null ? String(lc.noticePeriodDays) : ""
        );
        setNotes(lc.notes || "");
        const de: Record<string, string> = {};
        for (const d of lc.keyDates || []) {
          de[d.dateType] = d.dateValue || "";
        }
        setDateEdits(de);
        setSupersedesId(
          lc.supersedesContractId != null ? String(lc.supersedesContractId) : ""
        );
        setSupersessionReason(lc.supersessionReason || "");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load lifecycle.");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (extra?: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    try {
      const keyDates = Object.entries(dateEdits)
        .filter(([, v]) => v)
        .map(([dateType, dateValue]) => ({ dateType, dateValue }));

      const body: any = {
        status,
        autoRenew,
        renewalIntervalMonths: intervalMonths
          ? parseInt(intervalMonths, 10)
          : null,
        noticePeriodDays: noticeDays ? parseInt(noticeDays, 10) : null,
        notes,
        keyDates,
        ...extra,
      };
      if (supersedesId) {
        body.supersedesContractId = parseInt(supersedesId, 10);
        body.supersessionReason = supersessionReason || null;
      }

      const res = await api.patch(`/contracts/${contractId}/lifecycle`, body);
      setLifecycle(res.data?.data?.lifecycle);
      setSuccess("Lifecycle updated.");
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (Array.isArray(err?.response?.data?.errors)
            ? err.response.data.errors.join(", ")
            : "Unable to update lifecycle.")
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-text-secondary gap-2 items-center">
        <Loader2 className="animate-spin" size={18} /> Loading lifecycle…
      </div>
    );
  }

  if (!lifecycle) {
    return (
      <Card>
        <p className="text-sm text-danger">{error || "Lifecycle unavailable."}</p>
      </Card>
    );
  }

  const transitions: string[] = lifecycle.allowedTransitions || [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
          <button type="button" className="ml-3 underline text-xs" onClick={() => setSuccess("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Current status">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge
              variant={(STATUS_VARIANT[lifecycle.status] || "neutral") as any}
              size="md"
            >
              {lifecycle.statusLabel || lifecycle.status}
            </Badge>
            {lifecycle.previousStatus && (
              <span className="text-xs text-text-secondary">
                was {LIFECYCLE_STATUS_LABELS[lifecycle.previousStatus as keyof typeof LIFECYCLE_STATUS_LABELS] || lifecycle.previousStatus}
              </span>
            )}
          </div>

          {canManage ? (
            <div className="space-y-3">
              <label className="block text-xs text-text-secondary">
                Transition to
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value={lifecycle.status}>
                    {lifecycle.statusLabel} (current)
                  </option>
                  {transitions.map((t) => (
                    <option key={t} value={t}>
                      {LIFECYCLE_STATUS_LABELS[t as keyof typeof LIFECYCLE_STATUS_LABELS] || t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-text-secondary">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white min-h-[72px]"
                />
              </label>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">View-only access.</p>
          )}
        </Card>

        <Card title="Renewal">
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2 text-text-secondary">
              <input
                type="checkbox"
                checked={autoRenew}
                disabled={!canManage}
                onChange={(e) => setAutoRenew(e.target.checked)}
              />
              Auto-renew flag (no automatic execution)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-text-secondary">
                Interval (months)
                <input
                  type="number"
                  min={0}
                  value={intervalMonths}
                  disabled={!canManage}
                  onChange={(e) => setIntervalMonths(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
                />
              </label>
              <label className="text-xs text-text-secondary">
                Notice period (days)
                <input
                  type="number"
                  min={0}
                  value={noticeDays}
                  disabled={!canManage}
                  onChange={(e) => setNoticeDays(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
                />
              </label>
            </div>
            <p className="text-xs text-text-secondary">
              Renewal status: <strong className="text-white">{lifecycle.renewalStatus}</strong>
            </p>
            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={() => save({ markRenewed: true })}
              >
                <RefreshCw size={14} /> Record manual renewal
              </Button>
            )}
            {(lifecycle.renewals || []).length > 0 && (
              <ul className="text-xs text-text-secondary space-y-1 max-h-28 overflow-y-auto">
                {lifecycle.renewals.map((r: any) => (
                  <li key={r.id}>
                    {r.status} · completed {r.completedDate || "—"} · scheduled{" "}
                    {r.scheduledDate || "—"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card title="Key dates">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {KEY_DATE_TYPES.map((t) => (
            <label key={t} className="text-xs text-text-secondary">
              {KEY_DATE_LABELS[t]}
              <input
                type="date"
                value={dateEdits[t] || ""}
                disabled={!canManage}
                onChange={(e) =>
                  setDateEdits((prev) => ({ ...prev, [t]: e.target.value }))
                }
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              />
            </label>
          ))}
        </div>
        {lifecycle.upcomingDates?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs uppercase text-text-secondary mb-2">Upcoming</h4>
            <ul className="text-sm space-y-1">
              {lifecycle.upcomingDates.map((d: any) => (
                <li key={d.dateType} className="text-white">
                  {d.dateTypeLabel}: {d.dateValue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="Supersession">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-text-secondary">
            This contract supersedes contract ID
            <input
              type="number"
              value={supersedesId}
              disabled={!canManage}
              onChange={(e) => setSupersedesId(e.target.value)}
              placeholder="e.g. 12"
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="text-xs text-text-secondary">
            Reason
            <input
              type="text"
              value={supersessionReason}
              disabled={!canManage}
              onChange={(e) => setSupersessionReason(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
            />
          </label>
        </div>
        {lifecycle.supersededByContractId && (
          <p className="text-sm text-warning mt-3">
            This contract was superseded by #{lifecycle.supersededByContractId}
            {lifecycle.supersessionReason ? ` — ${lifecycle.supersessionReason}` : ""}
          </p>
        )}
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => save()} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save lifecycle
          </Button>
        </div>
      )}
    </div>
  );
}
