// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit3, Trash2, DollarSign, BadgeCheck, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const SOURCE_VARIANTS = {
  spotify: "primary",
  "apple music": "success",
  youtube: "warn",
  tidal: "neutral",
  deezer: "primary",
  amazon: "success",
  soundcloud: "neutral",
  "youtube music": "warn",
  other: "neutral",
};

const CURRENCIES = ["USD", "EUR", "GBP", "ZAR"];

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "\u2014";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));
}

function formatDate(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getSourceVariant(source) {
  if (!source) return "neutral";
  const key = source.toLowerCase().trim();
  return SOURCE_VARIANTS[key] || "neutral";
}

const EMPTY_FORM = {
  source: "",
  amount: "",
  currency: "USD",
  statement_date: "",
  artist_id: "",
  work_id: "",
  track_id: "",
  fees: "",
  advances: "",
};

export default function RoyaltiesPage() {
  const router = useRouter();
  const [royalties, setRoyalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [artistIdFilter, setArtistIdFilter] = useState("");
  const [workIdFilter, setWorkIdFilter] = useState("");
  const [trackIdFilter, setTrackIdFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoyalty, setEditingRoyalty] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [splitContractId, setSplitContractId] = useState("");
  const [splitResults, setSplitResults] = useState(null);
  const [splitLoading, setSplitLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/royalties");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setRoyalties(items);
      setError("");
    } catch (err) {
      console.error("Failed to fetch royalties:", err);
      setError(err?.response?.data?.error || "Failed to load royalties");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/royalties?action=summary");
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSummary();
  }, []);

  const sourceOptions = useMemo(() => {
    const sources = new Set(royalties.map((r) => r.source).filter(Boolean));
    return ["All", ...Array.from(sources).sort()];
  }, [royalties]);

  const filtered = useMemo(() => {
    return royalties.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || (r.source || "").toLowerCase().includes(q);
      const matchesSource = sourceFilter === "All" || (r.source || "") === sourceFilter;
      const matchesArtist = !artistIdFilter || String(r.artist_id) === artistIdFilter;
      const matchesWork = !workIdFilter || String(r.work_id) === workIdFilter;
      const matchesTrack = !trackIdFilter || String(r.track_id) === trackIdFilter;
      return matchesSearch && matchesSource && matchesArtist && matchesWork && matchesTrack;
    });
  }, [royalties, search, sourceFilter, artistIdFilter, workIdFilter, trackIdFilter]);

  const openCreate = () => {
    setEditingRoyalty(null);
    setFormData({ ...EMPTY_FORM });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingRoyalty(r);
    setFormData({
      source: r.source || "",
      amount: r.amount ?? "",
      currency: r.currency || "USD",
      statement_date: r.statement_date || "",
      artist_id: r.artist_id ?? "",
      work_id: r.work_id ?? "",
      track_id: r.track_id ?? "",
      fees: r.fees ?? "",
      advances: r.advances ?? "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    try {
      const payload = {
        source: formData.source,
        amount: Number(formData.amount),
        currency: formData.currency,
      };
      if (formData.statement_date) payload.statement_date = formData.statement_date;
      if (formData.artist_id) payload.artist_id = Number(formData.artist_id);
      if (formData.work_id) payload.work_id = Number(formData.work_id);
      if (formData.track_id) payload.track_id = Number(formData.track_id);
      if (formData.fees) payload.fees = Number(formData.fees);
      if (formData.advances) payload.advances = Number(formData.advances);

      if (editingRoyalty) {
        await api.put(`/royalties?id=${editingRoyalty.id}`, payload);
      } else {
        await api.post("/royalties", payload);
      }
      setModalOpen(false);
      await fetchData();
      await fetchSummary();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Failed to save royalty");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete royalty #${r.id}? This cannot be undone.`)) return;
    try {
      await api.delete(`/royalties?id=${r.id}`);
      await fetchData();
      await fetchSummary();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete royalty");
    }
  };

  const validateSplits = async () => {
    if (!splitContractId) return;
    setSplitLoading(true);
    setSplitResults(null);
    try {
      const res = await api.get(`/royalties?action=validate-splits&contract_id=${splitContractId}`);
      setSplitResults(res.data);
    } catch (err) {
      setSplitResults({ error: err?.response?.data?.error || "Validation failed" });
    } finally {
      setSplitLoading(false);
    }
  };

  const renderSummaryCard = (title, value, icon) => (
    <div className="bg-premium-glass border border-white/5 rounded-[24px] p-6 backdrop-blur-xl hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-text-secondary font-bold">{title}</div>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Royalties"
        subtitle="Track and manage royalty earnings across all sources."
        actions={
          <Button variant="orange" size="sm" onClick={openCreate}>
            <Plus size={16} /> Add Royalty
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderSummaryCard(
          "Total Royalties",
          summary ? String(summary.total_royalties ?? summary.count ?? 0) : "\u2014",
          <DollarSign size={18} className="text-accent" />
        )}
        {renderSummaryCard(
          "Total Amount",
          summary ? formatCurrency(summary.total_amount ?? summary.gross_amount ?? 0) : "\u2014",
          <DollarSign size={18} className="text-success" />
        )}
        {renderSummaryCard(
          "Total Fees",
          summary ? formatCurrency(summary.total_fees ?? 0) : "\u2014",
          <DollarSign size={18} className="text-warning" />
        )}
        {renderSummaryCard(
          "Net Amount",
          summary ? formatCurrency(summary.net_amount ?? 0) : "\u2014",
          <DollarSign size={18} className="text-primary" />
        )}
      </div>

      <Card title="Split Validation" subtitle="Validate royalty splits for a contract">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs text-text-secondary block mb-1">Contract ID</label>
            <input
              className="input w-full"
              type="number"
              value={splitContractId}
              onChange={(e) => setSplitContractId(e.target.value)}
              placeholder="Enter contract ID..."
            />
          </div>
          <Button variant="primary" size="sm" onClick={validateSplits} disabled={!splitContractId || splitLoading}>
            {splitLoading ? "Validating..." : "Validate Splits"}
          </Button>
        </div>
        {splitResults && (
          <div className="mt-4 space-y-3">
            {splitResults.error ? (
              <div className="flex items-center gap-2 text-danger text-sm">
                <AlertTriangle size={16} /> {splitResults.error}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {splitResults.total_equals_100 && (
                    <Badge variant="success" size="sm">
                      <BadgeCheck size={12} className="mr-1" /> Total = 100%
                    </Badge>
                  )}
                  {splitResults.over_allocated && (
                    <Badge variant="critical" size="sm">Over-allocated</Badge>
                  )}
                  {splitResults.under_allocated && (
                    <Badge variant="warn" size="sm">Under-allocated</Badge>
                  )}
                </div>
                {splitResults.splits?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                          <th className="p-3 font-bold">Party</th>
                          <th className="p-3 font-bold">%</th>
                          <th className="p-3 font-bold">Amount</th>
                          <th className="p-3 font-bold">Rationale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {splitResults.splits.map((s, idx) => (
                          <tr key={idx} className="border-b border-white/5">
                            <td className="p-3 text-sm text-white">{s.party || s.party_name || `Party #${idx + 1}`}</td>
                            <td className="p-3 text-sm font-mono">{s.percent != null ? `${Number(s.percent).toFixed(1)}%` : "\u2014"}</td>
                            <td className="p-3 text-sm">{s.amount != null ? formatCurrency(s.amount) : "\u2014"}</td>
                            <td className="p-3 text-sm text-text-secondary">{s.rationale || s.notes || "\u2014"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {splitResults.warnings?.length > 0 && (
                  <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-warning mb-2">Warnings</h4>
                    {splitResults.warnings.map((w, idx) => (
                      <p key={idx} className="text-sm text-text-secondary">{w}</p>
                    ))}
                  </div>
                )}
                {splitResults.missing_flags?.length > 0 && (
                  <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-danger mb-2">Missing Flags</h4>
                    {splitResults.missing_flags.map((m, idx) => (
                      <p key={idx} className="text-sm text-text-secondary">{m}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      <Card noPadding>
        <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Search size={16} className="text-text-secondary" />
            <input
              className="input w-auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search source..."
            />
            <select
              className="input w-auto"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {sourceOptions.map((s) => (
                <option key={s} value={s}>{s === "All" ? "Source: All" : s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              className="input w-24"
              type="number"
              placeholder="Artist ID"
              value={artistIdFilter}
              onChange={(e) => setArtistIdFilter(e.target.value)}
            />
            <input
              className="input w-24"
              type="number"
              placeholder="Work ID"
              value={workIdFilter}
              onChange={(e) => setWorkIdFilter(e.target.value)}
            />
            <input
              className="input w-24"
              type="number"
              placeholder="Track ID"
              value={trackIdFilter}
              onChange={(e) => setTrackIdFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading royalties\u2026</div>
        ) : error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            {royalties.length === 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">No royalties recorded yet.</h3>
                <p className="text-sm">Add your first royalty entry to start tracking earnings.</p>
                <Button variant="orange" size="sm" onClick={openCreate}>
                  <Plus size={16} /> Add Royalty
                </Button>
              </div>
            ) : (
              <p>No royalties match your filters.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">ID</th>
                  <th className="p-4 font-bold">Source</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Currency</th>
                  <th className="p-4 font-bold">Artist</th>
                  <th className="p-4 font-bold">Work</th>
                  <th className="p-4 font-bold">Track</th>
                  <th className="p-4 font-bold">Statement Date</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 font-mono text-sm text-text-secondary">#{r.id}</td>
                    <td className="p-4">
                      <Badge variant={getSourceVariant(r.source)} size="sm">
                        {r.source || "Unknown"}
                      </Badge>
                    </td>
                    <td className="p-4 font-medium text-white">{formatCurrency(r.amount)}</td>
                    <td className="p-4">
                      <Badge variant="neutral" size="sm">{r.currency || "USD"}</Badge>
                    </td>
                    <td className="p-4 text-sm">
                      {r.artist_id ? (
                        <a
                          href={`/catalog/artists/${r.artist_id}`}
                          className="text-accent hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/catalog/artists/${r.artist_id}`);
                          }}
                        >
                          {r.artist_name || `Artist #${r.artist_id}`}
                        </a>
                      ) : (
                        <span className="text-text-secondary">\u2014</span>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {r.work_id ? (
                        <a
                          href={`/catalog/works/${r.work_id}`}
                          className="text-accent hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/catalog/works/${r.work_id}`);
                          }}
                        >
                          {r.work_title || `Work #${r.work_id}`}
                        </a>
                      ) : (
                        <span className="text-text-secondary">\u2014</span>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {r.track_id ? (
                        <a
                          href={`/catalog/tracks/${r.track_id}`}
                          className="text-accent hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/catalog/tracks/${r.track_id}`);
                          }}
                        >
                          {r.track_title || `Track #${r.track_id}`}
                        </a>
                      ) : (
                        <span className="text-text-secondary">\u2014</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{formatDate(r.statement_date)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          className="ghost-btn p-1.5 hover:bg-accent/10 rounded-lg text-text-secondary hover:text-accent transition-colors"
                          onClick={() => openEdit(r)}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-text-secondary hover:text-danger transition-colors"
                          onClick={() => handleDelete(r)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EntityForm
        title={editingRoyalty ? "Edit Royalty" : "Add Royalty"}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        error={formError || undefined}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-secondary">Source <span className="text-danger">*</span></label>
            <input className="input w-full" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Amount <span className="text-danger">*</span></label>
            <input type="number" step="0.01" className="input w-full" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Currency</label>
            <select className="input w-full" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Statement Date</label>
            <input type="date" className="input w-full" value={formData.statement_date} onChange={(e) => setFormData({ ...formData, statement_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Artist ID</label>
            <input type="number" className="input w-full" value={formData.artist_id} onChange={(e) => setFormData({ ...formData, artist_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Work ID</label>
            <input type="number" className="input w-full" value={formData.work_id} onChange={(e) => setFormData({ ...formData, work_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Track ID</label>
            <input type="number" className="input w-full" value={formData.track_id} onChange={(e) => setFormData({ ...formData, track_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Fees</label>
            <input type="number" step="0.01" className="input w-full" value={formData.fees} onChange={(e) => setFormData({ ...formData, fees: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Advances</label>
            <input type="number" step="0.01" className="input w-full" value={formData.advances} onChange={(e) => setFormData({ ...formData, advances: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
