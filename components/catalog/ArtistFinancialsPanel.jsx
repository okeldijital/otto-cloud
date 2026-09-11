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

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const selectClass = `${fieldClass} cursor-pointer`;

function money(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
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
      setError(err?.response?.data?.error || "Unable to load financial records.");
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
      setError(err?.response?.data?.error || "Unable to record financial item.");
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
      setError(err?.response?.data?.error || "Unable to delete financial record.");
    }
  };

  return (
    <Card title="Financials" subtitle="Operational financial records maintained directly on the artist">
      <div className="space-y-6">
        {Object.keys(totalsByCurrency).length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Summary</h4>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {Object.entries(totalsByCurrency).map(([currency, totals]) => (
                <div key={currency} className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{currency}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3"><span className="text-text-secondary">Advances</span><span className="font-semibold text-text-primary">{money(totals.advances, currency)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-text-secondary">Payments</span><span className="font-semibold text-text-primary">{money(totals.payments, currency)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-text-secondary">Expenses</span><span className="font-semibold text-text-primary">{money(totals.expenses, currency)}</span></div>
                    {totals.other > 0 && <div className="flex items-center justify-between gap-3"><span className="text-text-secondary">Other</span><span className="font-semibold text-text-primary">{money(totals.other, currency)}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={16} className="text-primary" />
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Record financial item</h4>
              <p className="mt-0.5 text-xs text-text-secondary">Add an advance, payment, expense, or other artist-level record.</p>
            </div>
          </div>

          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Type">
                <select className={selectClass} value={form.record_type} onChange={(e) => setForm({ ...form, record_type: e.target.value })}>
                  <option value="advance">Advance</option>
                  <option value="payment">Payment</option>
                  <option value="expense">Expense</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Amount">
                <input className={fieldClass} type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </Field>
              <Field label="Currency">
                <input className={`${fieldClass} uppercase`} maxLength={3} required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} placeholder="ZAR" />
              </Field>
              <Field label="Date">
                <input className={fieldClass} type="date" required value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Description">
                <input className={fieldClass} required placeholder="e.g. Recording advance" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label="Reference">
                <input className={fieldClass} placeholder="Receipt or payment reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </Field>
            </div>

            <Field label="Notes">
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>

            <div className="flex justify-end pt-1">
              <Button variant="primary" size="sm" type="submit" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                {saving ? "Saving..." : "Record Item"}
              </Button>
            </div>
          </form>
        </section>

        {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Financial history</h4>
            <span className="text-xs text-text-secondary">{items.length} {items.length === 1 ? "record" : "records"}</span>
          </div>

          {loading ? (
            <div className="rounded-lg border border-border bg-surface py-10 text-center"><Loader2 className="mx-auto animate-spin text-text-secondary" size={20} /></div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface py-10 text-center text-sm text-text-secondary">No financial records have been entered for this artist.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-surface-elevated/30">
                  <tr className="text-xs uppercase tracking-wider text-text-secondary">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="w-12 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={String(item.id)} className="text-text-primary transition hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3"><span className="inline-flex rounded-md border border-border bg-white/5 px-2 py-1 text-xs font-medium capitalize text-text-primary">{item.record_type}</span></td>
                      <td className="max-w-[260px] px-4 py-3"><div className="truncate font-medium">{item.description}</div>{item.notes && <div className="mt-0.5 truncate text-xs text-text-secondary">{item.notes}</div>}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-text-secondary">{item.reference || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-text-primary">{money(item.amount, item.currency)}</td>
                      <td className="px-2 py-3 text-right"><button type="button" onClick={() => remove(item.id)} className="rounded-md p-2 text-text-secondary transition hover:bg-danger/10 hover:text-danger" title="Delete financial record" aria-label="Delete financial record"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
