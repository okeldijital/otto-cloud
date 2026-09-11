"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Disc, ExternalLink, Hash, Loader2, Music, Save, Trash2, User, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import AttachmentsSection from "@/components/AttachmentsSection";
import api from "@/lib/api";

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "text-xs font-medium text-text-secondary";

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

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}><span className={labelClass}>{label}</span>{children}</label>;
}

function SelectionList({ title, items, selectedIds, onToggle, getTitle, getSubtitle, icon: Icon, empty }: any) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Icon size={16} className="text-primary" /><h3 className="text-sm font-semibold text-text-primary">{title}</h3></div>
        <span className="text-xs text-text-secondary">{selectedIds.length} selected</span>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {items.length === 0 ? <p className="py-5 text-center text-xs text-text-secondary">{empty}</p> : items.map((item: any) => {
          const selected = selectedIds.includes(item.id);
          return (
            <button key={item.id} type="button" onClick={() => onToggle(item.id)} className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition ${selected ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-white/[0.03]"}`}>
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
  const [form, setForm] = useState<any>({
    title: "", isrc_code: "", genre: "", duration: "", release_date: "", streaming_link: "",
    release_id: "", work_id: "", artist_ids: [], secondary_release_ids: [], credits: "",
  });

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

  const selectedArtists = useMemo(() => artists.filter((artist) => form.artist_ids.includes(artist.id)), [artists, form.artist_ids]);
  const selectedSecondary = useMemo(() => releases.filter((item) => form.secondary_release_ids.includes(item.id)), [releases, form.secondary_release_ids]);

  const toggleArtist = (artistId: number) => setForm((current: any) => ({ ...current, artist_ids: current.artist_ids.includes(artistId) ? current.artist_ids.filter((value: number) => value !== artistId) : [...current.artist_ids, artistId] }));
  const toggleSecondaryRelease = (releaseId: number) => setForm((current: any) => ({ ...current, secondary_release_ids: current.secondary_release_ids.includes(releaseId) ? current.secondary_release_ids.filter((value: number) => value !== releaseId) : [...current.secondary_release_ids, releaseId] }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Track title is required."); return; }
    setIsSaving(true); setError("");
    try {
      let credits: any = undefined;
      if (form.credits.trim()) {
        credits = JSON.parse(form.credits);
        if (!Array.isArray(credits)) throw new Error("Credits must be a JSON array.");
      }
      await api.put(`/tracks?id=${id}`, {
        title: form.title.trim(),
        isrc_code: form.isrc_code.trim() || null,
        genre: form.genre.trim() || null,
        duration: form.duration.trim() || null,
        release_date: form.release_date || null,
        streaming_link: form.streaming_link.trim() || null,
        release_id: form.release_id ? Number(form.release_id) : null,
        work_id: form.work_id ? Number(form.work_id) : null,
        artist_ids: form.artist_ids,
        secondary_release_ids: form.secondary_release_ids.filter((releaseId: number) => releaseId !== Number(form.release_id)),
        ...(credits !== undefined ? { credits } : { credits: null }),
      });
      await loadTrack();
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to save track.");
    } finally { setIsSaving(false); }
  };

  const cancelEdit = async () => {
    setIsEditing(false); setError(""); await loadTrack();
  };

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
      <PageHeader
        title={track.title}
        subtitle={`Track #${id}`}
        breadcrumb="Catalog / Tracks"
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? <>
              <Button variant="secondary" size="sm" onClick={cancelEdit} disabled={isSaving}><X size={14} />Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{isSaving ? "Saving..." : "Save changes"}</Button>
            </> : <>
              <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}><span className="text-base leading-none">Edit</span></Button>
              <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} />Delete</Button>
            </>}
          </div>
        }
      />

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
            {isEditing ? <SelectionList title="Linked artists" items={artists} selectedIds={form.artist_ids} onToggle={toggleArtist} getTitle={(artist: any) => artist.display_name || artist.stage_name || artist.name || `Artist #${artist.id}`} getSubtitle={(artist: any) => artist.aka || artist.kind || ""} icon={User} empty="No artists found." /> : linkedArtists.length ? <div className="flex flex-wrap gap-2">{linkedArtists.map((artist: any) => <button key={artist.id} type="button" onClick={() => router.push(`/catalog/artists/${artist.id}`)} className="inline-flex items-center gap-2 rounded-md border border-border bg-white/[0.03] px-3 py-2 text-sm text-text-primary transition hover:border-primary/40 hover:bg-primary/5"><User size={14} className="text-primary" />{artist.display_name || artist.stage_name || artist.name}</button>)}</div> : <p className="text-sm text-text-secondary">No artists linked.</p>}
          </Card>

          <Card title="Credits" subtitle="Contributor information">
            {isEditing ? <Field label="Credits JSON"><textarea className="mt-1 min-h-36 w-full rounded-lg border border-border bg-surface px-3 py-3 font-mono text-xs text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} placeholder='[{"name":"Artist","role":"Producer"}]' /></Field> : Array.isArray(track.credits) && track.credits.length ? <div className="space-y-2">{track.credits.map((credit: any, index: number) => <div key={index} className="flex items-center justify-between gap-3 rounded-md border border-border bg-white/[0.03] px-3 py-2 text-sm"><span className="font-medium text-text-primary">{credit.name || credit.contact_name || "Contributor"}</span><span className="text-text-secondary">{credit.role || "Contributor"}</span></div>)}</div> : <p className="text-sm text-text-secondary">No credits recorded.</p>}
          </Card>

          <Card title="Secondary releases" subtitle="Other releases containing this track">
            {isEditing ? <SelectionList title="Secondary releases" items={secondaryOptions} selectedIds={form.secondary_release_ids} onToggle={toggleSecondaryRelease} getTitle={(item: any) => item.title} getSubtitle={(item: any) => item.release_type || ""} icon={Disc} empty="No releases found." /> : linkedSecondary.length ? <div className="space-y-2">{linkedSecondary.map((item: any) => <button key={item.id} type="button" onClick={() => router.push(`/catalog/releases/${item.id}`)} className="flex w-full items-center gap-3 rounded-md border border-border bg-white/[0.03] px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"><Disc size={16} className="text-primary" /><span className="text-sm font-medium text-text-primary">{item.title}</span><span className="ml-auto text-xs text-text-secondary">{item.release_type || ""}</span></button>)}</div> : <p className="text-sm text-text-secondary">No secondary releases linked.</p>}
          </Card>

          <AttachmentsSection entityType="track" entityId={id} entityTitle={track.title} />
        </div>

        <div className="space-y-6">
          <Card title="Primary release" subtitle="The main release association">
            {isEditing ? <Field label="Release"><select className={fieldClass} value={form.release_id} onChange={(e) => setForm({ ...form, release_id: e.target.value, secondary_release_ids: form.secondary_release_ids.filter((rid: number) => rid !== Number(e.target.value)) })}><option value="">No primary release</option>{releases.map((item: any) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field> : release ? <button type="button" onClick={() => router.push(`/catalog/releases/${release.id}`)} className="flex w-full items-center gap-3 rounded-md border border-border bg-white/[0.03] p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"><Disc size={18} className="text-primary" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{release.title}</span><span className="block text-xs text-text-secondary">{release.release_type || "Release"}</span></span></button> : <p className="text-sm text-text-secondary">No primary release linked.</p>}
          </Card>

          <Card title="Musical work" subtitle="The underlying composition">
            {isEditing ? <Field label="Work"><select className={fieldClass} value={form.work_id} onChange={(e) => setForm({ ...form, work_id: e.target.value })}><option value="">No musical work</option>{works.map((item: any) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field> : work ? <button type="button" onClick={() => router.push(`/catalog/works/${work.id}`)} className="flex w-full items-center gap-3 rounded-md border border-border bg-white/[0.03] p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"><Music size={18} className="text-primary" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-text-primary">{work.title}</span><span className="block text-xs text-text-secondary">ISWC: {work.iswc_code || "—"}</span></span></button> : <p className="text-sm text-text-secondary">No musical work linked.</p>}
          </Card>

          <Card title="Quick stats" subtitle="Current catalog relationships">
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm text-text-primary">Artists</span><Badge variant="primary">{(track.artist_ids || []).length}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-sm text-text-primary">Secondary releases</span><Badge variant="primary">{(track.secondary_release_ids || []).length}</Badge></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
