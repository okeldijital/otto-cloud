"use client";

import { useEffect, useState } from "react";
import { Calculator, Loader2, Plus, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

const emptyForm = {
  record_type: "advance",
  amount: "",
  currency: "ZAR",
  transaction_date: new Date().toISOString().slice(0, 10),
  description: "",
  reference: "",
  notes: "",
};

function money(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

export default function ArtistFinancialsPanel({ artistId }) {
  const [items, setItems] = useState([]);
  const [totalsByCurrency, setTotalsByCurrency] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/artists/${artistId}/financials`);
      setItems(data?.items || []);
      setTotalsByCurrency(data?.totalsByCurrency || {});
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load artist financials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [artistId]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post(`/artists/${artistId}/financials`, form);
      setForm({ ...emptyForm, currency: form.currency, record_type: form.record_type });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to record financial item.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (recordId) => {
    if (!window.confirm("Delete this financial record?")) return;
    try {
      await api.delete(`/artists/${artistId}/financials`, { params: { recordId } });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to delete financial record.");
    }
  };

  return (
    <Card title="Financials" subtitle="Operational financial records maintained directly on the artist">
      <div className="space-y-6">
        {Object.keys(totalsByCurrency).length > 0 && (
          <div className="space-y-3">
            {Object.entries(totalsByCurrency).map(([currency, totals]) => (
              <div key={currency} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-white/5 p-4"><p className="text-xs text-text-secondary uppercase tracking-wider">{currency} Advances</p><p className="mt-1 text-lg font-semibold">{money(totals.advances, currency)}</p></div>
                <div className="rounded-lg border border-border bg-white/5 p-4"><p className="text-xs text-text-secondary uppercase tracking-wider">{currency} Payments</p><p className="mt-1 text-lg font-semibold">{money(totals.payments, currency)}</p></div>
                <div className="rounded-lg border border-border bg-white/5 p-4"><p className="text-xs text-text-secondary uppercase tracking-wider">{currency} Expenses</p><p className="mt-1 text-lg font-semibold">{money(totals.expenses, currency)}</p></div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={save} className="rounded-xl border border-border bg-white/5 p-4 space-y-4">
          <div className="flex items-center gap-2"><Plus size={16} /><span className="text-sm font-semibold">Record financial item</span></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><label className="text-xs text-text-secondary block mb-1">Type</label><select className="input w-full" value={form.record_type} onChange={(e) => setForm({ ...form, record_type: e.target.value })}><option value="advance">Advance</option><option value="payment">Payment</option><option value="expense">Expense</option><option value="other">Other</option></select></div>
            <div><label className="text-xs text-text-secondary block mb-1">Amount</label><input className="input w-full" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="text-xs text-text-secondary block mb-1">Currency</label><input className="input w-full uppercase" maxLength={3} required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
            <div><label className="text-xs text-text-secondary block mb-1">Date</label><input className="input w-full" type="date" required value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-text-secondary block mb-1">Description</label><input className="input w-full" required placeholder="e.g. Recording advance" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><label className="text-xs text-text-secondary block mb-1">Reference</label><input className="input w-full" placeholder="Receipt / payment reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          </div>
          <div><label className="text-xs text-text-secondary block mb-1">Notes</label><textarea className="input w-full min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button variant="primary" size="sm" type="submit" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}{saving ? "Saving..." : "Record Item"}</Button>
        </form>

        {error && <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-text-secondary">{error}</div>}

        {loading ? <div className="py-8 text-center"><Loader2 className="mx-auto animate-spin text-text-secondary" size={20} /></div> : items.length === 0 ? <div className="py-8 text-center text-sm text-text-secondary">No financial records have been entered for this artist.</div> : (
          <div className="space-y-2">
            {items.map((item) => <div key={String(item.id)} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/5 p-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-medium capitalize">{item.record_type}</span><span className="text-xs text-text-secondary">{item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : ""}</span></div><p className="text-xs text-text-secondary truncate mt-1">{item.description}{item.reference ? ` · ${item.reference}` : ""}</p></div><div className="flex items-center gap-2 shrink-0"><span className="font-semibold">{money(item.amount, item.currency)}</span><button onClick={() => remove(item.id)} className="p-2 rounded-md text-text-secondary hover:text-danger hover:bg-danger/10" title="Delete"><Trash2 size={15} /></button></div></div>)}
          </div>
        )}
      </div>
    </Card>
  );
}
