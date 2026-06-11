"use client";

import { useState, useEffect } from "react";
import { Search, FileText, ShieldCheck, Calendar, Edit, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const STATUS_VARIANTS: Record<string, string> = {
  Registered: "success",
  Pending: "warn",
  Rejected: "danger",
  Unknown: "neutral",
};

export default function WorksAdminPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ work_id: "", registration_status: "Pending", registered_with: "", notes: "" });

  const fetchData = async () => {
    try {
      const res = await api.get("/admin-of-works/works");
      setData(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      console.error("Failed to fetch works admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = data.filter((item) =>
    !searchTerm || item.works?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/admin-of-works/works", form);
      setShowAddModal(false);
      setForm({ work_id: "", registration_status: "Pending", registered_with: "", notes: "" });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete registration for "${row.works?.title}"?`)) return;
    try {
      await api.delete(`/admin-of-works/works?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Works Administration"
        subtitle="Manage works registrations and filings"
        actions={
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input className="input pl-9" placeholder="Search works..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              <FileText size={14} /> New Registration
            </Button>
          </div>
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">No works registrations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">Work</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Registered With</th>
                  <th className="p-4 font-bold">Registration Date</th>
                  <th className="p-4 font-bold">Reference</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-white font-medium">{item.works?.title || "—"}</td>
                    <td className="p-4">
                      <Badge variant={STATUS_VARIANTS[item.registration_status] || "neutral"} size="sm">
                        {item.registration_status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{item.registered_with || "—"}</td>
                    <td className="p-4 text-sm text-text-secondary">
                      {item.registration_date ? new Date(item.registration_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{item.registration_reference || "—"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button className="ghost-btn p-1.5 hover:bg-accent/20 rounded-lg text-text-secondary hover:text-accent" onClick={() => {}}>
                          <Edit size={14} />
                        </button>
                        <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-text-secondary hover:text-danger" onClick={() => handleDelete(item)}>
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

      <EntityForm title="New Work Registration" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Work ID *</label>
            <input className="input w-full" type="number" value={form.work_id} onChange={(e) => setForm({ ...form, work_id: e.target.value })} required placeholder="Enter the numeric work ID" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Status</label>
            <select className="input w-full" value={form.registration_status} onChange={(e) => setForm({ ...form, registration_status: e.target.value })}>
              <option value="Pending">Pending</option>
              <option value="Registered">Registered</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Registered With</label>
            <input className="input w-full" value={form.registered_with} onChange={(e) => setForm({ ...form, registered_with: e.target.value })} placeholder="e.g. ASCAP, BMI, SOCAN" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Notes</label>
            <textarea className="input w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
