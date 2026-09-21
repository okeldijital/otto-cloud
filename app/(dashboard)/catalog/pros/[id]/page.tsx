"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Building, Edit, Globe, Hash, Mail, MapPin, Music, Phone, Trash2, User } from "lucide-react";

const inputClass = "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function ProDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canManageGlobalReferenceData } = useAuth();
  const [pro, setPro] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const fetchData = async () => {
    try {
      const [{ data: proData }, { data: artistData }, { data: workData }] = await Promise.all([
        api.get(`/pros?id=${id}`),
        api.get(`/pros?id=${id}&relation=artists`),
        api.get(`/pros?id=${id}&relation=works`),
      ]);
      setPro(proData);
      setArtists(Array.isArray(artistData) ? artistData : []);
      setWorks(Array.isArray(workData) ? workData : []);
    } catch (err) {
      console.error("Failed to load PRO detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleEdit = () => {
    setEditData({
      name: pro.name || "",
      pro_id: pro.pro_id || "",
      contact_person: pro.contact_person || "",
      contact_email: pro.contact_email || "",
      contact_phone: pro.contact_phone || "",
      website: pro.website || "",
      address: pro.address || "",
      territory: pro.territory || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data } = await api.put(`/pros?id=${id}`, {
        name: editData.name.trim(),
        pro_id: editData.pro_id.trim() || null,
        contact_person: editData.contact_person.trim() || null,
        contact_email: editData.contact_email.trim() || null,
        contact_phone: editData.contact_phone.trim() || null,
        website: editData.website.trim() || null,
        address: editData.address.trim() || null,
        territory: editData.territory.trim() || null,
      });
      setPro(data);
      setEditOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete PRO "${pro.name}"?`)) return;
    try {
      await api.delete(`/pros?id=${id}`);
      router.push("/catalog/pros");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Delete failed");
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!pro) return <div className="p-12 text-center text-text-secondary">PRO not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/pros")} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Back to PROs"><ArrowLeft size={20} /></button>
        <PageHeader title={pro.name || "PRO"} subtitle={pro.pro_id ? `PRO ID ${pro.pro_id}` : "Performance Rights Organization"} actions={canManageGlobalReferenceData ? <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={handleEdit}><Edit size={14} /> Edit</Button><Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} /> Delete</Button></div> : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Identity & Contact">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><span className="text-text-secondary text-xs block">Name</span><span className="font-medium">{pro.name || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">PRO ID</span><span className="flex items-center gap-1"><Hash size={14} />{pro.pro_id || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Contact Person</span><span className="flex items-center gap-1"><User size={14} />{pro.contact_person || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Email</span><span className="flex items-center gap-1"><Mail size={14} />{pro.contact_email || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Phone</span><span className="flex items-center gap-1"><Phone size={14} />{pro.contact_phone || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Website</span><span className="flex items-center gap-1"><Globe size={14} />{pro.website || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Territory</span><span>{pro.territory || "—"}</span></div>
              <div className="md:col-span-2"><span className="text-text-secondary text-xs block">Address</span><span className="flex items-center gap-1"><MapPin size={14} />{pro.address || "—"}</span></div>
            </div>
          </Card>

          <Card title="Linked Artists">
            {artists.length === 0 ? <p className="text-text-secondary text-sm">No artists linked to this PRO.</p> : <div className="space-y-2">{artists.map((artist: any) => <div key={artist.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface-elevated cursor-pointer hover:bg-surface" onClick={() => router.push(`/catalog/artists/${artist.id}`)}><Music size={16} /><span>{artist.name}</span></div>)}</div>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Linked Works">
            {works.length === 0 ? <p className="text-text-secondary text-sm">No works linked to this PRO.</p> : <div className="space-y-2">{works.map((work: any) => <div key={work.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated cursor-pointer hover:bg-surface" onClick={() => router.push(`/catalog/works/${work.id}`)}><span className="text-sm flex items-center gap-2"><Building size={15} />{work.title}</span><Badge variant="neutral">{work.iswc_code || "—"}</Badge></div>)}</div>}
          </Card>
          <Card title="Quick Stats"><div className="space-y-2"><div className="flex items-center justify-between"><span>Linked Works</span><Badge variant="primary">{works.length}</Badge></div><div className="flex items-center justify-between"><span>Linked Artists</span><Badge variant="primary">{artists.length}</Badge></div></div></Card>
        </div>
      </div>

      <EntityForm title="Edit PRO" isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-8">
          <section><div className="mb-4 border-b border-border pb-2"><h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Identity</h3></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-medium text-text-secondary">PRO Name *</label><input className={inputClass} value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">PRO ID</label><input className={inputClass} value={editData.pro_id || ""} onChange={(e) => setEditData({ ...editData, pro_id: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Territory</label><input className={inputClass} value={editData.territory || ""} onChange={(e) => setEditData({ ...editData, territory: e.target.value })} /></div>
          </div></section>
          <section><div className="mb-4 border-b border-border pb-2"><h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Contact</h3></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Contact Person</label><input className={inputClass} value={editData.contact_person || ""} onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label><input type="email" className={inputClass} value={editData.contact_email || ""} onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Phone</label><input className={inputClass} value={editData.contact_phone || ""} onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Website</label><input type="url" className={inputClass} value={editData.website || ""} onChange={(e) => setEditData({ ...editData, website: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-medium text-text-secondary">Address</label><textarea className={inputClass + " min-h-24"} value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })} /></div>
          </div></section>
        </div>
      </EntityForm>
    </div>
  );
}
