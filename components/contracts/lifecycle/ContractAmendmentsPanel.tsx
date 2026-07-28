"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props {
  contractId: string | number;
}

export default function ContractAmendmentsPanel({ contractId }: Props) {
  const [loading, setLoading] = useState(true);
  const [amendments, setAmendments] = useState<any[]>([]);
  const [canManage, setCanManage] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  const register = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post(`/contracts/${contractId}/amendments`, {
        amendmentNumber: number,
        effectiveDate: effectiveDate || null,
        reason: reason || null,
      });
      setSuccess("Amendment registered.");
      setNumber("");
      setEffectiveDate("");
      setReason("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to register amendment.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-text-secondary gap-2 items-center">
        <Loader2 className="animate-spin" size={18} /> Loading amendments…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      {canManage && (
        <Card title="Register amendment">
          <p className="text-xs text-text-secondary mb-3">
            Amendments are separate records. No document comparison in this milestone.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-text-secondary">
              Amendment number *
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="A-001"
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-xs text-text-secondary">
              Effective date
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="text-xs text-text-secondary">
              Reason
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>
          <div className="mt-3">
            <Button
              variant="primary"
              size="sm"
              disabled={saving || !number.trim()}
              onClick={register}
            >
              <Plus size={14} /> Register
            </Button>
          </div>
        </Card>
      )}

      <Card title="Amendments">
        {amendments.length === 0 ? (
          <p className="text-sm text-text-secondary">No amendments registered.</p>
        ) : (
          <ul className="space-y-2">
            {amendments.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-wrap justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white">
                      {a.amendmentNumber}
                    </span>
                    <Badge variant="warn" size="sm">
                      {a.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Effective {a.effectiveDate || "—"}
                    {a.reason ? ` · ${a.reason}` : ""}
                    {a.linkedVerifiedVersion != null
                      ? ` · linked verified v${a.linkedVerifiedVersion}`
                      : ""}
                  </p>
                </div>
                <span className="text-xs text-text-secondary">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
