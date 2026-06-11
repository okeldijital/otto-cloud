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
  { key: "title", label: "Title", sortable: true },
  {
    key: "work_type",
    label: "Type",
    sortable: true,
    render: (row: any) => row.work_type || "—",
  },
  { key: "iswc", label: "ISWC", render: (row: any) => row.iswc || "—" },
];

export default function WorksPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newWork, setNewWork] = useState<any>({ title: "", work_type: "Original", iswc: "" });

  const fetchData = async () => {
    try {
      const res = await api.get("/works");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch works:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete work "${row.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/works?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete work");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/works", newWork);
      setShowAddModal(false);
      setNewWork({ title: "", work_type: "Original", iswc: "" });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create work");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Works"
        subtitle="Manage compositions and arrangements"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Work
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onEdit={(row: any) => router.push(`/catalog/works/${row.id}`)}
        onDelete={handleDelete}
      />

      <EntityForm title="New Work" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Title *</label>
            <input className="input w-full" value={newWork.title} onChange={(e) => setNewWork({ ...newWork, title: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Type</label>
            <select className="input w-full" value={newWork.work_type} onChange={(e) => setNewWork({ ...newWork, work_type: e.target.value })}>
              <option value="Original">Original</option>
              <option value="Arrangement">Arrangement</option>
              <option value="Cover">Cover</option>
              <option value="Remix">Remix</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">ISWC</label>
            <input className="input w-full" value={newWork.iswc} onChange={(e) => setNewWork({ ...newWork, iswc: e.target.value })} placeholder="e.g. T-123456789-0" />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
