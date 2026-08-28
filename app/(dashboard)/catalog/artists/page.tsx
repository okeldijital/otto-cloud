"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import EntityArtwork from "@/components/media/EntityArtwork";
import { useAttachmentMap } from "@/hooks/useAttachment";
import api from "@/lib/api";

export default function ArtistsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newArtist, setNewArtist] = useState<any>({ name: "", stage_name: "", email: "", ipi_number: "" });

  const ids = useMemo(() => data.map((a) => a.id), [data]);
  const { urls: photoUrls } = useAttachmentMap("artist", ids);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;
    return data.filter((artist) =>
      [artist.name, artist.stage_name, artist.email, artist.ipi_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [data, search]);

  const columns = useMemo(
    () => [
      {
        key: "photo",
        label: "",
        render: (row: any) => (
          <EntityArtwork
            entityType="artist"
            entityId={row.id}
            src={photoUrls[String(row.id)] ?? null}
            alt={row.name}
            size={40}
            placeholder="artist"
            className="rounded-full"
            style={{ borderRadius: 999 }}
          />
        ),
      },
      { key: "name", label: "Name", sortable: true },
      { key: "stage_name", label: "Stage Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      {
        key: "ipi_number",
        label: "IPI",
        sortable: true,
        render: (row: any) => row.ipi_number || "—",
      },
    ],
    [photoUrls]
  );

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

      <section className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between" aria-label="Artist catalogue controls">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search artists..."
            aria-label="Search artists"
            className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/50"
          />
        </div>
        <Button variant="secondary" size="sm" icon={SlidersHorizontal} aria-label="Filter artists">
          Filter
        </Button>
      </section>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/artists/${row.id}`)}
        onEdit={(row: any) => router.push(`/catalog/artists/${row.id}`)}
        onDelete={handleDelete}
      />

      {!loading && search && filteredData.length === 0 && data.length > 0 && (
        <p className="-mt-3 text-xs text-text-secondary">No artists match “{search}”.</p>
      )}

      <EntityForm title="New Artist" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary">Name *</label>
            <input className="input w-full" value={newArtist.name} onChange={(e) => setNewArtist({ ...newArtist, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary">Stage Name</label>
            <input className="input w-full" value={newArtist.stage_name} onChange={(e) => setNewArtist({ ...newArtist, stage_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary">Email</label>
            <input className="input w-full" type="email" value={newArtist.email} onChange={(e) => setNewArtist({ ...newArtist, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary">IPI Number</label>
            <input className="input w-full" value={newArtist.ipi_number} onChange={(e) => setNewArtist({ ...newArtist, ipi_number: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
