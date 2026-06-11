"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function LabelsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLabel, setNewLabel] = useState<any>({ name: "", code: "" });

  const fetchData = async () => {
    try {
      const res = await api.get("/labels");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch labels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete label "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/labels?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete label");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/labels", newLabel);
      setShowAddModal(false);
      setNewLabel({ name: "", code: "" });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create label");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labels"
        subtitle="Manage your label roster"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Label
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onEdit={(row: any) => router.push(`/catalog/labels/${row.id}`)}
        onDelete={handleDelete}
      />

      <EntityForm title="New Label" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="input w-full" value={newLabel.name} onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Code</label>
            <input className="input w-full" value={newLabel.code} onChange={(e) => setNewLabel({ ...newLabel, code: e.target.value })} placeholder="e.g. OTR" />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
