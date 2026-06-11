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
  { key: "release_type", label: "Type", sortable: true },
  {
    key: "release_date",
    label: "Release Date",
    sortable: true,
    render: (row: any) => row.release_date ? new Date(row.release_date).toLocaleDateString() : "—",
  },
  {
    key: "catalog_number",
    label: "Catalog #",
    render: (row: any) => row.catalog_number || "—",
  },
];

export default function ReleasesPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRelease, setNewRelease] = useState<any>({ title: "", release_type: "Single", release_date: "", catalog_number: "" });

  const fetchData = async () => {
    try {
      const res = await api.get("/releases");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch releases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete release "${row.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/releases?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete release");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/releases", newRelease);
      setShowAddModal(false);
      setNewRelease({ title: "", release_type: "Single", release_date: "", catalog_number: "" });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create release");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Releases"
        subtitle="Track albums, EPs, and singles"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Release
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onEdit={(row: any) => router.push(`/catalog/releases/${row.id}`)}
        onDelete={handleDelete}
      />

      <EntityForm title="New Release" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Title *</label>
            <input className="input w-full" value={newRelease.title} onChange={(e) => setNewRelease({ ...newRelease, title: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Type</label>
            <select className="input w-full" value={newRelease.release_type} onChange={(e) => setNewRelease({ ...newRelease, release_type: e.target.value })}>
              <option value="Single">Single</option>
              <option value="EP">EP</option>
              <option value="Album">Album</option>
              <option value="Compilation">Compilation</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Release Date</label>
            <input className="input w-full" type="date" value={newRelease.release_date} onChange={(e) => setNewRelease({ ...newRelease, release_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Catalog Number</label>
            <input className="input w-full" value={newRelease.catalog_number} onChange={(e) => setNewRelease({ ...newRelease, catalog_number: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
