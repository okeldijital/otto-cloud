"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import EntityArtwork from "@/components/media/EntityArtwork";
import api from "@/lib/api";
import { invalidateEntityArtwork, useAttachment } from "@/hooks/useAttachment";
import { optimizeImage } from "@/lib/media/image-optimization";
import { ArrowLeft, Building, Edit, Hash, ImagePlus, Mail, MapPin, Music, Phone, Trash2, Globe } from "lucide-react";

function asList(payload: any): any[] { return Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : []; }

export default function ProDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pro, setPro] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const { url: artworkUrl } = useAttachment("publisher", id);

  const fetchData = async () => {
    try {
      const [{ data: proData }, { data: artistData }, { data: workData }] = await Promise.all([
        api.get(`/pros?id=${id}`), api.get(`/pros?id=${id}&relation=artists`), api.get(`/pros?id=${id}&relation=works`),
      ]);
      setPro(proData); setArtists(asList(artistData)); setWorks(asList(workData));
    } catch (err) { console.error("Failed to load PRO detail:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleEditClick = () => {
    if (!pro) return;
    setEditData({ name: pro.name || "", pro_id: pro.pro_id || "", address: pro.address || "", contact_email: pro.contact_email || "", contact_phone: pro.contact_phone || "", website: pro.website || "", territory: pro.territory || "" });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const { data } = await api.put(`/pros?id=${id}`, { name: editData.name.trim(), pro_id: editData.pro_id.trim() || null, address: editData.address.trim() || null, contact_email: editData.contact_email.trim() || null, contact_phone: editData.contact_phone.trim() || null, website: editData.website.trim() || null, territory: editData.territory.trim() || null });
      setPro(data); setEditOpen(false);
    } catch (err: any) { alert(err?.response?.data?.error || "Failed to update PRO"); }
    finally { setSubmitting(false); }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !id) return;
    setUploading(true);
    try {
      const optimized = await optimizeImage(file, "avatar");
      const res = await api.post("/storage/upload-url", { entityType: "publisher", entityId: String(id), fileName: optimized.name, mimeType: optimized.type, fileSize: optimized.size, folder: "avatars" });
      const { uploadUrl, attachmentId } = res.data;
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": optimized.type }, body: optimized });
      await api.post("/storage/complete", { attachmentId });
      invalidateEntityArtwork("publisher", id);
      window.location.reload();
    } catch (err: any) { alert(err?.response?.data?.error || err?.message || "Failed to upload PRO artwork"); }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete PRO \"${pro.name}\"?`)) return;
    try { await api.delete(`/pros?id=${id}`); router.push("/catalog/pros"); }
    catch (err: any) { alert(err?.response?.data?.error || "Delete failed"); }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!pro) return <div className="p-12 text-center text-text-secondary">PRO not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/pros")} className="text-text-secondary hover:text-white transition-colors" aria-label="Back to PROs"><ArrowLeft size={20} /></button>
        <PageHeader title={pro.name || "PRO"} subtitle={pro.pro_id ? `PRO ID ${pro.pro_id}` : "Performance Rights Organization"} actions={<div className="flex gap-2"><Button variant="secondary" size="sm" onClick={handleEditClick}><Edit size={14} /> Edit</Button><Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} /> Delete</Button></div>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Identity">
            <div className="flex gap-4 items-start">
              <label className="relative block shrink-0 cursor-pointer group" title="Upload PRO artwork">
                <EntityArtwork entityType="publisher" entityId={id} src={artworkUrl} alt={pro.name} size={96} placeholder="label" className="rounded-xl" />
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">{uploading ? <span className="text-xs">Uploading…</span> : <ImagePlus size={22} />}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleUpload} disabled={uploading} />
              </label>
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div><span className="text-text-secondary text-xs block">Name</span><span>{pro.name || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">PRO ID</span><span className="flex items-center gap-1"><Hash size={14} />{pro.pro_id || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Record ID</span><span>#{pro.id}</span></div>
                <div><span className="text-text-secondary text-xs block">Territory</span><span>{pro.territory || "—"}</span></div>
              </div>
            </div>
          </Card>

          <Card title="Contact">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-text-secondary text-xs block">Email</span><span className="flex items-center gap-1"><Mail size={14} />{pro.contact_email || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Phone</span><span className="flex items-center gap-1"><Phone size={14} />{pro.contact_phone || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Website</span><span className="flex items-center gap-1"><Globe size={14} />{pro.website || "—"}</span></div>
              <div className="col-span-2"><span className="text-text-secondary text-xs block">Address</span><span className="flex items-center gap-1"><MapPin size={14} />{pro.address || "—"}</span></div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Catalog context"><div className="space-y-3"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><Music size={14} /> Artists</span><Badge variant="primary">{artists.length}</Badge></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><Building size={14} /> Works</span><Badge variant="primary">{works.length}</Badge></div></div></Card>
        </div>
      </div>

      <Card title="Artists" subtitle="Artists in the active organization linked to this PRO">
        {artists.length === 0 ? <p className="text-text-secondary py-4 text-center">No artists associated with this PRO.</p> : <div className="space-y-2">{artists.map((artist: any) => <div key={artist.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer" onClick={() => router.push(`/catalog/artists/${artist.id}`)}><span className="font-medium">{artist.name || `Artist #${artist.id}`}</span><span className="text-text-secondary text-sm">{artist.artist_id || ""}</span></div>)}</div>}
      </Card>

      <Card title="Works" subtitle="Works in the active organization linked to this PRO">
        {works.length === 0 ? <p className="text-text-secondary py-4 text-center">No works associated with this PRO.</p> : <div className="space-y-2">{works.map((work: any) => <div key={work.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer" onClick={() => router.push(`/catalog/works/${work.id}`)}><span className="font-medium">{work.title || `Work #${work.id}`}</span><Badge variant="neutral">{work.iswc_code || "—"}</Badge></div>)}</div>}
      </Card>

      <EntityForm title="Edit PRO" isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} isSubmitting={submitting} error={undefined}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-text-secondary">Name</label><input className="input w-full" value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required /></div>
          <div><label className="text-xs text-text-secondary">PRO ID</label><input className="input w-full" value={editData.pro_id || ""} onChange={(e) => setEditData({ ...editData, pro_id: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Territory</label><input className="input w-full" value={editData.territory || ""} onChange={(e) => setEditData({ ...editData, territory: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Email</label><input className="input w-full" type="email" value={editData.contact_email || ""} onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Phone</label><input className="input w-full" value={editData.contact_phone || ""} onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Website</label><input className="input w-full" value={editData.website || ""} onChange={(e) => setEditData({ ...editData, website: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Address</label><textarea className="input w-full" value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })} /></div>
        </div>
      </EntityForm>
    </div>
  );
}
