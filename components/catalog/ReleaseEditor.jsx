"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Image as ImageIcon, Link2, Loader2, Plus, Search, Save, Trash2, UserRound, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import api from "@/lib/api";
import { invalidateEntityArtwork } from "@/hooks/useAttachment";
import { optimizeImage } from "@/lib/media/image-optimization";

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "text-xs font-medium text-text-secondary";

const listItems = (response) => {
  const value = response?.data;
  return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
};

function Field({ label, children, className = "" }) {
  return <label className={`block min-w-0 ${className}`}><span className={labelClass}>{label}</span>{children}</label>;
}

function Picker({ title, icon: Icon, query, setQuery, items, selectedIds, onToggle, getTitle, getSubtitle, empty }) {
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? items.filter((item) => `${getTitle(item)} ${getSubtitle(item)}`.toLowerCase().includes(q)) : items).slice(0, 12);
  }, [items, query, getTitle, getSubtitle]);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Icon size={16} className="text-primary" /><h4 className="text-sm font-semibold text-text-primary">{title}</h4></div>
        <span className="text-xs text-text-secondary">{selectedIds.length} selected</span>
      </div>
      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input className={`${fieldClass} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} />
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
        {visible.length === 0 ? <p className="py-4 text-center text-xs text-text-secondary">{empty}</p> : visible.map((item) => {
          const selected = selectedIds.includes(item.id);
          return <button key={item.id} type="button" onClick={() => onToggle(item.id)} className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition ${selected ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-white/[0.03]"}`}>
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{getTitle(item)}</span><span className="block truncate text-xs text-text-secondary">{getSubtitle(item)}</span></span>
            {selected ? <Check size={15} className="shrink-0 text-primary" /> : <Plus size={15} className="shrink-0 text-text-secondary" />}
          </button>;
        })}
      </div>
    </div>
  );
}

