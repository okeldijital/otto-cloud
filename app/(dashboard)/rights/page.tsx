"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileCheck, Loader2, RefreshCw, Scale, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

const STATUS_VARIANT: Record<string, string> = {
  active: "success", approved: "primary", pending_review: "warn", candidate: "neutral",
  suspended: "warn", expired: "critical", terminated: "critical", superseded: "neutral", archived: "ghost",
};

export default function RightsRegistryPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [listRes, dashRes] = await Promise.all([
        status ? api.get(`/rights?status=${encodeURIComponent(status)}&limit=50`) : api.get("/rights?limit=50"),
        api.get("/rights/dashboard"),
      ]);
      setItems(listRes.data?.data?.items || []);
      setDashboard(dashRes.data?.data?.dashboard || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load rights");
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const search = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rights/search?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`);
      setItems(res.data?.data?.items || []);
    } catch (err: any) { setError(err?.response?.data?.message || "Search failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><Scale className="text-accent" /> Rights Registry</h1>
          <p className="text-sm text-text-secondary mt-1">Operational rights derived from verified contracts — not legal evidence</p>
        </div>
        <div className="flex gap-2">
          <Link href="/rights/review"><Button size="sm"><FileCheck size={14} /> Review queue</Button></Link>
          <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCw size={14} /> Refresh</Button>
        </div>
      </div>

      {dashboard && <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[["Total", dashboard.total], ["Pending review", dashboard.pendingReview], ["Expiring", dashboard.expiring], ["Exclusive", dashboard.exclusive], ["Territories", dashboard.territories], ["Recently active", dashboard.recentlyActivated]].map(([label, value]) => (
          <Card key={String(label)} className="p-4"><p className="text-xs text-text-secondary">{label}</p><p className="text-2xl font-bold text-text-primary">{value ?? 0}</p></Card>
        ))}
      </div>}

      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" /><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search title, owner, category…" className="input w-full pl-9" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto appearance-none bg-white text-black border-border focus:border-accent focus:ring-2 focus:ring-accent/20">
          <option value="" className="bg-black text-white">All statuses</option>
          {["active", "approved", "suspended", "expired", "terminated", "archived"].map((s) => <option key={s} value={s} className="bg-black text-white">{s}</option>)}
        </select>
        <Button size="sm" onClick={search}>Search</Button>
      </div>

      {error && <div className="text-sm text-danger flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}
      {loading ? <div className="flex justify-center py-16 text-text-secondary text-sm gap-2"><Loader2 className="animate-spin" size={18} /> Loading…</div> : items.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-elevated text-accent">
            <Scale size={22} />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">No rights in the registry yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">Operational rights are promoted from verified contracts and reviewed before they become active registry records.</p>
          <Link href="/rights/review" className="mt-5 inline-flex"><Button size="sm"><FileCheck size={14} /> Review queue</Button></Link>
        </Card>
      ) : <div className="space-y-2">{items.map((r) => <Link key={r.id} href={`/rights/${r.id}`}><Card className="p-4 hover:border-accent/30 transition-colors"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-text-primary font-medium">{r.title}</h3><p className="text-xs text-text-secondary mt-0.5">{r.categoryLabel || r.category}{r.contractId != null ? ` · Contract #${r.contractId}` : ""}{r.ownerName ? ` · ${r.ownerName}` : ""}</p></div><div className="flex gap-1.5">{r.exclusive && <Badge variant="warn">Exclusive</Badge>}<Badge variant={(STATUS_VARIANT[r.status] || "neutral") as any}>{r.status}</Badge></div></div></Card></Link>)}</div>}
    </div>
  );
}
