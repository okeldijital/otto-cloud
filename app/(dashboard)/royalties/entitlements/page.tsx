"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

const STATUS_VARIANT: Record<string, string> = {
  active: "success",
  approved: "primary",
  suspended: "warn",
  expired: "critical",
  terminated: "critical",
  archived: "ghost",
};

export default function EntitlementsRegistryPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [listRes, dashRes] = await Promise.all([
        api.get("/royalties/entitlements?limit=50"),
        api.get("/royalties/dashboard"),
      ]);
      setItems(listRes.data?.data?.items || []);
      setDashboard(dashRes.data?.data?.dashboard || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load entitlements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const search = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/royalties/entitlements/search?q=${encodeURIComponent(q)}`
      );
      setItems(res.data?.data?.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-accent" /> Royalty Entitlements
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Financial participation from approved Rights — not calculations
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/royalties/review">
            <Button variant="secondary" size="sm">
              Review queue
            </Button>
          </Link>
          <Link href="/royalties">
            <Button variant="secondary" size="sm">
              Legacy statements
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            ["Pending reviews", dashboard.pendingReviews],
            ["Active", dashboard.active],
            ["Expiring", dashboard.expiring],
            ["Beneficiaries", dashboard.beneficiaries],
            ["Territories", dashboard.territories],
            ["Recently approved", dashboard.recentlyApproved],
          ].map(([label, value]) => (
            <Card key={String(label)} className="p-4">
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-2xl font-bold text-white">{value ?? 0}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search entitlements…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
          />
        </div>
        <Button size="sm" onClick={search}>
          Search
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-text-secondary gap-2 text-sm">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-text-secondary">
          No entitlements yet. Promote from an approved Right, then review.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <Link key={e.id} href={`/royalties/entitlements/${e.id}`}>
              <Card className="p-4 hover:border-accent/30 transition-colors">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="text-white font-medium">{e.title}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {e.revenueCategoryLabel || e.revenueCategory}
                      {e.rightId ? ` · Right ${e.rightId.slice(0, 8)}…` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={(STATUS_VARIANT[e.status] || "neutral") as any}
                  >
                    {e.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
