"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "code", label: "Code", render: (row: any) => row.code || "—" },
];

export default function ProsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", code: "" });

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

  const handleEdit = (row: any) => {
    setEditItem(row);
    setForm({ name: row.name || "", code: row.code || "" });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/pros?id=${editItem.id}`, form);
      setShowEditModal(false);
      setEditItem(null);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to update PRO");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/pros", form);
      setShowAddModal(false);
      setForm({ name: "", code: "" });
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
        actions={
          <Button variant="primary" size="sm" onClick={() => { setForm({ name: "", code: "" }); setShowAddModal(true); }}>
            <Plus size={16} />
            Add PRO
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onRowClick={handleEdit}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <EntityForm title="New PRO" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Code</label>
            <input className="input w-full" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
        </div>
      </EntityForm>

      <EntityForm title="Edit PRO" isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSubmit={handleUpdate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Code</label>
            <input className="input w-full" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
