"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Edit, Mail, Phone, Globe, MapPin, User, Disc } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import EntityArtwork from "@/components/media/EntityArtwork";
import api from "@/lib/api";

function asList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export default function LabelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [label, setLabel] = useState<any>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [labelRes, releasesRes, artistsRes] = await Promise.all([
        api.get(`/labels?id=${id}`),
        api.get(`/labels?id=${id}&relation=releases`),
        api.get(`/labels?id=${id}&relation=artists`),
      ]);
      setLabel(labelRes.data);
      setReleases(asList(releasesRes.data));
      setArtists(asList(artistsRes.data));
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
      alert(err?.response?.data?.error || "Failed to update label");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/labels")} className="text-text-secondary hover:text-white transition-colors" aria-label="Back to labels">
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title={label.name || "Label"}
          subtitle={label.label_id ? `Label ID ${label.label_id}` : `Label #${id}`}
          actions={
            <Button variant="secondary" size="sm" onClick={handleEditClick}>
              <Edit size={14} /> Edit
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Identity">
            <div className="flex gap-4 items-start">
              <EntityArtwork
                entityType="label"
                entityId={label.id}
                alt={label.name}
                size={80}
                placeholder="label"
                className="rounded-xl flex-shrink-0"
                style={{ borderRadius: 12 }}
              />
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div>
                  <span className="text-text-secondary text-xs block">Name</span>
                  <span>{label.name || "—"}</span>
                </div>
                <div>
                  <span className="text-text-secondary text-xs block">Label ID</span>
                  <span>{label.label_id || "—"}</span>
                </div>
                <div>
                  <span className="text-text-secondary text-xs block">Record ID</span>
                  <span>#{label.id}</span>
                </div>
                <div>
                  <span className="text-text-secondary text-xs block">Created</span>
                  <span>{label.created_at ? new Date(label.created_at).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Contact">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-text-secondary text-xs block">Contact person</span>
                <span className="flex items-center gap-1"><User size={14} />{label.contact_person || "—"}</span>
              </div>
              <div>
                <span className="text-text-secondary text-xs block">Email</span>
                <span className="flex items-center gap-1"><Mail size={14} />{label.contact_email || "—"}</span>
              </div>
              <div>
                <span className="text-text-secondary text-xs block">Phone</span>
                <span className="flex items-center gap-1"><Phone size={14} />{label.contact_phone || "—"}</span>
              </div>
              <div>
                <span className="text-text-secondary text-xs block">Website</span>
                <span className="flex items-center gap-1"><Globe size={14} />{label.website || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-text-secondary text-xs block">Address</span>
                <span className="flex items-center gap-1"><MapPin size={14} />{label.address || "—"}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Catalog context">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Disc size={14} /> Releases</span>
                <Badge variant="primary">{releases.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><User size={14} /> Artists</span>
                <Badge variant="primary">{artists.length}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Releases" subtitle="Releases in the active organization linked to this label">
        {releases.length === 0 ? (
          <p className="text-text-secondary py-4 text-center">No releases associated with this label.</p>
        ) : (
          <div className="space-y-2">
            {releases.map((release: any) => (
              <div
                key={release.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => router.push(`/catalog/releases/${release.id}`)}
              >
                <div>
                  <span className="font-medium">{release.title || `Release #${release.id}`}</span>
                  {release.catalog_number && (
                    <span className="text-text-secondary text-sm ml-2">{release.catalog_number}</span>
                  )}
                </div>
                <span className="text-text-secondary text-sm">
                  {release.release_date ? new Date(release.release_date).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Artists" subtitle="Artists in the active organization linked to this label">
        {artists.length === 0 ? (
          <p className="text-text-secondary py-4 text-center">No artists associated with this label.</p>
        ) : (
          <div className="space-y-2">
            {artists.map((artist: any) => (
              <div
                key={artist.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => router.push(`/catalog/artists/${artist.id}`)}
              >
                <div>
                  <span className="font-medium">{artist.name || `Artist #${artist.id}`}</span>
                  {artist.aka && <span className="text-text-secondary text-sm ml-2">aka {artist.aka}</span>}
                </div>
                <span className="text-text-secondary text-sm">{artist.artist_id || ""}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <EntityForm title="Edit Label" isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} isSubmitting={submitting} error={undefined}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-text-secondary">Name</label>
            <input className="input w-full" value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Label ID</label>
            <input className="input w-full" value={editData.label_id || ""} onChange={(e) => setEditData({ ...editData, label_id: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Contact person</label>
            <input className="input w-full" value={editData.contact_person || ""} onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Email</label>
            <input className="input w-full" value={editData.contact_email || ""} onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Phone</label>
            <input className="input w-full" value={editData.contact_phone || ""} onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-text-secondary">Website</label>
            <input className="input w-full" value={editData.website || ""} onChange={(e) => setEditData({ ...editData, website: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-text-secondary">Address</label>
            <textarea className="input w-full" value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
