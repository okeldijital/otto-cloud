"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const columns = [
  { key: "title", label: "Title", sortable: true },
  { key: "isrc_code", label: "ISRC", sortable: true, render: (row: any) => row.isrc_code || "—" },
  { key: "genre", label: "Genre", sortable: true, render: (row: any) => row.genre || "—" },
  {
    key: "duration",
    label: "Duration",
    sortable: true,
    render: (row: any) => row.duration || "—",
  },
];

export default function TracksPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
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

  const genres = useMemo(
    () => Array.from(new Set(data.map((track) => String(track.genre || "").trim()).filter(Boolean))).sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((track) => {
      const matchesGenre = genreFilter === "all" || String(track.genre || "").toLowerCase() === genreFilter;
      const matchesSearch = !query || [track.title, track.isrc_code, track.genre, track.duration]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesGenre && matchesSearch;
    });
  }, [data, search, genreFilter]);

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

      <section className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between" aria-label="Track catalogue controls">
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracks..."
              aria-label="Search tracks"
              className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/50"
            />
          </div>
          <label className="relative flex h-10 items-center rounded-md border border-border bg-surface px-3 text-sm text-text-secondary">
            <SlidersHorizontal size={16} className="mr-2" />
            <span className="sr-only">Filter by genre</span>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              aria-label="Filter tracks by genre"
              className="appearance-none bg-transparent pr-5 text-sm text-text-primary outline-none"
            >
              <option value="all">All genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre.toLowerCase()}>{genre}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/tracks/${row.id}`)}
        onEdit={(row: any) => router.push(`/catalog/tracks/${row.id}`)}
        onDelete={handleDelete}
      />

      {!loading && (search || genreFilter !== "all") && filteredData.length === 0 && data.length > 0 && (
        <p className="-mt-3 text-xs text-text-secondary">No tracks match the current catalogue filters.</p>
      )}

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
