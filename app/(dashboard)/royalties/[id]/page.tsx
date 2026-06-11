// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Edit3, Trash2, ExternalLink } from "lucide-react";
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

export default function RoyaltyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [royalty, setRoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchRoyalty = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/royalties?id=${id}`);
      const data = res.data;
      setRoyalty(data);
      setEditForm({
        source: data.source || "",
        amount: data.amount ?? "",
        currency: data.currency || "USD",
        statement_date: data.statement_date || "",
        artist_id: data.artist_id ?? "",
        work_id: data.work_id ?? "",
        track_id: data.track_id ?? "",
        fees: data.fees ?? "",
        advances: data.advances ?? "",
      });
      setError("");
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 404) {
        setError("Royalty not found.");
      } else {
        setError("Unable to load royalty.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoyalty(); }, [id]);

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    try {
      const payload = {
        source: editForm.source,
        amount: Number(editForm.amount),
        currency: editForm.currency,
      };
      if (editForm.statement_date) payload.statement_date = editForm.statement_date;
      if (editForm.artist_id) payload.artist_id = Number(editForm.artist_id);
      if (editForm.work_id) payload.work_id = Number(editForm.work_id);
      if (editForm.track_id) payload.track_id = Number(editForm.track_id);
      if (editForm.fees) payload.fees = Number(editForm.fees);
      if (editForm.advances) payload.advances = Number(editForm.advances);

      const res = await api.put(`/royalties?id=${id}`, payload);
      setRoyalty((prev) => ({ ...prev, ...res.data }));
      setEditModalOpen(false);
    } catch (err) {
      setFormError(err?.response?.data?.error || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this royalty? This cannot be undone.")) return;
    try {
      await api.delete(`/royalties?id=${id}`);
      router.push("/royalties");
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete royalty");
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading royalty\u2026</div>;
  if (error) return (
    <div className="space-y-6">
      <button onClick={() => router.push("/royalties")} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
        <ChevronLeft size={18} /> Back to Royalties
      </button>
      <div className="p-12 text-center text-danger">{error}</div>
    </div>
  );
  if (!royalty) return (
    <div className="space-y-6">
      <button onClick={() => router.push("/royalties")} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
        <ChevronLeft size={18} /> Back to Royalties
      </button>
      <div className="p-12 text-center text-text-secondary">Royalty not found.</div>
    </div>
  );

  const fields = [
    { label: "ID", value: `#${royalty.id}` },
    { label: "Source", value: <Badge variant={getSourceVariant(royalty.source)} size="sm">{royalty.source || "Unknown"}</Badge> },
    { label: "Amount", value: <span className="text-xl font-bold text-white">{formatCurrency(royalty.amount)}</span> },
    { label: "Currency", value: <Badge variant="neutral" size="sm">{royalty.currency || "USD"}</Badge> },
    { label: "Statement Date", value: formatDate(royalty.statement_date) },
    { label: "Fees", value: formatCurrency(royalty.fees) },
    { label: "Advances", value: formatCurrency(royalty.advances) },
    {
      label: "Artist",
      value: royalty.artist_id ? (
        <a href={`/catalog/artists/${royalty.artist_id}`} onClick={(e) => { e.preventDefault(); router.push(`/catalog/artists/${royalty.artist_id}`); }}
           className="text-accent hover:underline inline-flex items-center gap-1">
          {royalty.artist_name || `Artist #${royalty.artist_id}`} <ExternalLink size={12} />
        </a>
      ) : "\u2014",
    },
    {
      label: "Work",
      value: royalty.work_id ? (
        <a href={`/catalog/works/${royalty.work_id}`} onClick={(e) => { e.preventDefault(); router.push(`/catalog/works/${royalty.work_id}`); }}
           className="text-accent hover:underline inline-flex items-center gap-1">
          {royalty.work_title || `Work #${royalty.work_id}`} <ExternalLink size={12} />
        </a>
      ) : "\u2014",
    },
    {
      label: "Track",
      value: royalty.track_id ? (
        <a href={`/catalog/tracks/${royalty.track_id}`} onClick={(e) => { e.preventDefault(); router.push(`/catalog/tracks/${royalty.track_id}`); }}
           className="text-accent hover:underline inline-flex items-center gap-1">
          {royalty.track_title || `Track #${royalty.track_id}`} <ExternalLink size={12} />
        </a>
      ) : "\u2014",
    },
    { label: "Created At", value: formatDate(royalty.created_at) },
    { label: "Updated At", value: formatDate(royalty.updated_at) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/royalties")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title={`Royalty #${royalty.id}`}
          subtitle={`${royalty.source || "Unknown source"} \u2022 ${formatCurrency(royalty.amount)}`}
          actions={
            <div className="flex gap-2 items-center">
              <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
                <Edit3 size={14} /> Edit
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 size={14} />
              </Button>
            </div>
          }
        />
      </div>

      <Card noPadding>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields.map((f) => (
              <div key={f.label}>
                <div className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-1">{f.label}</div>
                <div className="text-sm">{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <EntityForm
        title="Edit Royalty"
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEdit}
        isSubmitting={isSubmitting}
        error={formError || undefined}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-secondary">Source <span className="text-danger">*</span></label>
            <input className="input w-full" value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Amount <span className="text-danger">*</span></label>
            <input type="number" step="0.01" className="input w-full" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Currency</label>
            <select className="input w-full" value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Statement Date</label>
            <input type="date" className="input w-full" value={editForm.statement_date} onChange={(e) => setEditForm({ ...editForm, statement_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Artist ID</label>
            <input type="number" className="input w-full" value={editForm.artist_id} onChange={(e) => setEditForm({ ...editForm, artist_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Work ID</label>
            <input type="number" className="input w-full" value={editForm.work_id} onChange={(e) => setEditForm({ ...editForm, work_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Track ID</label>
            <input type="number" className="input w-full" value={editForm.track_id} onChange={(e) => setEditForm({ ...editForm, track_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Fees</label>
            <input type="number" step="0.01" className="input w-full" value={editForm.fees} onChange={(e) => setEditForm({ ...editForm, fees: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Advances</label>
            <input type="number" step="0.01" className="input w-full" value={editForm.advances} onChange={(e) => setEditForm({ ...editForm, advances: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
