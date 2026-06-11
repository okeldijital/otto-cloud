"use client";

import { useState, useEffect } from "react";
import { Plus, ListMusic, Globe, Lock, Play, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

export default function PlaylistsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_public: false });

  const fetchData = async () => {
    try {
      const res = await api.get("/playlists");
      setData(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      console.error("Failed to fetch playlists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete playlist "${row.name}"?`)) return;
    try {
      await api.delete(`/playlists?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/playlists", form);
      setShowAddModal(false);
      setForm({ name: "", description: "", is_public: false });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playlists"
        subtitle="Curated track playlists"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Playlist
          </Button>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-text-secondary">Loading...</div>
      ) : data.length === 0 ? (
        <Card title="No Playlists Yet" subtitle="Create your first playlist to get started." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((p) => (
            <div key={p.id} className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:border-accent/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <ListMusic size={20} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.is_public ? (
                        <Badge variant="primary" size="sm"><Globe size={10} /> Public</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm"><Lock size={10} /> Private</Badge>
                      )}
                      <span className="text-xs text-text-secondary">{p.track_ids?.length || 0} tracks</span>
                    </div>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all" onClick={() => handleDelete(p)}>
                  <Trash2 size={14} />
                </button>
              </div>
              {p.description && <p className="text-sm text-text-secondary line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-2 mt-4">
                <Button variant="secondary" size="xs" disabled>
                  <Play size={12} /> View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EntityForm title="New Playlist" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Description</label>
            <textarea className="input w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_public" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="rounded" />
            <label htmlFor="is_public" className="text-sm text-text-secondary">Make public</label>
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
