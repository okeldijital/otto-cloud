"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, FileText, Download } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";
import AddContractWizard from "@/components/contracts/AddContractWizard";

const STATUS_VARIANTS: Record<string, string> = { Draft: "neutral", Active: "success", Expired: "warn", Terminated: "critical", Archived: "critical" };
const COMPLETENESS_VARIANTS: Record<string, string> = { GREEN: "success", AMBER: "warn", RED: "critical" };
const CONTRACT_TYPES = ["Recording", "Publishing", "License", "Other", "Unknown"];
const EXPIRING_BUCKETS = [{ label: "Any time", value: 0 }, { label: "Expiring ≤30 days", value: 30 }, { label: "Expiring ≤60 days", value: 60 }, { label: "Expiring ≤90 days", value: 90 }];
function formatDate(d: string | null | undefined): string { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }

export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [expiring, setExpiring] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  const fetchData = async () => {
    try { setLoading(true); const res = await api.get("/contracts"); const items = Array.isArray(res.data) ? res.data : res.data?.items || []; setContracts(items); setError(""); }
    catch (err: any) { console.error("Failed to fetch contracts:", err); setError(err?.response?.data?.error || "Failed to load contracts"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  const isExpiredSoon = (endDate: string | null, days: number) => { if (!endDate) return false; const now = new Date(); const end = new Date(endDate); const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24); return diff >= 0 && diff <= days; };
  const filtered = useMemo(() => contracts.filter((c) => { const q = search.toLowerCase(); return (!q || (c.title || "").toLowerCase().includes(q) || (c.contract_number || "").toLowerCase().includes(q)) && (statusFilter === "All" || (c.status || "").toLowerCase() === statusFilter.toLowerCase()) && (typeFilter === "All" || (c.type || c.contract_type || "").toLowerCase() === typeFilter.toLowerCase()) && (expiring === 0 || (c.end_date && isExpiredSoon(c.end_date, expiring))); }), [contracts, search, statusFilter, typeFilter, expiring]);

  return (
    <div className="space-y-6">
      <PageHeader title="Contracts" subtitle="Upload signed PDFs, then capture parties, assets, and terms." actions={<Button variant="primary" size="sm" onClick={() => setShowWizard(true)}><Plus size={16} /> Add New Contract</Button>} />
      <Card noPadding>
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap"><Filter size={16} className="text-text-secondary" />
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="All">Status: All</option><option value="Draft">Draft</option><option value="Active">Active</option><option value="Expired">Expired</option><option value="Terminated">Terminated</option><option value="Archived">Archived</option></select>
            <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="All">Type: All</option>{CONTRACT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            <select className="input w-auto" value={expiring} onChange={(e) => setExpiring(Number(e.target.value))}>{EXPIRING_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select>
          </div>
          <div className="flex items-center gap-2 ml-auto"><Search size={16} className="text-text-secondary" /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contracts or CTR number..." /></div>
        </div>
        {loading ? <div className="p-12 text-center text-text-secondary">Loading contracts…</div> : error ? <div className="p-12 text-center text-danger">{error}</div> : filtered.length === 0 ? <div className="p-12 text-center text-text-secondary">{contracts.length === 0 ? <div className="space-y-4"><h3 className="text-lg font-semibold text-text-primary">Upload a signed contract PDF to begin.</h3><p className="text-sm">OTTO does not create contracts — it organizes them.</p><Button variant="primary" size="sm" onClick={() => setShowWizard(true)}><Plus size={16} /> Upload Contract (PDF)</Button></div> : <p>No contracts match your filters.</p>}</div> :
          <div className="overflow-x-auto"><table className="w-full" style={{ borderCollapse: "collapse" }}><thead><tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-border"><th className="p-4 font-bold">Status</th><th className="p-4 font-bold">Title</th><th className="p-4 font-bold">Parties</th><th className="p-4 font-bold">Assets</th><th className="p-4 font-bold">Document</th><th className="p-4 font-bold">Term</th><th className="p-4 font-bold"></th></tr></thead>
            <tbody>{filtered.map((c) => { const completeness = c.completeness || { score: 0, status: "RED", missing: [] }; const partyCount = c._count?.parties ?? c.contract_parties?.length ?? 0; const docCount = c._count?.documents ?? c.contract_documents?.length ?? 0; const endsSoon = c.end_date && isExpiredSoon(c.end_date, 30); return <tr key={c.id} className="border-b border-border hover:bg-surface-elevated cursor-pointer transition-colors" onClick={() => router.push(`/contracts/${c.id}`)}>
              <td className="p-4"><Badge variant={STATUS_VARIANTS[c.status] || "neutral"} size="sm">{c.status || "Draft"}</Badge></td>
              <td className="p-4"><div className="font-medium text-text-primary">{c.title || "Untitled contract"}</div><div className="text-xs text-text-secondary font-mono mt-0.5">{c.contract_number || "—"}</div></td>
              <td className="p-4 text-sm text-text-secondary">{partyCount > 0 ? <div className="flex flex-col gap-0.5">{(c.contract_parties || []).slice(0, 2).map((p: any, idx: number) => <span key={idx} className="truncate max-w-[180px]">{p.external_name || `${p.entity_type || "Party"} #${p.entity_id || ""}`}</span>)}{partyCount > 2 && <span className="text-xs text-text-secondary">+{partyCount - 2} more</span>}</div> : <span className="text-text-secondary/50">{partyCount} parties</span>}</td>
              <td className="p-4 text-sm text-text-secondary">{c._count?.assets ?? c.contract_assets?.length ?? 0} tracks</td>
              <td className="p-4"><div className="flex items-center gap-2"><FileText size={14} className="text-text-secondary" /><span className="text-sm">{docCount > 0 ? `v${docCount}` : "—"}</span></div><div className="mt-1"><Badge variant={COMPLETENESS_VARIANTS[completeness.status] || "neutral"} size="sm">{completeness.status}</Badge></div></td>
              <td className={`p-4 text-sm ${endsSoon ? "text-danger" : "text-text-secondary"}`}>{c.start_date ? formatDate(c.start_date) : "—"} → {c.end_date ? formatDate(c.end_date) : "—"}</td>
              <td className="p-4"><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); router.push(`/contracts/${c.id}`); }}>View</Button><Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); router.push(`/contracts/${c.id}?tab=parties`); }}>Add Parties</Button></div></td>
            </tr>; })}</tbody></table></div>}
      </Card>
      <AddContractWizard isOpen={showWizard} onClose={() => setShowWizard(false)} onCreated={(created: any) => { const cid = created?.id || created?.contract_id; if (cid) router.push(`/contracts/${cid}`); fetchData(); }} />
    </div>
  );
}
