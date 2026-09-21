"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal, Disc, User, Music2 } from "lucide-react";
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
    render: (row: any) => row.duration ? String(row.duration).replace(/^.*T/, "").replace(/\.\d+Z$/, "") : "—",
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
  const [newTrack, setNewTrack] = useState<any>({ title: "", isrc_code: "", genre: "", duration: "", release_id: "", work_id: "", artist_ids: [] });
  const [artists, setArtists] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res = await api.get("/tracks");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);\n      setArtists(Array.isArray(artistsRes.data) ? artistsRes.data : artistsRes.data?.items || []);\n      setReleases(Array.isArray(releasesRes.data) ? releasesRes.data : releasesRes.data?.items || []);\n      setWorks(Array.isArray(worksRes.data) ? worksRes.data : worksRes.data?.items || []);
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
      await api.post("/tracks", {
        title: newTrack.title,
        isrc_code: newTrack.isrc_code || undefined,
        genre: newTrack.genre || undefined,
        duration: newTrack.duration || undefined,
      });
      setShowAddModal(false);
      setNewTrack({ title: "", isrc_code: "", genre: "", duration: "", release_id: "", work_id: "", artist_ids: [] });
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
        <div className="space-y-8">
          <section>
            <div className="mb-4 border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Track details</h3>
              <p className="mt-1 text-xs text-text-secondary">Core metadata for the recording.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Title *</label>
                <input className="input w-full" value={newTrack.title} onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">ISRC</label>
                <input className="input w-full" value={newTrack.isrc_code} onChange={(e) => setNewTrack({ ...newTrack, isrc_code: e.target.value })} placeholder="e.g. USABC1234567" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Genre</label>
                <input className="input w-full" value={newTrack.genre} onChange={(e) => setNewTrack({ ...newTrack, genre: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Duration</label>
                <input className="input w-full" value={newTrack.duration} onChange={(e) => setNewTrack({ ...newTrack, duration: e.target.value })} placeholder="e.g. 3:45" />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Relationships</h3>
              <p className="mt-1 text-xs text-text-secondary">A track does not need a release. Link artists and works independently.</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Primary release</label>
                <div className="relative">
                  <Disc size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <select className="input w-full pl-9" value={newTrack.release_id} onChange={(e) => setNewTrack({ ...newTrack, release_id: e.target.value })}>
                    <option value="">No release yet</option>
                    {releases.map((release) => <option key={release.id} value={release.id}>{release.title}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Artists</label>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border bg-surface-elevated p-2">
                  {artists.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-text-secondary">No artists available.</p>
                  ) : artists.map((artist) => {
                    const selected = newTrack.artist_ids.includes(artist.id);
                    return (
                      <button key={artist.id} type="button" onClick={() => setNewTrack({ ...newTrack, artist_ids: selected ? newTrack.artist_ids.filter((id: number) => id !== artist.id) : [...newTrack.artist_ids, artist.id] })} className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${selected ? "border-accent/50 bg-accent/10" : "border-transparent hover:border-border hover:bg-surface"}`}>
                        <span className="flex min-w-0 items-center gap-2"><User size={14} className="shrink-0 text-accent" /><span className="truncate text-sm text-text-primary">{artist.display_name || artist.aka || artist.name || `Artist #${artist.id}`}</span></span>
                        <span className={`h-4 w-4 shrink-0 rounded border ${selected ? "border-accent bg-accent" : "border-border"}`}>{selected && <span className="block text-center text-[10px] leading-4 text-black">✓</span>}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">{newTrack.artist_ids.length} artist{newTrack.artist_ids.length === 1 ? "" : "s"} selected</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Musical work</label>
                <div className="relative">
                  <Music2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <select className="input w-full pl-9" value={newTrack.work_id} onChange={(e) => setNewTrack({ ...newTrack, work_id: e.target.value })}>
                    <option value="">No work linked</option>
                    {works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">Works can be linked before they appear on a release.</p>
              </div>
            </div>
          </section>
        </div>
      </EntityForm>
    </div>
  );
}
