"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Image as ImageIcon, Loader2, Plus, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EntityArtwork from "@/components/media/EntityArtwork";
import ReleaseCoreWorkspace from "@/components/releases/ReleaseCoreWorkspace";
import ReleaseTrackList from "@/components/releases/ReleaseTrackList";
import api from "@/lib/api";
import { invalidateEntityArtwork } from "@/hooks/useAttachment";
import { optimizeImage } from "@/lib/media/image-optimization";

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-accent placeholder:text-text-secondary/60 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelClass = "text-xs font-medium text-text-secondary";
const listItems = (response: any) =>
  Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.items) ? response.data.items : [];

export default function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [release, setRelease] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [artistQuery, setArtistQuery] = useState("");
  const [artworkKey, setArtworkKey] = useState(0);
  const [form, setForm] = useState<any>(null);
  const [selectedArtistIds, setSelectedArtistIds] = useState<number[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const releaseRes = await api.get(`/releases?id=${id}`);
      const data = releaseRes.data;
      setRelease(data);
      setForm({
        title: data.title || "",
        release_type: data.release_type || "Single",
        release_date: data.release_date ? String(data.release_date).slice(0, 10) : "",
        catalog_number: data.catalog_number || "",
        upc_code: data.upc_code || "",
        streaming_link: data.streaming_link || "",
        label_id: data.label_id ? String(data.label_id) : "",
        distributor_id: data.distributor_id ? String(data.distributor_id) : "",
      });
      setSelectedTrackIds(Array.isArray(data._tracks) ? data._tracks.map((track: any) => track.id) : []);
      setSelectedArtistIds(Array.isArray(data.artist_ids) ? data.artist_ids : data.artist_id ? [data.artist_id] : []);
      setLoading(false);

      const [artistsRes, tracksRes, labelsRes, distributorsRes] = await Promise.allSettled([
        api.get("/artists?limit=1000"),
        api.get("/tracks?limit=1000"),
        api.get("/labels"),
        api.get("/network/organizations"),
      ]);
      if (artistsRes.status === "fulfilled") setArtists(listItems(artistsRes.value));
      if (tracksRes.status === "fulfilled") setTracks(listItems(tracksRes.value));
      if (labelsRes.status === "fulfilled") setLabels(listItems(labelsRes.value));
      if (distributorsRes.status === "fulfilled") {
        setDistributors(listItems(distributorsRes.value).filter((item: any) => String(item.org_type || "").toLowerCase() === "distributor"));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load release.");
      setRelease(null);
      setForm(null);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const orderedTracks = useMemo(() => {
    const byId = new Map(tracks.map((track) => [track.id, track]));
    return selectedTrackIds.map((trackId) => byId.get(trackId)).filter(Boolean);
  }, [tracks, selectedTrackIds]);

  const visibleArtists = useMemo(() => {
    const q = artistQuery.trim().toLowerCase();
    return q
      ? artists.filter((artist) => `${artist.display_name || artist.stage_name || artist.name || ""} ${artist.aka || ""}`.toLowerCase().includes(q))
      : artists;
  }, [artists, artistQuery]);

  const selectedArtists = useMemo(() => artists.filter((artist) => selectedArtistIds.includes(artist.id)), [artists, selectedArtistIds]);

  const toggleArtist = (artistId: number) => {
    setSelectedArtistIds((current) => current.includes(artistId) ? current.filter((value) => value !== artistId) : [...current, artistId]);
  };

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!form?.title?.trim()) { setError("Release title is required."); return; }
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await api.put(`/releases?id=${id}`, {
        title: form.title.trim(),
        release_type: form.release_type,
        release_date: form.release_date || null,
        catalog_number: form.catalog_number.trim() || null,
        upc_code: form.upc_code.trim() || null,
        streaming_link: form.streaming_link.trim() || null,
        label_id: form.label_id ? Number(form.label_id) : null,
        distributor_id: form.distributor_id ? Number(form.distributor_id) : null,
        artist_ids: selectedArtistIds,
        track_ids: selectedTrackIds,
      });
      setSaved(true);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to save release.");
    } finally {
      setSaving(false);
    }
  };

  const uploadArtwork = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const optimized = await optimizeImage(file, "artwork");
      const response = await api.post("/storage/upload-url", {
        entityType: "release", entityId: String(id), fileName: optimized.name, mimeType: optimized.type,
        fileSize: optimized.size, folder: "release", uploadPurpose: "artwork",
      });
      const upload = response.data;
      const result = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": optimized.type }, body: optimized });
      if (!result.ok) throw new Error(`Artwork upload failed (${result.status})`);
      await api.post("/storage/complete", {
        entityType: "release", entityId: String(id), key: upload.key, fileName: upload.fileName,
        originalName: file.name, mimeType: optimized.type, fileSize: optimized.size, uploadPurpose: "artwork",
      });
      invalidateEntityArtwork("release", id);
      setArtworkKey((value) => value + 1);
      setSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Unable to update artwork.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const deleteRelease = async () => {
    if (!window.confirm(`Delete release "${release?.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/releases?id=${id}`);
      router.push("/catalog/releases");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to delete release.");
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading release...</div>;
  if (error && !release) return <div className="p-12 text-center text-text-secondary">{error}</div>;
  if (!release || !form) return <div className="p-12 text-center text-text-secondary">Release not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/catalog/releases")} className="text-text-secondary transition hover:text-text-accent" aria-label="Back to releases">
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title={release.title}
          subtitle="Release workspace"
          actions={
            <div className="flex items-center gap-2">
              {saved && <span className="text-xs text-accent">Saved</span>}
              <Button variant="primary" size="sm" onClick={() => save()} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save changes
              </Button>
              <Button variant="danger" size="sm" onClick={deleteRelease}><Trash2 size={14} /> Delete</Button>
            </div>
          }
        />
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <form onSubmit={save} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card title="Release overview" subtitle="Core release metadata and delivery information.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Release title" className="md:col-span-2">
                <input className={fieldClass} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Release type">
                <select className={fieldClass} value={form.release_type} onChange={(e) => setForm({ ...form, release_type: e.target.value })}>
                  <option>Single</option><option>EP</option><option>Album</option><option>Compilation</option>
                </select>
              </Field>
              <Field label="Release date">
                <input className={fieldClass} type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
              </Field>
              <Field label="Catalog number">
                <input className={fieldClass} value={form.catalog_number} onChange={(e) => setForm({ ...form, catalog_number: e.target.value })} placeholder="e.g. M2KR0072" />
              </Field>
              <Field label="UPC">
                <input className={fieldClass} value={form.upc_code} onChange={(e) => setForm({ ...form, upc_code: e.target.value })} placeholder="UPC / barcode" />
              </Field>
              <Field label="Label">
                <select className={fieldClass} value={form.label_id} onChange={(e) => setForm({ ...form, label_id: e.target.value })}>
                  <option value="">No label</option>
                  {labels.map((label: any) => <option key={label.id} value={label.id}>{label.name}</option>)}
                </select>
              </Field>
              <Field label="Distributor">
                <select className={fieldClass} value={form.distributor_id} onChange={(e) => setForm({ ...form, distributor_id: e.target.value })}>
                  <option value="">No distributor</option>
                  {distributors.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="Streaming link" className="md:col-span-2">
                <input className={fieldClass} type="url" value={form.streaming_link} onChange={(e) => setForm({ ...form, streaming_link: e.target.value })} placeholder="https://..." />
              </Field>
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="Artwork" subtitle="Release artwork used across the catalog.">
              <div className="overflow-hidden rounded-lg border border-border bg-surface-elevated">
                <EntityArtwork key={artworkKey} entityType="release" entityId={release.id} alt={release.title} size={320} placeholder="release" className="aspect-square w-full object-cover" style={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }} />
              </div>
              <label className="mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-accent transition hover:border-accent/50 hover:bg-surface-elevated">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                {uploading ? "Uploading..." : "Change artwork"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadArtwork} disabled={uploading} />
              </label>
            </Card>
            <Card title="Release status">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Current status</span>
                <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-xs font-semibold capitalize text-accent">{release.status || "draft"}</span>
              </div>
            </Card>
          </div>
        </div>

        <Card title="Release artists" subtitle="Release-level artist associations. Track-level roles and credits are managed inside each track." className="relative z-50 !overflow-visible">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="relative z-30">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input className={`${fieldClass} pl-9`} value={artistQuery} onChange={(e) => setArtistQuery(e.target.value)} placeholder="Search artists..." />
              {artistQuery.trim() && (
                <div className="absolute left-0 top-full z-[80] mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-xl">
                  {visibleArtists.length ? visibleArtists.map((artist: any) => {
                    const selected = selectedArtistIds.includes(artist.id);
                    return (
                      <button key={artist.id} type="button" onClick={() => toggleArtist(artist.id)} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-surface-elevated">
                        <span>
                          <span className="block text-sm text-text-accent">{artist.display_name || artist.stage_name || artist.name}</span>
                          <span className="block text-xs text-text-secondary">{artist.aka || artist.kind || ""}</span>
                        </span>
                        {selected ? <X size={15} className="text-accent" /> : <Plus size={15} className="text-text-secondary" />}
                      </button>
                    );
                  }) : <p className="px-3 py-3 text-xs text-text-secondary">No artists found.</p>}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedArtists.length ? selectedArtists.map((artist: any) => (
                <span key={artist.id} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-accent">
                  <UserRound size={14} className="text-accent" />
                  {artist.display_name || artist.stage_name || artist.name}
                  <button type="button" onClick={() => toggleArtist(artist.id)} className="text-text-secondary hover:text-danger" aria-label={`Remove ${artist.name}`}><X size={13} /></button>
                </span>
              )) : <span className="text-sm text-text-secondary">No release artists linked.</span>}
            </div>
          </div>
        </Card>

        <ReleaseTrackList
          releaseId={Number(id)}
          tracks={orderedTracks}
          availableTracks={tracks}
          artists={artists}
          onTrackOrderChange={setSelectedTrackIds}
          onError={setError}
        />

        <div className="pt-2">
          <h2 className="text-base font-semibold text-text-accent">Release resources</h2>
          <p className="mt-1 text-sm text-text-secondary">Supporting documents, financial records, media links, artist roles and contract references live here so they do not compete with the tracklist.</p>
        </div>

        <ReleaseCoreWorkspace releaseId={Number(id)} />
      </form>
    </div>
  );
}

function Field({ label, children, className = "" }: any) {
  return <label className={`block min-w-0 ${className}`}><span className={labelClass}>{label}</span>{children}</label>;
}
