"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EntityArtwork from "@/components/media/EntityArtwork";
import { invalidateEntityArtwork } from "@/hooks/useAttachment";
import { optimizeImage } from "@/lib/media/image-optimization";
import api from "@/lib/api";
import { ArrowLeft, Building, Edit, Hash, Link2, Loader, Music, Trash2, Upload } from "lucide-react";

const asList = (value: any) => Array.isArray(value) ? value : value?.items || [];
const errorMessage = (err: any, fallback: string) => err?.response?.data?.error || fallback;

export default function PublisherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [publisher, setPublisher] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [workRelations, setWorkRelations] = useState<any[]>([]);
  const [allArtists, setAllArtists] = useState<any[]>([]);
  const [allWorks, setAllWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState("");
  const [selectedWork, setSelectedWork] = useState("");

  const fetchData = async () => {
    try {
      const [{ data: publisherData }, { data: artistData }, { data: relationData }, { data: artistList }, { data: workList }] = await Promise.all([
        api.get(`/publishers?id=${id}`),
        api.get(`/publishers?id=${id}&relation=artists`),
        api.get(`/publishers/relations?publisherId=${id}`),
        api.get("/artists?limit=100"),
        api.get("/works?limit=100"),
      ]);
      setPublisher(publisherData);
      setArtists(asList(artistData));
      setWorkRelations(asList(relationData));
      setAllArtists(asList(artistList));
      setAllWorks(asList(workList));
    } catch (err) { console.error("Failed to load publisher detail:", err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, [id]);

  const unassignedArtists = useMemo(() => allArtists.filter((a) => !artists.some((linked) => linked.id === a.id)), [allArtists, artists]);
  const assignedWorkIds = useMemo(() => new Set(workRelations.map((r) => r.work_id ?? r.works?.id)), [workRelations]);
  const unassignedWorks = useMemo(() => allWorks.filter((w) => !assignedWorkIds.has(w.id)), [allWorks, assignedWorkIds]);

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const optimized = await optimizeImage(file, "avatar");
      const { data } = await api.post("/storage/upload-url", { entityType: "publisher", entityId: Number(id), fileName: optimized.name, mimeType: optimized.type, fileSize: optimized.size, folder: "publisher" });
      const uploadUrl = data.uploadUrl;
      const uploadKey = data.key ?? data.storageKey;
      if (!uploadUrl || !uploadKey) throw new Error("Storage upload authorization was incomplete.");
      const uploadResponse = await fetch(uploadUrl, { method: "PUT", body: optimized, headers: { "Content-Type": optimized.type } });
      if (!uploadResponse.ok) throw new Error(`Logo upload failed (${uploadResponse.status})`);
      await api.post("/storage/complete", { entityType: "publisher", entityId: Number(id), key: uploadKey, fileName: data.fileName, originalName: file.name, mimeType: optimized.type, fileSize: optimized.size });
      invalidateEntityArtwork("publisher", Number(id));
      await fetchData();
    } catch (err) { alert(errorMessage(err, "Logo upload failed")); }
    finally { setUploading(false); }
  };

  const assignArtist = async () => {
    if (!selectedArtist) return;
    setAssigning(true);
    try { await api.put("/publishers/relations", { publisherId: Number(id), relation: "artist", artistId: Number(selectedArtist) }); setSelectedArtist(""); await fetchData(); }
    catch (err) { alert(errorMessage(err, "Artist assignment failed")); }
    finally { setAssigning(false); }
  };
  const assignWork = async () => {
    if (!selectedWork) return;
    setAssigning(true);
    try { await api.put("/publishers/relations", { publisherId: Number(id), relation: "work", workId: Number(selectedWork) }); setSelectedWork(""); await fetchData(); }
    catch (err) { alert(errorMessage(err, "Work assignment failed")); }
    finally { setAssigning(false); }
  };
  const removeArtist = async (artistId: number) => { if (!window.confirm("Remove this artist from the publisher?")) return; try { await api.delete(`/publishers/relations?publisherId=${id}&relation=artist&entityId=${artistId}`); await fetchData(); } catch (err) { alert(errorMessage(err, "Artist removal failed")); } };
  const removeWork = async (workId: number) => { if (!window.confirm("Remove this work from the publisher?")) return; try { await api.delete(`/publishers/relations?publisherId=${id}&relation=work&entityId=${workId}`); await fetchData(); } catch (err) { alert(errorMessage(err, "Work removal failed")); } };

  const handleRename = async () => { const name = window.prompt("Publisher name:", publisher.name || ""); if (!name || name === publisher.name) return; try { const { data } = await api.put(`/publishers?id=${id}`, { name }); setPublisher(data); } catch (err: any) { alert(errorMessage(err, "Update failed")); } };
  const handleDelete = async () => { if (!window.confirm(`Delete publisher "${publisher.name}"?`)) return; try { await api.delete(`/publishers?id=${id}`); router.push("/catalog/publishers"); } catch (err: any) { alert(errorMessage(err, "Delete failed")); } };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!publisher) return <div className="p-12 text-center text-text-secondary">Publisher not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><button onClick={() => router.push("/catalog/publishers")} className="text-text-secondary hover:text-white transition-colors" aria-label="Back to publishers"><ArrowLeft size={20} /></button><PageHeader title={publisher.name || "Publisher"} subtitle={`Publisher #${id}`} actions={<div className="flex gap-2"><Button variant="secondary" size="sm" onClick={handleRename}><Edit size={14} /> Rename</Button><Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} /> Delete</Button></div>} /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Identity"><div className="flex items-center gap-5"><div className="relative group"><EntityArtwork entityType="publisher" entityId={Number(id)} size={96} /><label className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" title="Upload publisher logo">{uploading ? <Loader className="animate-spin" size={22} /> : <Upload size={22} />}<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleLogoUpload(file); e.currentTarget.value = ""; }} /></label></div><div className="space-y-2"><div><span className="text-text-secondary text-xs block">Name</span><span className="font-medium">{publisher.name || "—"}</span></div><div><span className="text-text-secondary text-xs block">Publisher ID</span><span className="flex items-center gap-1"><Hash size={14} />{publisher.publisher_id || "—"}</span></div><p className="text-xs text-text-secondary">Hover the logo to upload a publisher avatar.</p></div></div></Card>
          <Card title="Linked Artists"><div className="flex gap-2 mb-4"><select className="input flex-1" value={selectedArtist} onChange={(e) => setSelectedArtist(e.target.value)}><option value="">Select an artist…</option>{unassignedArtists.map((a) => <option key={a.id} value={a.id}>{a.aka || a.name}</option>)}</select><Button variant="primary" size="sm" disabled={!selectedArtist || assigning} onClick={assignArtist}><Link2 size={14} /> Assign</Button></div>{artists.length === 0 ? <p className="text-text-secondary text-sm">No artists linked to this publisher.</p> : <div className="space-y-2">{artists.map((artist) => <div key={artist.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5"><button className="flex items-center gap-3 cursor-pointer hover:text-white" onClick={() => router.push(`/catalog/artists/${artist.id}`)}><Music size={16} /><span>{artist.aka || artist.name}</span></button><Button variant="ghost" size="sm" onClick={() => removeArtist(artist.id)}>Remove</Button></div>)}</div>}</Card>
        </div>
        <div className="space-y-6">
          <Card title="Linked Works"><div className="space-y-3 mb-4"><select className="input w-full" value={selectedWork} onChange={(e) => setSelectedWork(e.target.value)}><option value="">Select a work…</option>{unassignedWorks.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select><Button variant="primary" size="sm" disabled={!selectedWork || assigning} onClick={assignWork}><Link2 size={14} /> Assign Work</Button></div>{workRelations.length === 0 ? <p className="text-text-secondary text-sm">No works linked to this publisher.</p> : <div className="space-y-2">{workRelations.map((rel) => { const work = rel.works || {}; return <div key={rel.id} className="p-2 rounded-lg bg-white/5"><div className="flex items-center justify-between gap-2"><button className="text-sm flex items-center gap-2 hover:text-white" onClick={() => router.push(`/catalog/works/${work.id}`)}><Building size={15} />{work.title || "Untitled work"}</button><Button variant="ghost" size="sm" onClick={() => removeWork(work.id)}>Remove</Button></div><div className="mt-2 flex gap-2 flex-wrap">{rel.share_percent != null && <Badge variant="neutral">Share {rel.share_percent}%</Badge>}{rel.controlled_share_percent != null && <Badge variant="neutral">Controlled {rel.controlled_share_percent}%</Badge>}{rel.is_administrator && <Badge variant="primary">Administrator</Badge>}</div></div>; })}</div>}</Card>
          <Card title="Quick Stats"><div className="space-y-2"><div className="flex items-center justify-between"><span>Linked Works</span><Badge variant="primary">{workRelations.length}</Badge></div><div className="flex items-center justify-between"><span>Linked Artists</span><Badge variant="primary">{artists.length}</Badge></div></div></Card>
        </div>
      </div>
    </div>
  );
}
