"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "pro_id", label: "PRO ID", render: (row: any) => row.pro_id || "—" },
];

export default function ProsPage() {
  const router = useRouter();
  const { canManageGlobalReferenceData } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emptyForm = () => ({ name: "", pro_id: "", contact_person: "", contact_email: "", contact_phone: "", website: "", address: "", territory: "" });
  const [form, setForm] = useState<any>(emptyForm());

  const fetchData = async () => {
    try {
      const res = await api.get("/pros");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch PROs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete PRO "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/pros?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete PRO");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/pros", { ...form, name: form.name.trim(), pro_id: form.pro_id.trim() || null, contact_person: form.contact_person.trim() || null, contact_email: form.contact_email.trim() || null, contact_phone: form.contact_phone.trim() || null, website: form.website.trim() || null, address: form.address.trim() || null, territory: form.territory.trim() || null });
      setShowAddModal(false);
      setForm(emptyForm());
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create PRO");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="PROs"
        subtitle="Performance Rights Organizations"
        actions={canManageGlobalReferenceData ? (
          <Button variant="primary" size="sm" onClick={() => { setForm(emptyForm()); setShowAddModal(true); }}>
            <Plus size={16} />
            Add PRO
          </Button>
        ) : undefined}
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/pros/${row.id}`)}
        onEdit={canManageGlobalReferenceData ? ((row: any) => router.push(`/catalog/pros/${row.id}`)) : undefined}
        onDelete={canManageGlobalReferenceData ? handleDelete : undefined}
      />

      <EntityForm title="New PRO" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-6">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">PRO ID</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={form.pro_id} onChange={(e) => setForm({ ...form, pro_id: e.target.value })} />
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Contact</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="text-xs text-text-secondary font-bold">Contact Person</label><input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Email</label><input type="email" className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Phone</label><input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Website</label><input type="url" className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
            </div>
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Organisation</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="text-xs text-text-secondary font-bold">Territory</label><input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} placeholder="e.g. South Africa" /></div>
              <div className="md:col-span-2"><label className="text-xs text-text-secondary font-bold">Address</label><textarea className="min-h-24 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
