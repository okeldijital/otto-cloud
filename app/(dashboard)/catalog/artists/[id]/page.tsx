"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EntityForm from "@/components/EntityForm";
import Badge from "@/components/ui/Badge";
import GroupMembersManager from "@/components/catalog/GroupMembersManager";

import api from "@/lib/api";
import { ChevronLeft, Mail, Phone, Globe, MapPin, User, Disc, FileText, Edit, Trash2, Instagram, Twitter, Music } from "lucide-react";

export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<any>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [publishers, setPublishers] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [artistRes, releasesRes, worksRes, labelsRes, publishersRes, prosRes] = await Promise.all([
        api.get(`/artists?id=${id}`),
        api.get(`/artists?id=${id}&relation=releases`),
        api.get(`/artists?id=${id}&relation=works`),
        api.get(`/labels`),
        api.get(`/publishers`),
        api.get(`/pros`),
      ]);
      setArtist(artistRes.data);
      setReleases(releasesRes.data);
      setWorks(worksRes.data);
      setLabels(labelsRes.data);
      setPublishers(publishersRes.data);
      setPros(prosRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEditClick = () => {
    if (!artist) return;
    const social = artist.social_media || {};
    const banking = artist.banking_details || {};
    const streaming = artist.streaming_links || {};
    setEditData({
      name: artist.name, aka: artist.aka || "", nationality: artist.nationality || "",
      id_number: artist.id_number || "", profile_image_url: artist.profile_image_url || "",
      contact_email: artist.contact_email || "", contact_phone: artist.contact_phone || "",
      physical_address: artist.physical_address || "", ipi_number: artist.ipi_number || "",
      label_id: artist.label_id || "", publisher_id: artist.publisher_id || "", pro_id: artist.pro_id || "",
      instagram: social.instagram || "", twitter: social.twitter || "",
      bank_name: banking.bank_name || "", account_number: banking.account_number || "", branch_code: banking.branch_code || "",
      spotify_url: streaming.spotify || "", apple_music_url: streaming.apple_music || "", youtube_url: streaming.youtube || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.put(`/artists?id=${id}`, {
        name: editData.name, aka: editData.aka, nationality: editData.nationality,
        id_number: editData.id_number, profile_image_url: editData.profile_image_url,
        contact_email: editData.contact_email, contact_phone: editData.contact_phone,
        physical_address: editData.physical_address, ipi_number: editData.ipi_number,
        label_id: editData.label_id ? parseInt(editData.label_id) : null,
        publisher_id: editData.publisher_id ? parseInt(editData.publisher_id) : null,
        pro_id: editData.pro_id ? parseInt(editData.pro_id) : null,
        social_media: { instagram: editData.instagram, twitter: editData.twitter },
        banking_details: { bank_name: editData.bank_name, account_number: editData.account_number, branch_code: editData.branch_code },
        streaming_links: { spotify: editData.spotify_url, apple_music: editData.apple_music_url, youtube: editData.youtube_url },
      });
      setArtist(data);
      setEditOpen(false);
    } catch (err: any) { alert(err?.response?.data?.error || "Failed to update artist"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!artist) return <div className="p-12 text-center text-text-secondary">Artist not found</div>;

  const social = artist.social_media || {};
  const banking = artist.banking_details || {};
  const streaming = artist.streaming_links || {};
  const label = labels.find((l: any) => l.id === artist.label_id);
  const publisher = publishers.find((p: any) => p.id === artist.publisher_id);
  const pro = pros.find((p: any) => p.id === artist.pro_id);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "releases", label: `Releases (${releases.length})` },
    { key: "works", label: `Works (${works.length})` },
    { key: "documents", label: "Documents" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/artists")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title={artist.name} subtitle={artist.aka ? `aka ${artist.aka}` : `Artist #${id}`} actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleEditClick}><Edit size={14} /> Edit</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              if (window.confirm(`Delete "${artist.name}"?`)) {
                try { await api.delete(`/artists?id=${id}`); router.push("/catalog/artists"); }
                catch (e: any) { alert(e?.response?.data?.error || "Delete failed"); }
              }
            }}><Trash2 size={14} /> Delete</Button>
          </div>
        } />
      </div>

      {artist.artist_kind === "group" && (
        <Card title="Group Membership">
          <GroupMembersManager artist={artist} onUpdate={fetchData} />
        </Card>
      )}

      <div className="flex gap-2 border-b border-white/5 pb-2">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-primary text-white" : "text-text-secondary hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Contact Information">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-text-secondary text-xs block">Email</span><span className="flex items-center gap-1"><Mail size={14} />{artist.contact_email || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Phone</span><span className="flex items-center gap-1"><Phone size={14} />{artist.contact_phone || "—"}</span></div>
                <div className="col-span-2"><span className="text-text-secondary text-xs block">Address</span><span className="flex items-center gap-1"><MapPin size={14} />{artist.physical_address || "—"}</span></div>
              </div>
            </Card>
            <Card title="Professional Details">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-text-secondary text-xs block">IPI Number</span><span>{artist.ipi_number || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">ID Number</span><span>{artist.id_number || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Nationality</span><span>{artist.nationality || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Legal Name</span><span>{artist.legal_name || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Label</span><span>{label?.name || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Publisher</span><span>{publisher?.name || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">PRO</span><span>{pro?.name || "—"}</span></div>
              </div>
            </Card>
            <Card title="Social & Streaming">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-text-secondary text-xs block">Instagram</span><span className="flex items-center gap-1"><Instagram size={14} />{social.instagram || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Twitter</span><span className="flex items-center gap-1"><Twitter size={14} />{social.twitter || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Spotify</span><span>{streaming.spotify || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Apple Music</span><span>{streaming.apple_music || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">YouTube</span><span>{streaming.youtube || "—"}</span></div>
              </div>
            </Card>
            <Card title="Banking Details">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-text-secondary text-xs block">Bank Name</span><span>{banking.bank_name || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Account Number</span><span>{banking.account_number || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Branch Code</span><span>{banking.branch_code || "—"}</span></div>
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            {artist.profile_image_url && (
              <Card title="Photo">
                <img src={artist.profile_image_url} alt={artist.name} className="w-full rounded-xl" style={{ maxHeight: 300, objectFit: "cover" }} />
              </Card>
            )}
            <Card title="Quick Stats">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Disc size={14} /> Releases</span><Badge variant="primary">{releases.length}</Badge></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Music size={14} /> Works</span><Badge variant="primary">{works.length}</Badge></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2"><User size={14} /> Members</span><Badge variant="primary">{artist.member_count || 0}</Badge></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "releases" && (
        <Card title="Releases">
          {releases.length === 0 ? <p className="text-text-secondary py-4 text-center">No releases yet.</p> : (
            <div className="space-y-2">
              {releases.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors" onClick={() => router.push(`/catalog/releases/${r.id}`)}>
                  <div><span className="font-medium">{r.title}</span><span className="text-text-secondary text-sm ml-2">{r.release_type}</span></div>
                  <span className="text-text-secondary text-sm">{r.release_date ? new Date(r.release_date).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "works" && (
        <Card title="Works">
          {works.length === 0 ? <p className="text-text-secondary py-4 text-center">No works yet.</p> : (
            <div className="space-y-2">
              {works.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors" onClick={() => router.push(`/catalog/works/${w.id}`)}>
                  <div><span className="font-medium">{w.title}</span>{w.iswc_code && <span className="text-text-secondary text-sm ml-2">ISWC: {w.iswc_code}</span>}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "documents" && (
        <Card title="Documents">
          <p className="text-text-secondary text-sm">Document management coming in Office Suite milestone.</p>
        </Card>
      )}

      <EntityForm title="Edit Artist" isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} isSubmitting={submitting} error={undefined}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-text-secondary">Name</label><input className="input w-full" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Stage Name (AKA)</label><input className="input w-full" value={editData.aka} onChange={(e) => setEditData({ ...editData, aka: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Nationality</label><input className="input w-full" value={editData.nationality} onChange={(e) => setEditData({ ...editData, nationality: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">IPI Number</label><input className="input w-full" value={editData.ipi_number} onChange={(e) => setEditData({ ...editData, ipi_number: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Email</label><input className="input w-full" value={editData.contact_email} onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Phone</label><input className="input w-full" value={editData.contact_phone} onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Address</label><textarea className="input w-full" value={editData.physical_address} onChange={(e) => setEditData({ ...editData, physical_address: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Label</label><select className="input w-full" value={editData.label_id} onChange={(e) => setEditData({ ...editData, label_id: e.target.value })}><option value="">—</option>{labels.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          <div><label className="text-xs text-text-secondary">Publisher</label><select className="input w-full" value={editData.publisher_id} onChange={(e) => setEditData({ ...editData, publisher_id: e.target.value })}><option value="">—</option>{publishers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="text-xs text-text-secondary">PRO</label><select className="input w-full" value={editData.pro_id} onChange={(e) => setEditData({ ...editData, pro_id: e.target.value })}><option value="">—</option>{pros.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="text-xs text-text-secondary">ID Number</label><input className="input w-full" value={editData.id_number} onChange={(e) => setEditData({ ...editData, id_number: e.target.value })} /></div>
          <div className="col-span-2 border-t border-white/5 pt-4 mt-2"><h4 className="text-sm font-semibold mb-2">Social Media</h4></div>
          <div><label className="text-xs text-text-secondary">Instagram</label><input className="input w-full" value={editData.instagram} onChange={(e) => setEditData({ ...editData, instagram: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Twitter</label><input className="input w-full" value={editData.twitter} onChange={(e) => setEditData({ ...editData, twitter: e.target.value })} /></div>
          <div className="col-span-2 border-t border-white/5 pt-4 mt-2"><h4 className="text-sm font-semibold mb-2">Streaming Links</h4></div>
          <div><label className="text-xs text-text-secondary">Spotify URL</label><input className="input w-full" value={editData.spotify_url} onChange={(e) => setEditData({ ...editData, spotify_url: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Apple Music URL</label><input className="input w-full" value={editData.apple_music_url} onChange={(e) => setEditData({ ...editData, apple_music_url: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">YouTube URL</label><input className="input w-full" value={editData.youtube_url} onChange={(e) => setEditData({ ...editData, youtube_url: e.target.value })} /></div>
          <div className="col-span-2 border-t border-white/5 pt-4 mt-2"><h4 className="text-sm font-semibold mb-2">Banking Details</h4></div>
          <div><label className="text-xs text-text-secondary">Bank Name</label><input className="input w-full" value={editData.bank_name} onChange={(e) => setEditData({ ...editData, bank_name: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Account Number</label><input className="input w-full" value={editData.account_number} onChange={(e) => setEditData({ ...editData, account_number: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Branch Code</label><input className="input w-full" value={editData.branch_code} onChange={(e) => setEditData({ ...editData, branch_code: e.target.value })} /></div>
        </div>
      </EntityForm>
    </div>
  );
}
