"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { ChevronLeft, Disc, Music, User, Calendar, Tag, FileText, Edit, Trash2, ExternalLink, Upload, Loader } from "lucide-react";

function formatDuration(d: string | null): string {
  if (!d) return "";
  const parts = d.split(":");
  if (parts.length === 3) {
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const s = parseInt(parts[2]);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return d;
}

export default function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [release, setRelease] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const handleArtworkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("release_id", id);
      const { data } = await api.post("/releases/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.url) {
        await api.put(`/releases?id=${id}`, { cover_art_url: data.url });
        setRelease((prev: any) => ({ ...prev, cover_art_url: data.url }));
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload artwork");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: releaseData } = await api.get(`/releases?id=${id}&relation=tracks`);
        setRelease(releaseData);
        const [labelsRes, artistsRes, orgsRes] = await Promise.all([
          api.get(`/labels`),
          api.get(`/artists`),
          api.get(`/network/organizations`),
        ]);
        setLabels(Array.isArray(labelsRes.data) ? labelsRes.data : []);
        setArtists(Array.isArray(artistsRes.data) ? artistsRes.data : []);
        setDistributors(Array.isArray(orgsRes.data) ? orgsRes.data : []);
        setTracks(releaseData._tracks || releaseData.tracks || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!release) return <div className="p-12 text-center text-text-secondary">Release not found</div>;

  const label = labels.find((l: any) => l.id === release.label_id);
  const distributor = distributors.find((o: any) => o.id === release.distributor_id);
  const releaseArtists = (release.artist_ids || (release.artist_id ? [release.artist_id] : []))
    .map((aid: number) => artists.find((a: any) => a.id === aid))
    .filter(Boolean);

  const artistNames = releaseArtists.length > 0 ? releaseArtists.map((a: any) => a.name).join(", ") : "Unknown Artist";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/releases")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title={release.title} subtitle={artistNames} actions={
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={async () => {
              if (window.confirm(`Delete "${release.title}"?`)) {
                try { await api.delete(`/releases?id=${id}`); router.push("/catalog/releases"); }
                catch (e: any) { alert(e?.response?.data?.error || "Delete failed"); }
              }
            }}><Trash2 size={14} /> Delete</Button>
          </div>
        } />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            <div style={{ width: 240, height: 240, flexShrink: 0, borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", position: "relative" }} className="group">
              {uploading ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                  <Loader size={32} className="animate-spin" />
                </div>
              ) : release.cover_art_url ? (
                <img src={release.cover_art_url} alt={release.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                  <Disc size={64} />
                </div>
              )}
              <label style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", opacity: 0, cursor: "pointer", transition: "opacity 0.2s" }} className="group-hover:opacity-100">
                <Upload size={24} className="text-white" />
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleArtworkUpload} />
              </label>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-3">
                {release.release_type && <Badge variant="primary">{release.release_type}</Badge>}
                {label && <span className="text-sm text-text-secondary">{label.name}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1.5rem" }}>
                <div><span className="text-xs text-text-secondary uppercase tracking-wider font-bold">Release Date</span><div className="flex items-center gap-1 mt-1"><Calendar size={14} />{release.release_date ? new Date(release.release_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "TBA"}</div></div>
                <div><span className="text-xs text-text-secondary uppercase tracking-wider font-bold">Catalog #</span><div className="flex items-center gap-1 mt-1"><FileText size={14} />{release.catalog_number || "N/A"}</div></div>
                <div><span className="text-xs text-text-secondary uppercase tracking-wider font-bold">UPC</span><div className="flex items-center gap-1 mt-1"><Tag size={14} />{release.upc_code || "N/A"}</div></div>
                <div><span className="text-xs text-text-secondary uppercase tracking-wider font-bold">Streaming</span><div className="flex items-center gap-1 mt-1">{release.streaming_link ? <a href={release.streaming_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary"><ExternalLink size={14} /> Listen</a> : "—"}</div></div>
                {distributor && <div><span className="text-xs text-text-secondary uppercase tracking-wider font-bold">Distributor</span><div className="flex items-center gap-1 mt-1">{distributor.name}</div></div>}
              </div>
            </div>
          </div>

          <Card title={`Tracklist (${tracks.length} tracks)`}>
            {tracks.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <Music size={48} className="mx-auto mb-4 opacity-20" />
                <p>No tracks added to this release yet.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>
                    <th style={{ padding: "1rem 1rem", width: 50 }}>#</th>
                    <th style={{ padding: "1rem 1rem" }}>Title</th>
                    <th style={{ padding: "1rem 1rem" }}>ISRC</th>
                    <th style={{ padding: "1rem 1rem" }}>Duration</th>
                    <th style={{ padding: "1rem 1rem" }}>Genre</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track: any, index: number) => (
                    <tr key={track.id} className="cursor-pointer hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                      onClick={() => router.push(`/catalog/tracks/${track.id}`)}>
                      <td style={{ padding: "0.75rem 1rem", color: "#94a3b8" }}>{index + 1}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{track.title}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: "0.875rem" }}>{track.isrc_code || "—"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: "0.875rem" }}>{formatDuration(track.duration)}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: "0.875rem" }}>{track.genre || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {Array.isArray(release.credits) && release.credits.length > 0 && (
            <Card title="Credits">
              <div className="space-y-2">
                {release.credits.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1">
                    <span className="font-medium">{c.name || c.contact_name}</span>
                    <span className="text-text-secondary">— {c.role || "Contributor"}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Artists">
            {releaseArtists.length === 0 ? <p className="text-text-secondary text-sm">No artists</p> : (
              <div className="space-y-2">
                {releaseArtists.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/artists/${a.id}`)}>
                    <User size={16} /><span className="text-sm">{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Quick Stats">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span>Tracks</span><Badge variant="primary">{tracks.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Artists</span><Badge variant="primary">{releaseArtists.length}</Badge></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
