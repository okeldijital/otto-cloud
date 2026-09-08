"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import AttachmentsSection from "@/components/AttachmentsSection";
import api from "@/lib/api";
import { ChevronLeft, Music, Disc, Clock, Hash, User, Edit, Trash2, ExternalLink, Save, X } from "lucide-react";

function formatDuration(d: string | null): string {
  if (!d) return "";
  if (d.includes("T")) return d.replace(/^.*T/, "").replace(/\.\d+Z$/, "");
  return d;
}

function formatDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

function unwrap<T = any>(value: any): T | null {
  if (Array.isArray(value)) return (value[0] as T) || null;
  if (value?.items && Array.isArray(value.items)) return (value.items[0] as T) || null;
  return value || null;
}

function unwrapMany<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  return value ? [value as T] : [];
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
    title: "",
    isrc_code: "",
    genre: "",
    duration: "",
    release_date: "",
    streaming_link: "",
    release_id: "",
    work_id: "",
    artist_ids: [] as number[],
    secondary_release_ids: [] as number[],
    credits: "",
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

    setArtists(allArtists);
    setRelease(primaryRelease);
    setWork(linkedWork);
    setReleases(allReleases);
    setWorks(allWorks);

    const secondaryIds = Array.isArray(trackData.secondary_release_ids) ? trackData.secondary_release_ids : [];
    const secondary = allReleases.filter((r: any) => secondaryIds.includes(r.id));
    setSecondaryReleases(secondary);

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
      try {
        await loadTrack();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const toggleArtist = (artistId: number) => {
    setForm((current: any) => ({
      ...current,
      artist_ids: current.artist_ids.includes(artistId)
        ? current.artist_ids.filter((value: number) => value !== artistId)
        : [...current.artist_ids, artistId],
    }));
  };

  const toggleSecondaryRelease = (releaseId: number) => {
    setForm((current: any) => ({
      ...current,
      secondary_release_ids: current.secondary_release_ids.includes(releaseId)
        ? current.secondary_release_ids.filter((value: number) => value !== releaseId)
        : [...current.secondary_release_ids, releaseId],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
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
      setError(err?.response?.data?.error || err?.message || "Failed to save track");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${track.title}"?`)) return;
    try {
      await api.delete(`/tracks?id=${id}`);
      router.push("/catalog/tracks");
    } catch (e: any) {
      alert(e?.response?.data?.error || "Delete failed");
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!track) return <div className="p-12 text-center text-text-secondary">Track not found</div>;

  const visibleSecondaryReleases = isEditing
    ? releases.filter((r) => r.id !== Number(form.release_id))
    : secondaryReleases;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/tracks")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title={track.title} subtitle={`Track #${id}`} actions={
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setIsEditing(false); setError(""); loadTrack(); }} disabled={isSaving}>
                  <X size={14} /> Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save size={14} /> {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit size={14} /> Edit
                </Button>
                <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} /> Delete</Button>
              </>
            )}
          </div>
        } />
      </div>

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Metadata">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="text-xs text-text-secondary block mb-1">Title *</label><input className="input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div><label className="text-xs text-text-secondary block mb-1">ISRC</label><input className="input w-full" value={form.isrc_code} onChange={(e) => setForm({ ...form, isrc_code: e.target.value })} /></div>
                <div><label className="text-xs text-text-secondary block mb-1">Genre</label><input className="input w-full" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} /></div>
                <div><label className="text-xs text-text-secondary block mb-1">Duration</label><input className="input w-full" placeholder="3:45" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
                <div><label className="text-xs text-text-secondary block mb-1">Release Date</label><input type="date" className="input w-full" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} /></div>
                <div className="md:col-span-2"><label className="text-xs text-text-secondary block mb-1">Streaming Link</label><input type="url" className="input w-full" value={form.streaming_link} onChange={(e) => setForm({ ...form, streaming_link: e.target.value })} placeholder="https://..." /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-text-secondary text-xs block">Title</span><span className="font-medium">{track.title}</span></div>
                <div><span className="text-text-secondary text-xs block">ISRC</span><span className="flex items-center gap-1"><Hash size={14} />{track.isrc_code || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Genre</span><span>{track.genre || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Duration</span><span className="flex items-center gap-1"><Clock size={14} />{formatDuration(track.duration) || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Release Date</span><span>{track.release_date ? new Date(track.release_date).toLocaleDateString() : "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Streaming</span><span>{track.streaming_link ? <a href={track.streaming_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary"><ExternalLink size={14} /> Listen</a> : "—"}</span></div>
              </div>
            )}
          </Card>

          <Card title="Artists">
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {artists.map((artist: any) => (
                  <label key={artist.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm cursor-pointer hover:bg-white/10">
                    <input type="checkbox" checked={form.artist_ids.includes(artist.id)} onChange={() => toggleArtist(artist.id)} />
                    <User size={14} /><span>{artist.name}</span>
                  </label>
                ))}
              </div>
            ) : artists.filter((a: any) => (track.artist_ids || []).includes(a.id)).length > 0 ? (
              <div className="space-y-2">{artists.filter((a: any) => (track.artist_ids || []).includes(a.id)).map((a: any) => <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/artists/${a.id}`)}><User size={16} /><span>{a.name}</span></div>)}</div>
            ) : <p className="text-sm text-text-secondary">No artists linked.</p>}
          </Card>

          <Card title="Credits">
            {isEditing ? (
              <textarea className="input w-full min-h-40 font-mono text-xs" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} placeholder='[{"name":"Artist","role":"Producer"}]' />
            ) : Array.isArray(track.credits) && track.credits.length > 0 ? (
              <div className="space-y-2">{track.credits.map((c: any, i: number) => <div key={i} className="flex items-center gap-2 text-sm"><span className="font-medium">{c.name || c.contact_name}</span><span className="text-text-secondary">— {c.role || "Contributor"}</span></div>)}</div>
            ) : <p className="text-sm text-text-secondary">No credits recorded.</p>}
          </Card>

          <Card title="Secondary Releases">
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {visibleSecondaryReleases.map((r: any) => (
                  <label key={r.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm cursor-pointer hover:bg-white/10">
                    <input type="checkbox" checked={form.secondary_release_ids.includes(r.id)} onChange={() => toggleSecondaryRelease(r.id)} />
                    <Disc size={14} /><span>{r.title}</span>
                  </label>
                ))}
              </div>
            ) : secondaryReleases.length > 0 ? (
              <div className="space-y-2">{secondaryReleases.map((r: any) => <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/releases/${r.id}`)}><Disc size={16} /><span>{r.title}</span></div>)}</div>
            ) : <p className="text-sm text-text-secondary">No secondary releases linked.</p>}
          </Card>

          <AttachmentsSection entityType="track" entityId={id} entityTitle={track.title} />
        </div>

        <div className="space-y-6">
          <Card title="Primary Release">
            {isEditing ? (
              <select className="input w-full" value={form.release_id} onChange={(e) => setForm({ ...form, release_id: e.target.value, secondary_release_ids: form.secondary_release_ids.filter((rid: number) => rid !== Number(e.target.value)) })}>
                <option value="">No Primary Release</option>
                {releases.map((r: any) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            ) : release ? (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/releases/${release.id}`)}><Disc size={16} /><div><div className="font-medium">{release.title}</div><div className="text-text-secondary text-xs">{release.release_type || ""}</div></div></div>
            ) : <p className="text-sm text-text-secondary">No Primary Release linked.</p>}
          </Card>

          <Card title="Musical Work">
            {isEditing ? (
              <select className="input w-full" value={form.work_id} onChange={(e) => setForm({ ...form, work_id: e.target.value })}>
                <option value="">No Musical Work</option>
                {works.map((w: any) => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
            ) : work ? (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/works/${work.id}`)}><Music size={16} /><div><div className="font-medium">{work.title}</div><div className="text-text-secondary text-xs">ISWC: {work.iswc_code || "—"}</div></div></div>
            ) : <p className="text-sm text-text-secondary">No Musical Work linked.</p>}
          </Card>

          <Card title="Quick Stats">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span>Artists</span><Badge variant="primary">{(track.artist_ids || []).length}</Badge></div>
              <div className="flex items-center justify-between"><span>Secondary Releases</span><Badge variant="primary">{(track.secondary_release_ids || []).length}</Badge></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
