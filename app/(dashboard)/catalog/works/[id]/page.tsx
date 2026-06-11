"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { ChevronLeft, Music, Building, Hash, Edit, Trash2 } from "lucide-react";

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [work, setWork] = useState<any>(null);
  const [publisher, setPublisher] = useState<any>(null);
  const [pro, setPro] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [composers, setComposers] = useState<any[]>([]);
  const [arrangers, setArrangers] = useState<any[]>([]);
  const [allArtists, setAllArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: workData } = await api.get(`/works?id=${id}`);
        setWork(workData);
        const { data: allTracks } = await api.get(`/tracks`);
        const filteredTracks = (Array.isArray(allTracks) ? allTracks : []).filter((t: any) => t.work_id === parseInt(id));
        setTracks(filteredTracks);
        if (workData.publisher_id) {
          const { data: pub } = await api.get(`/publishers?id=${workData.publisher_id}`);
          setPublisher(pub);
        }
        if (workData.pro_id) {
          const { data: p } = await api.get(`/pros?id=${workData.pro_id}`);
          setPro(p);
        }
        if ((workData.composers?.length) || (workData.arrangers?.length)) {
          const { data: artists } = await api.get(`/artists`);
          const artistList = Array.isArray(artists) ? artists : [];
          if (workData.composers) setComposers(artistList.filter((a: any) => workData.composers.includes(a.id)));
          if (workData.arrangers) setArrangers(artistList.filter((a: any) => workData.arrangers.includes(a.id)));
          setAllArtists(artistList);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!work) return <div className="p-12 text-center text-text-secondary">Work not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/works")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title={work.title} subtitle={`Work #${id}`} actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={async () => {
              const name = prompt("New title:", work.title);
              if (name && name !== work.title) {
                try { const { data } = await api.put(`/works?id=${id}`, { title: name }); setWork(data); }
                catch (e: any) { alert(e?.response?.data?.error || "Update failed"); }
              }
            }}><Edit size={14} /> Rename</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              if (window.confirm(`Delete "${work.title}"?`)) {
                try { await api.delete(`/works?id=${id}`); router.push("/catalog/works"); }
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
              <div><span className="text-text-secondary text-xs block">Title</span><span className="font-medium">{work.title}</span></div>
              <div><span className="text-text-secondary text-xs block">ISWC</span><span className="flex items-center gap-1"><Hash size={14} />{work.iswc_code || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Publisher</span><span className="flex items-center gap-1"><Building size={14} />{publisher?.name || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">PRO</span><span className="flex items-center gap-1"><Building size={14} />{pro?.name || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Created</span><span>{work.created_at ? new Date(work.created_at).toLocaleDateString() : "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Updated</span><span>{work.updated_at ? new Date(work.updated_at).toLocaleDateString() : "—"}</span></div>
            </div>
          </Card>

          {Array.isArray(work.composers_text) && work.composers_text.length > 0 && (
            <Card title="Composers">
              <div className="flex flex-wrap gap-2">
                {work.composers_text.map((c: string, i: number) => <Badge key={i} variant="primary">{c}</Badge>)}
              </div>
            </Card>
          )}

          {Array.isArray(work.arrangers_text) && work.arrangers_text.length > 0 && (
            <Card title="Arrangers">
              <div className="flex flex-wrap gap-2">
                {work.arrangers_text.map((a: string, i: number) => <Badge key={i} variant="info">{a}</Badge>)}
              </div>
            </Card>
          )}

          {composers.length > 0 && (
            <Card title="Composer Artists">
              <div className="space-y-2">
                {composers.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/artists/${c.id}`)}>
                    <Music size={16} /><span>{c.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {arrangers.length > 0 && (
            <Card title="Arranger Artists">
              <div className="space-y-2">
                {arrangers.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/artists/${a.id}`)}>
                    <Music size={16} /><span>{a.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Linked Tracks">
            {tracks.length === 0 ? <p className="text-text-secondary text-sm">No tracks linked.</p> : (
              <div className="space-y-2">
                {tracks.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => router.push(`/catalog/tracks/${t.id}`)}>
                    <span className="text-sm">{t.title}</span>
                    <Badge variant="neutral">{t.isrc_code || "—"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Quick Stats">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span>Linked Tracks</span><Badge variant="primary">{tracks.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Composers</span><Badge variant="primary">{composers.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Arrangers</span><Badge variant="primary">{arrangers.length}</Badge></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
