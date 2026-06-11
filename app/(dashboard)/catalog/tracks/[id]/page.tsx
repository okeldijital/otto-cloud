"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { ChevronLeft, Music, Disc, Clock, Hash, User, Edit, Trash2, ExternalLink } from "lucide-react";

function formatDuration(d: string | null): string {
  if (!d) return "—";
  if (d.includes(":")) return d;
  return d;
}

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<any>(null);
  const [release, setRelease] = useState<any>(null);
  const [work, setWork] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [secondaryReleases, setSecondaryReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: trackData } = await api.get(`/tracks?id=${id}`);
        setTrack(trackData);
        const promises: Promise<any>[] = [api.get(`/artists`)];
        if (trackData.release_id) promises.push(api.get(`/releases?id=${trackData.release_id}`));
        if (trackData.work_id) promises.push(api.get(`/works?id=${trackData.work_id}`));
        if (trackData.secondary_release_ids?.length) {
          trackData.secondary_release_ids.forEach((rid: number) => promises.push(api.get(`/releases?id=${rid}`)));
        }
        const results = await Promise.all(promises);
        const allArtists = Array.isArray(results[0].data) ? results[0].data : [];
        let idx = 1;
        if (trackData.release_id) setRelease(results[idx++].data);
        if (trackData.work_id) setWork(results[idx++].data);
        if (trackData.secondary_release_ids?.length) {
          const secs = [];
          for (let i = 0; i < trackData.secondary_release_ids.length; i++) {
            const r = results[idx++];
            if (r?.data) secs.push(r.data);
          }
          setSecondaryReleases(secs);
        }
        if (trackData.artist_ids?.length) {
          setArtists(allArtists.filter((a: any) => trackData.artist_ids.includes(a.id)));
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!track) return <div className="p-12 text-center text-text-secondary">Track not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/tracks")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title={track.title} subtitle={`Track #${id}`} actions={
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={async () => {
              if (window.confirm(`Delete "${track.title}"?`)) {
                try { await api.delete(`/tracks?id=${id}`); router.push("/catalog/tracks"); }
                catch (e: any) { alert(e?.response?.data?.error || "Delete failed"); }
              }
            }}><Trash2 size={14} /> Delete</Button>
          </div>
        } />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Details">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-text-secondary text-xs block">Title</span><span className="font-medium">{track.title}</span></div>
              <div><span className="text-text-secondary text-xs block">ISRC</span><span className="flex items-center gap-1"><Hash size={14} />{track.isrc_code || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Genre</span><span>{track.genre || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Duration</span><span className="flex items-center gap-1"><Clock size={14} />{formatDuration(track.duration)}</span></div>
              <div><span className="text-text-secondary text-xs block">Release Date</span><span>{track.release_date ? new Date(track.release_date).toLocaleDateString() : "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Streaming</span><span>{track.streaming_link ? <a href={track.streaming_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary"><ExternalLink size={14} /> Listen</a> : "—"}</span></div>
            </div>
          </Card>

          {artists.length > 0 && (
            <Card title="Artists">
              <div className="space-y-2">
                {artists.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/artists/${a.id}`)}>
                    <User size={16} /><span>{a.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {Array.isArray(track.credits) && track.credits.length > 0 && (
            <Card title="Credits">
              <div className="space-y-2">
                {track.credits.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm"><span className="font-medium">{c.name || c.contact_name}</span><span className="text-text-secondary">— {c.role || "Contributor"}</span></div>
                ))}
              </div>
            </Card>
          )}

          {secondaryReleases.length > 0 && (
            <Card title="Secondary Releases">
              <div className="space-y-2">
                {secondaryReleases.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/releases/${r.id}`)}>
                    <Disc size={16} /><span>{r.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {release && (
            <Card title="Primary Release">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/releases/${release.id}`)}>
                <Disc size={16} /><div><div className="font-medium">{release.title}</div><div className="text-text-secondary text-xs">{release.release_type || ""}</div></div>
              </div>
            </Card>
          )}
          {work && (
            <Card title="Musical Work">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/works/${work.id}`)}>
                <Music size={16} /><div><div className="font-medium">{work.title}</div><div className="text-text-secondary text-xs">ISWC: {work.iswc_code || "—"}</div></div>
              </div>
            </Card>
          )}
          <Card title="Quick Stats">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span>Artists</span><Badge variant="primary">{artists.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Secondary Releases</span><Badge variant="primary">{secondaryReleases.length}</Badge></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
