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
  { key: "stage_name", label: "Stage Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  {
    key: "ipi_number",
    label: "IPI",
    sortable: true,
    render: (row: any) => row.ipi_number || "—",
  },
];

export default function ArtistsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newArtist, setNewArtist] = useState<any>({ name: "", stage_name: "", email: "", ipi_number: "" });

  const fetchData = async () => {
    try {
      const res = await api.get("/artists");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch artists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete artist "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/artists?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete artist");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/artists", newArtist);
      setShowAddModal(false);
      setNewArtist({ name: "", stage_name: "", email: "", ipi_number: "" });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create artist");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Artists"
        subtitle="Manage your artist roster"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Artist
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/artists/${row.id}`)}
        onEdit={(row: any) => router.push(`/catalog/artists/${row.id}`)}
        onDelete={handleDelete}
      />

      <EntityForm title="New Artist" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="input w-full" value={newArtist.name} onChange={(e) => setNewArtist({ ...newArtist, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Stage Name</label>
            <input className="input w-full" value={newArtist.stage_name} onChange={(e) => setNewArtist({ ...newArtist, stage_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Email</label>
            <input className="input w-full" type="email" value={newArtist.email} onChange={(e) => setNewArtist({ ...newArtist, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">IPI Number</label>
            <input className="input w-full" value={newArtist.ipi_number} onChange={(e) => setNewArtist({ ...newArtist, ipi_number: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