export default function ReleaseEditor({ releaseId, release, artists, labels, distributors, tracks, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    title: release.title || "",
    release_type: release.release_type || "Single",
    release_date: release.release_date ? String(release.release_date).slice(0, 10) : "",
    catalog_number: release.catalog_number || "",
    upc_code: release.upc_code || "",
    streaming_link: release.streaming_link || "",
    label_id: release.label_id ? String(release.label_id) : "",
    distributor_id: release.distributor_id ? String(release.distributor_id) : "",
  });
  const initialArtists = Array.isArray(release.artist_ids) ? release.artist_ids : (release.artist_id ? [release.artist_id] : []);
  const initialTracks = Array.isArray(release._tracks) ? release._tracks.map((track) => track.id) : [];
  const [selectedArtistIds, setSelectedArtistIds] = useState(initialArtists);
  const [selectedTrackIds, setSelectedTrackIds] = useState(initialTracks);
  const [artistQuery, setArtistQuery] = useState("");
  const [trackQuery, setTrackQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      title: release.title || "",
      release_type: release.release_type || "Single",
      release_date: release.release_date ? String(release.release_date).slice(0, 10) : "",
      catalog_number: release.catalog_number || "",
      upc_code: release.upc_code || "",
      streaming_link: release.streaming_link || "",
      label_id: release.label_id ? String(release.label_id) : "",
      distributor_id: release.distributor_id ? String(release.distributor_id) : "",
    });
    setSelectedArtistIds(Array.isArray(release.artist_ids) ? release.artist_ids : (release.artist_id ? [release.artist_id] : []));
    setSelectedTrackIds(Array.isArray(release._tracks) ? release._tracks.map((track) => track.id) : []);
  }, [release]);

  const selectedArtists = useMemo(() => artists.filter((artist) => selectedArtistIds.includes(artist.id)), [artists, selectedArtistIds]);
  const selectedTracks = useMemo(() => tracks.filter((track) => selectedTrackIds.includes(track.id)), [tracks, selectedTrackIds]);

  const toggle = (setter) => (id) => setter((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);

  const save = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) { setError("Release title is required."); return; }
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.put(`/releases?id=${releaseId}`, {
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
      await onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to save release.");
    } finally { setSaving(false); }
  };

  const uploadArtwork = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const optimized = await optimizeImage(file, "artwork");
      const response = await api.post("/storage/upload-url", { entityType: "release", entityId: String(releaseId), fileName: optimized.name, mimeType: optimized.type, fileSize: optimized.size, folder: "releases" });
      const upload = response.data;
      const r2 = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": optimized.type }, body: optimized });
      if (!r2.ok) throw new Error(`Artwork upload failed (${r2.status})`);
      await api.post("/storage/complete", { entityType: "release", entityId: String(releaseId), key: upload.key, fileName: upload.fileName, originalName: file.name, mimeType: optimized.type, fileSize: optimized.size });
      invalidateEntityArtwork("release", releaseId);
      await onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to update artwork.");
    } finally { setUploading(false); event.target.value = ""; }
  };

  const deleteRelease = async () => {
    if (!window.confirm(`Delete release \"${release.title}\"? This cannot be undone.`)) return;
    try { await api.delete(`/releases?id=${releaseId}`); onDeleted(); }
    catch (err) { setError(err?.response?.data?.error || "Unable to delete release."); }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Release</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Edit release</h2><p className="mt-1 text-sm text-text-secondary">Update metadata, artwork, links, artists, and tracks from one page.</p></div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-primary">Saved</span>}
          <Button type="submit" variant="primary" size="sm" disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? "Saving..." : "Save changes"}</Button>
          <Button type="button" variant="danger" size="sm" onClick={deleteRelease}><Trash2 size={14} />Delete</Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card title="Metadata" subtitle="Core release information">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Release title" className="md:col-span-2"><input className={fieldClass} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Release type"><select className={fieldClass} value={form.release_type} onChange={(e) => setForm({ ...form, release_type: e.target.value })}><option>Single</option><option>EP</option><option>Album</option><option>Compilation</option></select></Field>
              <Field label="Release date"><input className={fieldClass} type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} /></Field>
              <Field label="Catalog number"><input className={fieldClass} value={form.catalog_number} onChange={(e) => setForm({ ...form, catalog_number: e.target.value })} placeholder="e.g. MZA0082" /></Field>
              <Field label="UPC"><input className={fieldClass} value={form.upc_code} onChange={(e) => setForm({ ...form, upc_code: e.target.value })} placeholder="UPC / barcode" /></Field>
              <Field label="Streaming link" className="md:col-span-2"><div className="relative"><Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" /><input className={`${fieldClass} pl-9`} type="url" value={form.streaming_link} onChange={(e) => setForm({ ...form, streaming_link: e.target.value })} placeholder="https://..." /></div></Field>
              <Field label="Label"><select className={fieldClass} value={form.label_id} onChange={(e) => setForm({ ...form, label_id: e.target.value })}><option value="">No label</option>{labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}</select></Field>
              <Field label="Distributor"><select className={fieldClass} value={form.distributor_id} onChange={(e) => setForm({ ...form, distributor_id: e.target.value })}><option value="">No distributor</option>{distributors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Picker title="Artists" icon={UserRound} query={artistQuery} setQuery={setArtistQuery} items={artists} selectedIds={selectedArtistIds} onToggle={toggle(setSelectedArtistIds)} getTitle={(artist) => artist.display_name || artist.stage_name || artist.name || `Artist #${artist.id}`} getSubtitle={(artist) => artist.aka || artist.kind || ""} empty="No artists found." />
            <Picker title="Tracks" icon={MusicIcon} query={trackQuery} setQuery={setTrackQuery} items={tracks} selectedIds={selectedTrackIds} onToggle={toggle(setSelectedTrackIds)} getTitle={(track) => track.title || `Track #${track.id}`} getSubtitle={(track) => track.isrc_code || ""} empty="No tracks found." />
          </div>

          <Card title="Linked items" subtitle="Current release associations">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><p className={labelClass}>Artists</p><div className="mt-2 flex flex-wrap gap-2">{selectedArtists.length ? selectedArtists.map((artist) => <span key={artist.id} className="inline-flex items-center gap-1 rounded-md border border-border bg-white/5 px-2 py-1 text-xs text-text-primary">{artist.name || artist.display_name}<button type="button" onClick={() => toggle(setSelectedArtistIds)(artist.id)} className="text-text-secondary hover:text-danger"><X size={12} /></button></span>) : <span className="text-xs text-text-secondary">No artists linked.</span>}</div></div>
              <div><p className={labelClass}>Tracks</p><div className="mt-2 flex flex-wrap gap-2">{selectedTracks.length ? selectedTracks.map((track) => <span key={track.id} className="inline-flex items-center gap-1 rounded-md border border-border bg-white/5 px-2 py-1 text-xs text-text-primary">{track.title}<button type="button" onClick={() => toggle(setSelectedTrackIds)(track.id)} className="text-text-secondary hover:text-danger"><X size={12} /></button></span>) : <span className="text-xs text-text-secondary">No tracks linked.</span>}</div></div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Artwork" subtitle="Replace the release artwork without leaving the page">
            <div className="overflow-hidden rounded-lg border border-border bg-white/[0.03]">
              <div className="aspect-square w-full">
                <div className="flex h-full w-full items-center justify-center text-text-secondary"><ImageIcon size={42} className="opacity-20" /></div>
              </div>
            </div>
            <label className="mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-primary transition hover:border-primary/50 hover:bg-surface-elevated">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}{uploading ? "Uploading..." : "Change artwork"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadArtwork} disabled={uploading} />
            </label>
          </Card>

          <Card title="Rights & relationships" subtitle="Core catalog relationships">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Label</p><p className="mt-1 text-text-primary">{labels.find((item) => String(item.id) === String(form.label_id))?.name || "Not linked"}</p></div>
              <div className="rounded-lg border border-border bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Publisher / PRO</p><p className="mt-1 text-xs leading-5 text-text-secondary">Publishing and PRO relationships are currently authoritative at Work level. They should not be duplicated onto Release until a canonical Release ↔ Publisher/PRO relation is defined.</p></div>
            </div>
          </Card>

          <Card title="Release status">
            <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Current status</span><span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold capitalize text-primary">{release.status || "draft"}</span></div>
          </Card>
        </div>
      </div>
    </form>
  );
}

function MusicIcon(props) { return <span className="inline-flex" {...props}>♪</span>; }
