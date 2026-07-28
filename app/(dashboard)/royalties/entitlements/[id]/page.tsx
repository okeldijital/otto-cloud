"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

export default function EntitlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [provenance, setProvenance] = useState<any>(null);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError("");
      const [e, t, p] = await Promise.all([
        api.get(`/royalties/entitlements/${id}`),
        api.get(`/royalties/entitlements/${id}/timeline`),
        api.get(`/royalties/entitlements/${id}/provenance`),
      ]);
      setEntitlement(e.data?.data?.entitlement || null);
      setCanManage(!!e.data?.data?.permissions?.canManage);
      setTimeline(t.data?.data?.timeline || []);
      setProvenance(p.data?.data?.provenance || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load entitlement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async () => {
    if (!entitlement) return;
    try {
      setSaving(true);
      await api.patch(`/royalties/entitlements/${entitlement.id}`, {
        status: "active",
      });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-text-secondary gap-2 text-sm">
        <Loader2 className="animate-spin" size={18} /> Loading…
      </div>
    );
  }

  if (!entitlement) {
    return (
      <div className="py-16 text-center text-text-secondary">
        {error || "Not found"}
        <div className="mt-4">
          <Link href="/royalties/entitlements">
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const allocation = entitlement.allocations?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/royalties/entitlements"
          className="text-text-secondary hover:text-white"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{entitlement.title}</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {entitlement.revenueCategoryLabel} · v{entitlement.version}
          </p>
        </div>
        <Badge variant="primary">{entitlement.status}</Badge>
      </div>

      {error && (
        <div className="text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-white">Allocation</h2>
          {allocation ? (
            <div className="text-sm space-y-2">
              <p className="text-text-secondary">
                {allocation.allocationType} · {allocation.splitType}
              </p>
              <ul className="space-y-1">
                {(allocation.shares || []).map((s: any) => (
                  <li key={s.id} className="flex justify-between text-white">
                    <span>{s.beneficiaryName}</span>
                    <span>{s.sharePercent}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No allocation</p>
          )}

          {entitlement.beneficiaries?.length > 0 && (
            <div>
              <h3 className="text-xs text-text-secondary mb-1">Beneficiaries</h3>
              <p className="text-sm text-white">
                {entitlement.beneficiaries.map((b: any) => b.name).join(", ")}
              </p>
            </div>
          )}

          {entitlement.restrictions?.length > 0 && (
            <div>
              <h3 className="text-xs text-text-secondary mb-1">Restrictions</h3>
              <ul className="text-sm text-white space-y-1">
                {entitlement.restrictions.map((r: any) => (
                  <li key={r.id}>
                    {r.restrictionType}: {r.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canManage && entitlement.status === "approved" && (
            <Button size="sm" disabled={saving} onClick={activate}>
              Activate entitlement
            </Button>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Provenance</h2>
          <div className="text-xs space-y-2 text-text-secondary">
            <p>
              Right{" "}
              <Link
                href={`/rights/${entitlement.rightId}`}
                className="text-accent hover:underline inline-flex items-center gap-1"
              >
                open <ExternalLink size={10} />
              </Link>
            </p>
            {provenance?.right && (
              <p>
                {provenance.right.title} · {provenance.right.status}
              </p>
            )}
            {entitlement.contractId != null && (
              <p>
                Contract{" "}
                <Link
                  href={`/contracts/${entitlement.contractId}`}
                  className="text-accent hover:underline"
                >
                  #{entitlement.contractId}
                </Link>
              </p>
            )}
            {entitlement.verifiedVersion != null && (
              <p>Verified v{entitlement.verifiedVersion}</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-text-secondary">No entries</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-auto">
            {timeline.map((e) => (
              <li
                key={e.id}
                className="text-sm border-b border-white/5 pb-2 last:border-0"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-white">{e.title}</span>
                  <span className="text-xs text-text-secondary">
                    {e.occurredAt
                      ? new Date(e.occurredAt).toLocaleString()
                      : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
