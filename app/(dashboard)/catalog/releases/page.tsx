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

export default function ReleasesPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRelease, setNewRelease] = useState<any>({ title: "", release_type: "Single", release_date: "", catalog_number: "" });

  const ids = useMemo(() => data.map((r) => r.id), [data]);
  const { urls: coverUrls } = useAttachmentMap("release", ids);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((release) => {
      const matchesType = typeFilter === "all" || String(release.release_type || "").toLowerCase() === typeFilter;
      const matchesSearch = !query || [release.title, release.release_type, release.release_date, release.catalog_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [data, search, typeFilter]);

  const columns = useMemo(
    () => [
      {
        key: "artwork",
        label: "",
        render: (row: any) => (
          <EntityArtwork
            entityType="release"
            entityId={row.id}
            src={coverUrls[String(row.id)] ?? null}
            alt={row.title}
            size={40}
            placeholder="release"
            className="rounded-lg"
            style={{ borderRadius: 8 }}
          />
        ),
      },
      { key: "title", label: "Title", sortable: true },
      { key: "release_type", label: "Type", sortable: true },
      {
        key: "release_date",
        label: "Release Date",
        sortable: true,
        render: (row: any) =>
          row.release_date ? new Date(row.release_date).toLocaleDateString() : "—",
      },
      {
        key: "catalog_number",
        label: "Catalog #",
        render: (row: any) => row.catalog_number || "—",
      },
    ],
    [coverUrls]
  );

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

      <section className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between" aria-label="Release catalogue controls">
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search releases..."
              aria-label="Search releases"
              className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/50"
            />
          </div>
          <label className="relative flex h-10 items-center rounded-md border border-border bg-surface px-3 text-sm text-text-secondary">
            <SlidersHorizontal size={16} className="mr-2" />
            <span className="sr-only">Filter by release type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter releases by type"
              className="appearance-none bg-transparent pr-5 text-sm text-text-primary outline-none"
            >
              <option value="all">All types</option>
              <option value="single">Single</option>
              <option value="ep">EP</option>
              <option value="album">Album</option>
              <option value="compilation">Compilation</option>
            </select>
          </label>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/releases/${row.id}`)}
        onEdit={(row: any) => router.push(`/catalog/releases/${row.id}`)}
        onDelete={handleDelete}
      />

      {!loading && (search || typeFilter !== "all") && filteredData.length === 0 && data.length > 0 && (
        <p className="-mt-3 text-xs text-text-secondary">No releases match the current catalogue filters.</p>
      )}

      <EntityForm title="New Release" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary">Title *</label>
            <input className="input w-full" value={newRelease.title} onChange={(e) => setNewRelease({ ...newRelease, title: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary">Type</label>
            <select className="input w-full" value={newRelease.release_type} onChange={(e) => setNewRelease({ ...newRelease, release_type: e.target.value })}>
              <option value="Single">Single</option>
              <option value="EP">EP</option>
              <option value="Album">Album</option>
              <option value="Compilation">Compilation</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary">Release Date</label>
            <input className="input w-full" type="date" value={newRelease.release_date} onChange={(e) => setNewRelease({ ...newRelease, release_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary">Catalog Number</label>
            <input className="input w-full" value={newRelease.catalog_number} onChange={(e) => setNewRelease({ ...newRelease, catalog_number: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
