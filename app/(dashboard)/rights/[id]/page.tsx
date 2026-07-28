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

export default function RightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [right, setRight] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError("");
      const [r, t] = await Promise.all([
        api.get(`/rights/${id}`),
        api.get(`/rights/${id}/timeline`),
      ]);
      setRight(r.data?.data?.right || null);
      setCanManage(!!r.data?.data?.permissions?.canManage);
      setTimeline(t.data?.data?.timeline || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load right");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async () => {
    if (!right) return;
    try {
      setSaving(true);
      await api.patch(`/rights/${right.id}`, { status: "active" });
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

  if (!right) {
    return (
      <div className="py-16 text-center text-text-secondary">
        {error || "Right not found"}
        <div className="mt-4">
          <Link href="/rights">
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/rights"
          className="text-text-secondary hover:text-white"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{right.title}</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {right.categoryLabel} · v{right.version}
          </p>
        </div>
        <Badge variant="primary">{right.status}</Badge>
      </div>

      {error && (
        <div className="text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-white">Details</h2>
          {right.description && (
            <p className="text-sm text-text-secondary">{right.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-text-secondary">Effective</span>
              <p className="text-white">{right.effectiveDate || "—"}</p>
            </div>
            <div>
              <span className="text-text-secondary">Expiration</span>
              <p className="text-white">{right.expirationDate || "—"}</p>
            </div>
            <div>
              <span className="text-text-secondary">Exclusive</span>
              <p className="text-white">{right.exclusive ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="text-text-secondary">Owner</span>
              <p className="text-white">{right.ownerName || "—"}</p>
            </div>
          </div>

          {right.parties?.length > 0 && (
            <div>
              <h3 className="text-xs text-text-secondary mb-1">Parties</h3>
              <p className="text-sm text-white">
                {right.parties.map((p: any) => p.name).join(", ")}
              </p>
            </div>
          )}
          {right.territories?.length > 0 && (
            <div>
              <h3 className="text-xs text-text-secondary mb-1">Territories</h3>
              <p className="text-sm text-white">
                {right.territories.map((t: any) => t.name).join(", ")}
              </p>
            </div>
          )}
          {right.restrictions?.length > 0 && (
            <div>
              <h3 className="text-xs text-text-secondary mb-1">Restrictions</h3>
              <ul className="text-sm text-white space-y-1">
                {right.restrictions.map((r: any) => (
                  <li key={r.id}>
                    {r.restrictionType}: {r.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canManage && right.status === "approved" && (
            <Button size="sm" disabled={saving} onClick={activate}>
              Activate right
            </Button>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Provenance</h2>
          <div className="text-xs space-y-2 text-text-secondary">
            {right.contractId != null && (
              <p>
                Contract{" "}
                <Link
                  href={`/contracts/${right.contractId}`}
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  #{right.contractId} <ExternalLink size={10} />
                </Link>
              </p>
            )}
            {right.verifiedVersion != null && (
              <p>Verified version {right.verifiedVersion}</p>
            )}
            {right.verifiedContractId && (
              <p className="font-mono break-all">
                VC {right.verifiedContractId}
              </p>
            )}
            {right.clauseReference && <p>Clause: {right.clauseReference}</p>}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-text-secondary">No entries</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-auto">
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
                <p className="text-xs text-text-secondary">{e.entryType}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
