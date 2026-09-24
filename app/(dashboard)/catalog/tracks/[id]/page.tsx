"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Disc, ExternalLink, Hash, Loader2, Music, Plus, Save, Search, Trash2, User, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import AttachmentsSection from "@/components/AttachmentsSection";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "text-xs font-medium text-text-secondary";

type CreditRow = {
  name: string;
  role: string;
  share_percent: string;
  source?: Record<string, any>;
};

function normalizeCreditRows(value: any): CreditRow[] {
  return (Array.isArray(value) ? value : []).map((item: any) => ({
    name: item?.name || item?.artist_name || item?.display_name || item?.member || item?.party_name || "",
    role: item?.role || item?.type || item?.credit_type || "",
    share_percent: item?.share_percent ?? item?.share ?? item?.percentage ?? item?.percent ?? "",
    source: item,
  }));
}

function creditRowsToPayload(rows: CreditRow[]) {
  return rows
    .filter((row) => row.name.trim() || row.role.trim() || row.share_percent !== "")
    .map((row) => ({
      ...(row.source || {}),
      name: row.name.trim(),
      role: row.role.trim() || "Credit",
      share_percent: row.share_percent === "" ? null : Number(row.share_percent),
    }));
}

function creditShareTotal(rows: CreditRow[]) {
  return rows.reduce((total, row) => {
    const share = Number(row.share_percent);
    return Number.isFinite(share) ? total + share : total;
  }, 0);
}

function formatDuration(value: string | null): string {
  if (!value) return "";
  if (value.includes("T")) return value.replace(/^.*T/, "").replace(/\.\d+Z$/, "");
  return value;
}

function formatDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

function unwrap<T = any>(value: any): T | null {
  if (Array.isArray(value)) return (value[0] as T) || null;
  if (Array.isArray(value?.items)) return (value.items[0] as T) || null;
  return value || null;
}

function unwrapMany<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  return value ? [value as T] : [];
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}><span className={labelClass}>{label}</span>{children}</label>;
}

