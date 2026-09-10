"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Edit, Mail, Phone, Globe, MapPin, User, Disc, Upload, Loader, Link2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import EntityArtwork from "@/components/media/EntityArtwork";
import { invalidateEntityArtwork } from "@/hooks/useAttachment";
import { optimizeImage } from "@/lib/media/image-optimization";
import api from "@/lib/api";

function asList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function errorMessage(err: any, fallback: string): string {
  const value = err?.response?.data?.error ?? err?.message;
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default function LabelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [label, setLabel] = useState<any>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [allReleases, setAllReleases] = useState<any[]>([]);
  const [allArtists, setAllArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assigningArtist, setAssigningArtist] = useState(false);
  const [assigningRelease, setAssigningRelease] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [selectedReleaseId, setSelectedReleaseId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [labelRes, releasesRes, artistsRes, allReleasesRes, allArtistsRes] = await Promise.all([
        api.get(`/labels?id=${id}`),
        api.get(`/labels?id=${id}&relation=releases`),
        api.get(`/labels?id=${id}&relation=artists`),
        api.get(`/releases?limit=100`),
        api.get(`/artists?limit=100`),
      ]);
      setLabel(labelRes.data);
      setReleases(asList(releasesRes.data));
      setArtists(asList(artistsRes.data));
      setAllReleases(asList(allReleasesRes.data));
      setAllArtists(asList(allArtistsRes.data));
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        setLabel(null);
        setNotFound(true);
      } else {
        setLabel(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = () => {
    if (!label) return;
    setEditData({
      name: label.name || "",
      label_id: label.label_id || "",
      contact_person: label.contact_person || "",
      contact_email: label.contact_email || "",
      contact_phone: label.contact_phone || "",
      website: label.website || "",
      address: label.address || "",
      logo_url: label.logo_url || "",
    });
    setEditOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !label) return;
    setUploading(true);
    try {
      const optimized = await optimizeImage(file, "avatar");
      const uploadResponse = await api.post("/storage/upload-url", {
        entityType: "label",
        entityId: String(label.id),
        fileName: optimized.name,
        mimeType: optimized.type,
        fileSize: optimized.size,
        folder: "label",
      });
      const upload = uploadResponse.data;
      if (!upload?.uploadUrl || !upload?.key) throw new Error("Storage upload authorization was incomplete.");
      const r2Response = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": optimized.type },
        body: optimized,
      });
      if (!r2Response.ok) throw new Error(`Logo upload failed (${r2Response.status})`);
      const complete = await api.post("/storage/complete", {
        entityType: "label",
        entityId: String(label.id),
        key: upload.key,
        fileName: upload.fileName,
        originalName: file.name,
        mimeType: optimized.type,
        fileSize: optimized.size,
      });
      if (!complete?.data?.attachment) throw new Error("Logo upload could not be finalized.");
      invalidateEntityArtwork("label", label.id);
      await fetchData();
    } catch (err: any) {
      alert(errorMessage(err, "Failed to upload label logo"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const assignArtist = async () => {
    if (!selectedArtistId || !label) return;
    setAssigningArtist(true);
    try {
      await api.put(`/artists?id=${selectedArtistId}`, { label_id: label.id });
      setSelectedArtistId("");
      await fetchData();
    } catch (err: any) {
      alert(errorMessage(err, "Failed to assign artist to label"));
    } finally {
      setAssigningArtist(false);
    }
  };

  const assignRelease = async () => {
    if (!selectedReleaseId || !label) return;
    setAssigningRelease(true);
    try {
      await api.put(`/releases?id=${selectedReleaseId}`, { label_id: label.id });
      setSelectedReleaseId("");
      await fetchData();
    } catch (err: any) {
      alert(errorMessage(err, "Failed to assign release to label"));
    } finally {
      setAssigningRelease(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.put(`/labels?id=${id}`, {
        name: editData.name,
        label_id: editData.label_id || null,
        contact_person: editData.contact_person || null,
        contact_email: editData.contact_email || null,
        contact_phone: editData.contact_phone || null,
        website: editData.website || null,
        address: editData.address || null,
        logo_url: editData.logo_url || null,
      });
      setLabel(data);
      setEditOpen(false);
    } catch (err: any) {
      alert(errorMessage(err, "Failed to update label"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!label) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push("/catalog/labels")} className="text-text-secondary hover:text-white transition-colors flex items-center gap-1">
          <ChevronLeft size={20} /> Labels
        </button>
        <div className="p-12 text-center text-text-secondary">
          {notFound ? "Label not found" : "Unable to load label"}
        </div>
      </div>
    );
  }

  const unassignedArtists = allArtists.filter((artist) => !artists.some((item) => item.id === artist.id));
  const unassignedReleases = allReleases.filter((release) => !releases.some((item) => item.id === release.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/labels")} className="text-text-secondary hover:text-white transition-colors" aria-label="Back to labels">
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title={label.name || "Label"}
          subtitle={label.label_id ? `Label ID ${label.label_id}` : `Label #${id}`}
          actions={<Button variant="secondary" size="sm" onClick={handleEditClick}><Edit size={14} /> Edit</Button>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Identity">
            <div className="flex gap-4 items-start">
              <div className="group relative flex-shrink-0">
                {uploading ? (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/5"><Loader size={24} className="animate-spin text-text-secondary" /></div>
                ) : (
                  <EntityArtwork
                    entityType="label"
                    entityId={label.id}
                    alt={label.name}
                    size={80}
                    placeholder="label"
                    className="rounded-xl"
                    style={{ borderRadius: 12 }}
                  />
                )}
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-xl bg-black/55 opacity-0 transition-opacity group-hover:opacity-100" title="Upload label logo">
                  <Upload size={20} className="text-white" />
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div><span className="text-text-secondary text-xs block">Name</span><span>{label.name || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Label ID</span><span>{label.label_id || "—"}</span></div>
                <div><span className="text-text-secondary text-xs block">Record ID</span><span>#{label.id}</span></div>
                <div><span className="text-text-secondary text-xs block">Created</span><span>{label.created_at ? new Date(label.created_at).toLocaleDateString() : "—"}</span></div>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-secondary">Hover the logo and select upload to set the label avatar.</p>
          </Card>

          <Card title="Contact">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-text-secondary text-xs block">Contact person</span><span className="flex items-center gap-1"><User size={14} />{label.contact_person || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Email</span><span className="flex items-center gap-1"><Mail size={14} />{label.contact_email || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Phone</span><span className="flex items-center gap-1"><Phone size={14} />{label.contact_phone || "—"}</span></div>
              <div><span className="text-text-secondary text-xs block">Website</span><span className="flex items-center gap-1"><Globe size={14} />{label.website || "—"}</span></div>
              <div className="col-span-2"><span className="text-text-secondary text-xs block">Address</span><span className="flex items-center gap-1"><MapPin size={14} />{label.address || "—"}</span></div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Catalog context">
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Disc size={14} /> Releases</span><Badge variant="primary">{releases.length}</Badge></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2"><User size={14} /> Artists</span><Badge variant="primary">{artists.length}</Badge></div>
            </div>
          </Card>

          <Card title="Assign to label" subtitle="Link existing organization records to this label">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary">Artist</label>
                <div className="flex gap-2">
                  <select className="input min-w-0 flex-1" value={selectedArtistId} onChange={(e) => setSelectedArtistId(e.target.value)} disabled={assigningArtist}>
                    <option value="">Select an artist</option>
                    {unassignedArtists.map((artist) => <option key={artist.id} value={artist.id}>{artist.display_name || artist.aka || artist.name}</option>)}
                  </select>
                  <Button variant="secondary" size="sm" onClick={assignArtist} disabled={!selectedArtistId || assigningArtist}>
                    {assigningArtist ? <Loader size={14} className="animate-spin" /> : <Link2 size={14} />} Assign
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary">Release</label>
                <div className="flex gap-2">
                  <select className="input min-w-0 flex-1" value={selectedReleaseId} onChange={(e) => setSelectedReleaseId(e.target.value)} disabled={assigningRelease}>
                    <option value="">Select a release</option>
                    {unassignedReleases.map((release) => <option key={release.id} value={release.id}>{release.title}</option>)}
                  </select>
                  <Button variant="secondary" size="sm" onClick={assignRelease} disabled={!selectedReleaseId || assigningRelease}>
                    {assigningRelease ? <Loader size={14} className="animate-spin" /> : <Link2 size={14} />} Assign
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Releases" subtitle="Releases in the active organization linked to this label">
        {releases.length === 0 ? <p className="text-text-secondary py-4 text-center">No releases associated with this label.</p> : <div className="space-y-2">{releases.map((release: any) => <div key={release.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors" onClick={() => router.push(`/catalog/releases/${release.id}`)}><div><span className="font-medium">{release.title || `Release #${release.id}`}</span>{release.catalog_number && <span className="text-text-secondary text-sm ml-2">{release.catalog_number}</span>}</div><span className="text-text-secondary text-sm">{release.release_date ? new Date(release.release_date).toLocaleDateString() : ""}</span></div>)}</div>}
      </Card>

      <Card title="Artists" subtitle="Artists in the active organization linked to this label">
        {artists.length === 0 ? <p className="text-text-secondary py-4 text-center">No artists associated with this label.</p> : <div className="space-y-2">{artists.map((artist: any) => <div key={artist.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors" onClick={() => router.push(`/catalog/artists/${artist.id}`)}><div><span className="font-medium">{artist.name || `Artist #${artist.id}`}</span>{artist.aka && <span className="text-text-secondary text-sm ml-2">aka {artist.aka}</span>}</div><span className="text-text-secondary text-sm">{artist.artist_id || ""}</span></div>)}</div>}
      </Card>

      <EntityForm title="Edit Label" isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} isSubmitting={submitting} error={undefined}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-text-secondary">Name</label><input className="input w-full" value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required /></div>
          <div><label className="text-xs text-text-secondary">Label ID</label><input className="input w-full" value={editData.label_id || ""} onChange={(e) => setEditData({ ...editData, label_id: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Contact person</label><input className="input w-full" value={editData.contact_person || ""} onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Email</label><input className="input w-full" value={editData.contact_email || ""} onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Phone</label><input className="input w-full" value={editData.contact_phone || ""} onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Website</label><input className="input w-full" value={editData.website || ""} onChange={(e) => setEditData({ ...editData, website: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Address</label><textarea className="input w-full" value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })} /></div>
        </div>
      </EntityForm>
    </div>
  );
}
