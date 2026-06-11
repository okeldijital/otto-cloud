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
  { key: "isrc", label: "ISRC", render: (row: any) => row.isrc || "—" },
  { key: "genre", label: "Genre", render: (row: any) => row.genre || "—" },
  {
    key: "duration",
    label: "Duration",
    render: (row: any) => row.duration || "—",
  },
];

export default function TracksPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTrack, setNewTrack] = useState<any>({ title: "", isrc: "", genre: "", duration: "" });

  const fetchData = async () => {
    try {
      const res = await api.get("/tracks");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete track "${row.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tracks?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete track");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/tracks", newTrack);
      setShowAddModal(false);
      setNewTrack({ title: "", isrc: "", genre: "", duration: "" });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create track");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracks"
        subtitle="Manage your track catalog"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Track
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onEdit={(row: any) => router.push(`/catalog/tracks/${row.id}`)}
        onDelete={handleDelete}
      />

      <EntityForm title="New Track" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Title *</label>
            <input className="input w-full" value={newTrack.title} onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">ISRC</label>
            <input className="input w-full" value={newTrack.isrc} onChange={(e) => setNewTrack({ ...newTrack, isrc: e.target.value })} placeholder="e.g. USABC1234567" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Genre</label>
            <input className="input w-full" value={newTrack.genre} onChange={(e) => setNewTrack({ ...newTrack, genre: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Duration</label>
            <input className="input w-full" value={newTrack.duration} onChange={(e) => setNewTrack({ ...newTrack, duration: e.target.value })} placeholder="e.g. 3:45" />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