function SelectionList({ title, items, selectedIds, onToggle, getTitle, getSubtitle, icon: Icon, empty, searchPlaceholder, action }: any) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? items.filter((item: any) => [getTitle(item), getSubtitle(item)].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery)))
    : items;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Icon size={16} className="text-primary" /><h3 className="text-sm font-semibold text-text-primary">{title}</h3></div>
        <div className="flex items-center gap-2">{action}{<span className="text-xs text-text-secondary">{selectedIds.length} selected</span>}</div>
      </div>
      {searchPlaceholder && (
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-md border border-border bg-surface-elevated pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>
      )}
      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <p className="py-5 text-center text-xs text-text-secondary">{normalizedQuery ? "No matches found." : empty}</p>
        ) : filteredItems.map((item: any) => {
          const selected = selectedIds.includes(item.id);
          return (
            <button key={item.id} type="button" onClick={() => onToggle(item.id)} className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition ${selected ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-surface-elevated"}`}>
              <span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{getTitle(item)}</span>{getSubtitle(item) && <span className="block truncate text-xs text-text-secondary">{getSubtitle(item)}</span>}</span>
              <span className={`h-4 w-4 shrink-0 rounded border ${selected ? "border-primary bg-primary" : "border-border"}`}>{selected && <span className="block text-center text-[10px] leading-4 text-black">✓</span>}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<any>(null);
  const [release, setRelease] = useState<any>(null);
  const [work, setWork] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [secondaryReleases, setSecondaryReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [creditRows, setCreditRows] = useState<CreditRow[]>([]);
  const [showArtistPicker, setShowArtistPicker] = useState(false);
  const [artistSearch, setArtistSearch] = useState("");
  const [artistSearchResults, setArtistSearchResults] = useState<any[]>([]);
  const [isSearchingArtists, setIsSearchingArtists] = useState(false);
  const [showNewArtistModal, setShowNewArtistModal] = useState(false);
  const [isCreatingArtist, setIsCreatingArtist] = useState(false);
  const [newArtistError, setNewArtistError] = useState("");
  const [newArtist, setNewArtist] = useState({ name: "", aka: "", contact_email: "", ipi_number: "" });
  const [form, setForm] = useState<any>({ title: "", isrc_code: "", genre: "", duration: "", release_date: "", streaming_link: "", release_id: "", work_id: "", artist_ids: [], secondary_release_ids: [], credits: "" });

  const loadTrack = async () => {
    const { data: trackData } = await api.get(`/tracks?id=${id}`);
    setTrack(trackData);
    const [artistRes, releaseRes, workRes, releaseListRes, workListRes] = await Promise.all([
      api.get(`/artists`),
      trackData.release_id ? api.get(`/releases?id=${trackData.release_id}`) : Promise.resolve({ data: null }),
      trackData.work_id ? api.get(`/works?id=${trackData.work_id}`) : Promise.resolve({ data: null }),
      api.get(`/releases?limit=100`),
      api.get(`/works?limit=100`),
    ]);
    const allArtists = unwrapMany(artistRes.data);
    const primaryRelease = unwrap(releaseRes.data);
    const linkedWork = unwrap(workRes.data);
    const allReleases = unwrapMany(releaseListRes.data);
    const allWorks = unwrapMany(workListRes.data);
    const secondaryIds = Array.isArray(trackData.secondary_release_ids) ? trackData.secondary_release_ids : [];
    setArtists(allArtists);
    setRelease(primaryRelease);
    setWork(linkedWork);
    setReleases(allReleases);
    setWorks(allWorks);
    setSecondaryReleases(allReleases.filter((item: any) => secondaryIds.includes(item.id)));
    setCreditRows(normalizeCreditRows(trackData.credits));
    setForm({
      title: trackData.title || "",
      isrc_code: trackData.isrc_code || "",
      genre: trackData.genre || "",
      duration: formatDuration(trackData.duration),
      release_date: formatDateInput(trackData.release_date),
      streaming_link: trackData.streaming_link || "",
      release_id: trackData.release_id ? String(trackData.release_id) : "",
      work_id: trackData.work_id ? String(trackData.work_id) : "",
      artist_ids: Array.isArray(trackData.artist_ids) ? trackData.artist_ids : [],
      secondary_release_ids: secondaryIds,
      credits: Array.isArray(trackData.credits) ? JSON.stringify(trackData.credits, null, 2) : "",
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try { await loadTrack(); } catch (err) { console.error(err); setError("Unable to load track."); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!showArtistPicker) return;
    const query = artistSearch.trim();
    const timer = window.setTimeout(async () => {
      setIsSearchingArtists(true);
      try {
        const { data } = await api.get(`/artists?q=${encodeURIComponent(query)}&limit=20`);
        setArtistSearchResults(unwrapMany(data));
      } catch (err) {
        console.error(err);
        setArtistSearchResults([]);
      } finally {
        setIsSearchingArtists(false);
      }
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [showArtistPicker, artistSearch]);

  const selectedArtists = useMemo(() => artists.filter((artist) => form.artist_ids.includes(artist.id)), [artists, form.artist_ids]);
  const selectedSecondary = useMemo(() => releases.filter((item) => form.secondary_release_ids.includes(item.id)), [releases, form.secondary_release_ids]);
  const addArtistToTrack = (artistId: number) => {
    setForm((current: any) => ({
      ...current,
      artist_ids: current.artist_ids.includes(artistId) ? current.artist_ids : [...current.artist_ids, artistId],
    }));
    setShowArtistPicker(false);
    setArtistSearch("");
  };

  const removeArtistFromTrack = (artistId: number) => {
    setForm((current: any) => ({
      ...current,
      artist_ids: current.artist_ids.filter((value: number) => value !== artistId),
    }));
  };

  const handleCreateArtist = async (event: React.FormEvent) => {
    event.preventDefault();
    const artistName = newArtist.name.trim();
    if (!artistName) {
      setNewArtistError("Legal name is required.");
      return;
    }
    const duplicate = artists.find((artist: any) => String(artist.name || "").trim().toLowerCase() === artistName.toLowerCase());
    if (duplicate) {
      setNewArtistError(`An artist named "${artistName}" already exists. Search for and add the existing artist instead.`);
      return;
    }
    setIsCreatingArtist(true);
    setError("");
    setNewArtistError("");
    try {
      const { data: createdArtist } = await api.post("/artists", {
        name: artistName,
        legal_name: artistName,
        aka: newArtist.aka.trim() || null,
        contact_email: newArtist.contact_email.trim() || null,
        ipi_number: newArtist.ipi_number.trim() || null,
      });
      setArtists((current) => [...current, createdArtist]);
      setForm((current: any) => ({
        ...current,
        artist_ids: current.artist_ids.includes(createdArtist.id)
          ? current.artist_ids
          : [...current.artist_ids, createdArtist.id],
      }));
      setNewArtist({ name: "", aka: "", contact_email: "", ipi_number: "" });
      setShowNewArtistModal(false);
      setShowArtistPicker(false);
      setArtistSearch("");
    } catch (err: any) {
      setNewArtistError(err?.response?.data?.error || err?.message || "Failed to create artist.");
    } finally {
      setIsCreatingArtist(false);
    }
  };
  const toggleSecondaryRelease = (releaseId: number) => setForm((current: any) => ({ ...current, secondary_release_ids: current.secondary_release_ids.includes(releaseId) ? current.secondary_release_ids.filter((value: number) => value !== releaseId) : [...current.secondary_release_ids, releaseId] }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Track title is required."); return; }
    setIsSaving(true); setError("");
    try {

      await api.put(`/tracks?id=${id}`, {
        title: form.title.trim(), isrc_code: form.isrc_code.trim() || null, genre: form.genre.trim() || null, duration: form.duration.trim() || null,
        release_date: form.release_date || null, streaming_link: form.streaming_link.trim() || null, release_id: form.release_id ? Number(form.release_id) : null,
        work_id: form.work_id ? Number(form.work_id) : null, artist_ids: form.artist_ids,
        secondary_release_ids: form.secondary_release_ids.filter((releaseId: number) => releaseId !== Number(form.release_id)),
        credits: creditRowsToPayload(creditRows),
      });
      await loadTrack();
      setIsEditing(false);
    } catch (err: any) { setError(err?.response?.data?.error || err?.message || "Failed to save track."); }
    finally { setIsSaving(false); }
  };

  const cancelEdit = async () => { setIsEditing(false); setError(""); await loadTrack(); };
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${track.title}"? This cannot be undone.`)) return;
    try { await api.delete(`/tracks?id=${id}`); router.push("/catalog/tracks"); }
    catch (err: any) { setError(err?.response?.data?.error || "Delete failed."); }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading track...</div>;
  if (!track) return <div className="p-12 text-center text-text-secondary">Track not found.</div>;

  const linkedArtists = isEditing ? selectedArtists : artists.filter((artist: any) => (track.artist_ids || []).includes(artist.id));
  const linkedSecondary = isEditing ? selectedSecondary : secondaryReleases;
  const secondaryOptions = releases.filter((item: any) => item.id !== Number(form.release_id));

  return (
    <div className="space-y-6">
      <PageHeader title={track.title} subtitle={`Track #${id}`} breadcrumb="Catalog / Tracks" actions={
        <div className="flex items-center gap-2">
          {isEditing ? <><Button variant="secondary" size="sm" onClick={cancelEdit} disabled={isSaving}><X size={14} />Cancel</Button><Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{isSaving ? "Saving..." : "Save changes"}</Button></> : <><Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>Edit</Button><Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} />Delete</Button></>}
        </div>
      } />

      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card title="Metadata" subtitle="Core track information">
            {isEditing ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Track title" className="md:col-span-2"><input className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
              <Field label="ISRC"><input className={fieldClass} value={form.isrc_code} onChange={(e) => setForm({ ...form, isrc_code: e.target.value })} /></Field>
              <Field label="Genre"><input className={fieldClass} value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} /></Field>
              <Field label="Duration"><input className={fieldClass} placeholder="3:45" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></Field>
              <Field label="Release date"><input className={fieldClass} type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} /></Field>
              <Field label="Streaming link" className="md:col-span-2"><input className={fieldClass} type="url" value={form.streaming_link} onChange={(e) => setForm({ ...form, streaming_link: e.target.value })} placeholder="https://..." /></Field>
            </div> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div><span className={labelClass}>Title</span><p className="mt-1 font-medium text-text-primary">{track.title}</p></div>
              <div><span className={labelClass}>ISRC</span><p className="mt-1 flex items-center gap-1 text-text-primary"><Hash size={14} className="text-text-secondary" />{track.isrc_code || "—"}</p></div>
              <div><span className={labelClass}>Genre</span><p className="mt-1 text-text-primary">{track.genre || "—"}</p></div>
              <div><span className={labelClass}>Duration</span><p className="mt-1 flex items-center gap-1 text-text-primary"><Clock size={14} className="text-text-secondary" />{formatDuration(track.duration) || "—"}</p></div>
              <div><span className={labelClass}>Release date</span><p className="mt-1 text-text-primary">{track.release_date ? new Date(track.release_date).toLocaleDateString() : "—"}</p></div>
              <div><span className={labelClass}>Streaming</span><p className="mt-1">{track.streaming_link ? <a href={track.streaming_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink size={14} />Listen</a> : <span className="text-text-primary">—</span>}</p></div>
            </div>}
          </Card>

          <Card title="Artists" subtitle="Artists credited on this track">
            {isEditing ? (
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-primary" />
                      <h3 className="text-sm font-semibold text-text-primary">Track artists</h3>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">Add the artists credited on this track.</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowArtistPicker(true)}>
                    <Plus size={13} />Add artist
                  </Button>
                </div>
                {selectedArtists.length ? (
                  <div className="space-y-2">
                    {selectedArtists.map((artist: any) => (
                      <div key={artist.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{artist.display_name || artist.stage_name || artist.name || `Artist #${artist.id}`}</p>
                          {(artist.aka || artist.kind) && <p className="truncate text-xs text-text-secondary">{artist.aka || artist.kind}</p>}
                        </div>
                        <button type="button" onClick={() => removeArtistFromTrack(artist.id)} className="shrink-0 rounded-md p-1.5 text-text-secondary transition hover:bg-surface hover:text-text-primary" aria-label={`Remove ${artist.display_name || artist.stage_name || artist.name || "artist"}`}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
                    <p className="text-sm text-text-secondary">No artists linked yet.</p>
                    <p className="mt-1 text-xs text-text-secondary">Use Add artist to link an existing artist or create a new one.</p>
                  </div>
                )}
              </div>
            ) : linkedArtists.length ? (
              <div className="flex flex-wrap gap-2">{linkedArtists.map((artist: any) => <button key={artist.id} type="button" onClick={() => router.push(`/catalog/artists/${artist.id}`)} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary transition hover:border-primary/40 hover:bg-primary/5"><User size={14} className="text-primary" />{artist.display_name || artist.stage_name || artist.name}</button>)}</div>
            ) : <p className="text-sm text-text-secondary">No artists linked.</p>}
          </Card>

          {showArtistPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="add-artist-title">
              <div className="w-full max-w-xl rounded-xl border border-border bg-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <h2 id="add-artist-title" className="text-base font-semibold text-text-primary">Add artist</h2>
                    <p className="mt-1 text-xs text-text-secondary">Search the catalogue or create a new artist.</p>
                  </div>
                  <button type="button" onClick={() => { setShowArtistPicker(false); setArtistSearch(""); }} className="rounded-md p-2 text-text-secondary hover:bg-surface-elevated hover:text-text-primary" aria-label="Close">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-4 p-5">
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      autoFocus
                      type="search"
                      value={artistSearch}
                      onChange={(event) => setArtistSearch(event.target.value)}
                      placeholder="Search artists..."
                      className="h-10 w-full rounded-lg border border-border bg-surface-elevated pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="max-h-72 space-y-1 overflow-y-auto">
                    {isSearchingArtists ? (
                      <p className="py-6 text-center text-xs text-text-secondary">Searching artists...</p>
                    ) : artistSearchResults.filter((artist: any) => !form.artist_ids.includes(artist.id)).length ? (
                      artistSearchResults
                        .filter((artist: any) => !form.artist_ids.includes(artist.id))
                        .map((artist: any) => (
                          <button key={artist.id} type="button" onClick={() => addArtistToTrack(artist.id)} className="flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2.5 text-left hover:border-border hover:bg-surface-elevated">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-text-primary">{artist.display_name || artist.stage_name || artist.name || `Artist #${artist.id}`}</span>
                              {(artist.legal_name || artist.aka) && <span className="block truncate text-xs text-text-secondary">{artist.legal_name || artist.aka}</span>}
                            </span>
                            <span className="text-xs font-medium text-primary">Add</span>
                          </button>
                        ))
                    ) : (
                      <p className="py-6 text-center text-xs text-text-secondary">No matching artists.</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <p className="text-xs text-text-secondary">Can’t find the artist?</p>
                    <Button type="button" variant="secondary" size="sm" onClick={() => { setNewArtistError(""); setShowNewArtistModal(true); }}>
                      <Plus size={13} />Create new artist
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <EntityForm
            title="New Artist"
            isOpen={showNewArtistModal}
            onClose={() => { setNewArtistError(""); setShowNewArtistModal(false); }}
            onSubmit={handleCreateArtist}
            isSubmitting={isCreatingArtist}
            error={newArtistError}
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-secondary">Legal Name *</label>
                <input className="input w-full" value={newArtist.name} onChange={(event) => setNewArtist({ ...newArtist, name: event.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary">Stage Name (AKA)</label>
                <input className="input w-full" value={newArtist.aka} onChange={(event) => setNewArtist({ ...newArtist, aka: event.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary">Email</label>
                <input className="input w-full" type="email" value={newArtist.contact_email} onChange={(event) => setNewArtist({ ...newArtist, contact_email: event.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary">IPI Number</label>
                <input className="input w-full" value={newArtist.ipi_number} onChange={(event) => setNewArtist({ ...newArtist, ipi_number: event.target.value })} />
              </div>
            </div>
          </EntityForm>

          <Card title="Credits & splits" subtitle="Contributors, roles and royalty/split percentages">
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Track credits</p>
                    <p className="mt-1 text-xs text-text-secondary">Manage the same structured credits and split allocation available from the Release Single workspace.</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setCreditRows((rows) => [...rows, { name: "", role: "", share_percent: "" }])}><Plus size={14} />Add credit</Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-surface-elevated text-text-secondary">
                      <tr><th className="px-3 py-2 font-medium">Contributor</th><th className="px-3 py-2 font-medium">Role</th><th className="w-32 px-3 py-2 font-medium">Split %</th><th className="w-12 px-2 py-2" /></tr>
                    </thead>
                    <tbody>
                      {creditRows.map((row, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="px-3 py-2"><input className={fieldClass} value={row.name} onChange={(e) => setCreditRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, name: e.target.value } : item))} placeholder="Artist, producer, licensor..." /></td>
                          <td className="px-3 py-2"><input className={fieldClass} value={row.role} onChange={(e) => setCreditRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, role: e.target.value } : item))} placeholder="Original Artist, Producer, ..." /></td>
                          <td className="px-3 py-2"><input className={fieldClass} type="number" min="0" max="100" step="0.01" value={row.share_percent} onChange={(e) => setCreditRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, share_percent: e.target.value } : item))} placeholder="0" /></td>
                          <td className="px-2 py-2 text-center"><button type="button" onClick={() => setCreditRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="rounded-md p-2 text-text-secondary hover:bg-surface-elevated hover:text-danger" aria-label="Remove credit"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                      {!creditRows.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-text-secondary">No credits or splits added yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-text-secondary">Total allocated: <strong className="text-text-primary">{creditShareTotal(creditRows).toFixed(2)}%</strong></span>
                  <span className={Math.abs(creditShareTotal(creditRows) - 100) < 0.001 ? "text-primary" : "text-text-secondary"}>{Math.abs(creditShareTotal(creditRows) - 100) < 0.001 ? "Fully allocated" : "Allocation can be completed when the split is final"}</span>
                </div>
                <div className="flex justify-end"><Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isSaving ? "Saving..." : "Save credits & splits"}</Button></div>
              </div>
            ) : creditRows.length ? (
              <div className="space-y-2">
                {creditRows.map((credit, index) => <div key={index} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm"><span className="font-medium text-text-primary">{credit.name || "Contributor"}</span><span className="text-text-secondary">{credit.role || "Credit"}{credit.share_percent === "" || credit.share_percent == null ? "" : ` · ${Number(credit.share_percent)}%`}</span></div>)}
                <div className="pt-1 text-xs text-text-secondary">Total allocated: <span className="font-medium text-text-primary">{creditShareTotal(creditRows).toFixed(2)}%</span></div>
              </div>
            ) : <p className="text-sm text-text-secondary">No credits or splits recorded.</p>}
          </Card>

          <Card title="Secondary releases" subtitle="Other releases containing this track">
            {isEditing ? <SelectionList title="Secondary releases" items={secondaryOptions} selectedIds={form.secondary_release_ids} onToggle={toggleSecondaryRelease} getTitle={(item: any) => item.title} getSubtitle={(item: any) => item.release_type || ""} icon={Disc} empty="No releases found." searchPlaceholder="Search releases..." /> : linkedSecondary.length ? <div className="space-y-2">{linkedSecondary.map((item: any) => <button key={item.id} type="button" onClick={() => router.push(`/catalog/releases/${item.id}`)} className="flex w-full items-center gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"><Disc size={16} className="text-primary" /><span className="text-sm font-medium text-text-primary">{item.title}</span><span className="ml-auto text-xs text-text-secondary">{item.release_type || ""}</span></button>)}</div> : <p className="text-sm text-text-secondary">No secondary releases linked.</p>}
          </Card>

          <AttachmentsSection entityType="track" entityId={id} entityTitle={track.title} />
        </div>

        <div className="space-y-6">
          <Card title="Primary release" subtitle="The main release association">
            {isEditing ? <Field label="Release"><select className={fieldClass} value={form.release_id} onChange={(e) => setForm({ ...form, release_id: e.target.value, secondary_release_ids: form.secondary_release_ids.filter((rid: number) => rid !== Number(e.target.value)) })}><option value="">No primary release</option>{releases.map((item: any) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field> : release ? <button type="button" onClick={() => router.push(`/catalog/releases/${release.id}`)} className="flex w-full items-center gap-3 rounded-md border border-border bg-surface-elevated p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"><Disc size={18} className="text-primary" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{release.title}</span><span className="block text-xs text-text-secondary">{release.release_type || "Release"}</span></span></button> : <p className="text-sm text-text-secondary">No primary release linked.</p>}
          </Card>

          <Card title="Musical work" subtitle="The underlying composition">
            {isEditing ? <Field label="Work"><select className={fieldClass} value={form.work_id} onChange={(e) => setForm({ ...form, work_id: e.target.value })}><option value="">No musical work</option>{works.map((item: any) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field> : work ? <button type="button" onClick={() => router.push(`/catalog/works/${work.id}`)} className="flex w-full items-center gap-3 rounded-md border border-border bg-surface-elevated p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"><Music size={18} className="text-primary" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{work.title}</span><span className="block text-xs text-text-secondary">ISWC: {work.iswc_code || "—"}</span></span></button> : <p className="text-sm text-text-secondary">No musical work linked.</p>}
          </Card>

          <Card title="Quick stats" subtitle="Current catalog relationships">
            <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm text-text-primary">Artists</span><Badge variant="primary">{(track.artist_ids || []).length}</Badge></div><div className="flex items-center justify-between"><span className="text-sm text-text-primary">Secondary releases</span><Badge variant="primary">{(track.secondary_release_ids || []).length}</Badge></div></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
