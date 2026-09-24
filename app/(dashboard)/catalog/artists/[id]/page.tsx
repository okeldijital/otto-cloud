"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Disc, Edit, ExternalLink, FileText, Instagram, Mail, MapPin, Music, Phone, Trash2, Twitter, User } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EntityForm from "@/components/EntityForm";
import Badge from "@/components/ui/Badge";
import GroupMembersManager from "@/components/catalog/GroupMembersManager";
import ArtistDocumentsPanel from "@/components/catalog/ArtistDocumentsPanel";
import ArtistFinancialsPanel from "@/components/catalog/ArtistFinancialsPanel";
import ArtistContractDocumentPreview from "@/components/catalog/ArtistContractDocumentPreview";
import EntityArtwork from "@/components/media/EntityArtwork";
import RelationshipSelect from "@/components/catalog/RelationshipSelect";
import { uploadEntityProfileImage } from "@/components/media/EntityProfileImageField";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateEntityArtwork } from "@/hooks/useAttachment";
import { optimizeImage } from "@/lib/media/image-optimization";
import api from "@/lib/api";

type Artist = any;

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 truncate text-sm text-text-accent">{value || "—"}</p>
    </div>
  );
}

function listItems(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function ArtistContractsPanel({ contracts, expandedContractId, contractDetails, loadingContracts, onToggle }: any) {
  const router = useRouter();

  if (!contracts.length) {
    return (
      <Card title="Contracts" subtitle="Contracts linked to this artist.">
        <p className="py-8 text-center text-text-secondary">No contracts linked to this artist.</p>
      </Card>
    );
  }

  return (
    <Card
      title="Contracts"
      subtitle="Contracts linked to this artist. Preview the agreement here or open the full contract workflow."
    >
      <div className="space-y-2">
        {contracts.map((contract: any) => {
          const open = expandedContractId === contract.id;
          const detail = contractDetails[contract.id];

          return (
            <div key={contract.id} className="overflow-hidden rounded-lg border border-border bg-surface">
              <button
                type="button"
                onClick={() => onToggle(contract.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-elevated"
              >
                <FileText size={16} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-accent">
                    {contract.title || "Untitled contract"}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-secondary">
                    {contract.contract_number || "No contract number"} · {contract.status || "—"}
                  </span>
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(`/contracts/${contract.id}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      router.push(`/contracts/${contract.id}`);
                    }
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-accent hover:text-accent"
                  aria-label={`Open full contract workflow for ${contract.title || "contract"}`}
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Open contract</span>
                </span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {open && (
                <div className="space-y-4 border-t border-border p-4">
                  {loadingContracts && !detail ? (
                    <p className="text-sm text-text-secondary">Loading contract...</p>
                  ) : detail ? (
                    <>
                      <ArtistContractDocumentPreview contractId={detail.id} />

                    </>
                  ) : (
                    <p className="text-sm text-text-secondary">Unable to load contract details.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
function errorMessage(err: any, fallback: string): string {
  const value = err?.response?.data?.error ?? err?.message;
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(err?.response?.data?.details)) return err.response.data.details.join(", ");
  return fallback;
}

export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canManageGlobalReferenceData } = useAuth();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [publishers, setPublishers] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [expandedContractId, setExpandedContractId] = useState<number | null>(null);
  const [contractDetails, setContractDetails] = useState<Record<number, any>>({});
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relationModal, setRelationModal] = useState<"label" | "publisher" | "pro" | null>(null);
  const [relationSubmitting, setRelationSubmitting] = useState(false);
  const [relationProfileImage, setRelationProfileImage] = useState<File | null>(null);
  const [relationForm, setRelationForm] = useState({ name: "", id: "", contact_person: "", contact_email: "", contact_phone: "", website: "", address: "", territory: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [artistRes, releasesRes, worksRes, labelsRes, publishersRes, prosRes, contractsRes] = await Promise.all([
        api.get(`/artists?id=${id}`),
        api.get(`/artists?id=${id}&relation=releases`),
        api.get(`/artists?id=${id}&relation=works`),
        api.get(`/labels`),
        api.get(`/publishers`),
        api.get(`/pros`),
        api.get(`/contracts?party_entity_type=Artist&party_entity_id=${id}&limit=100`),
      ]);
      setArtist(artistRes.data);
      setReleases(listItems(releasesRes.data));
      setWorks(listItems(worksRes.data));
      setLabels(listItems(labelsRes.data));
      setPublishers(listItems(publishersRes.data));
      setPros(listItems(prosRes.data));
      setContracts(listItems(contractsRes.data));
    } catch (err) {
      console.error("Failed to load artist detail:", err);
      setArtist(null);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEditClick = () => {
    if (!artist) return;
    const social = artist.social_media || {};
    const banking = artist.banking_details || {};
    const streaming = artist.streaming_links || {};
    setProfileImage(null);
    setEditData({
      name: artist.name || "",
      aka: artist.aka || "",
      nationality: artist.nationality || "",
      id_number: artist.id_number || "",
      contact_email: artist.contact_email || "",
      contact_phone: artist.contact_phone || "",
      physical_address: artist.physical_address || "",
      ipi_number: artist.ipi_number || "",
      label_id: artist.label_id ? String(artist.label_id) : "",
      publisher_id: artist.publisher_id ? String(artist.publisher_id) : "",
      pro_id: artist.pro_id ? String(artist.pro_id) : "",
      instagram: social.instagram || "",
      twitter: social.twitter || "",
      bank_name: banking.bank_name || "",
      account_number: banking.account_number || "",
      branch_code: banking.branch_code || "",
      spotify_url: streaming.spotify || "",
      apple_music_url: streaming.apple_music || "",
      youtube_url: streaming.youtube || "",
    });
    setEditOpen(true);
  };

  const openRelationModal = (type: "label" | "publisher" | "pro") => {
    setRelationForm({ name: "", id: "", contact_person: "", contact_email: "", contact_phone: "", website: "", address: "", territory: "" });
    setRelationProfileImage(null);
    setRelationModal(type);
  };

  const handleCreateRelation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!relationModal || !relationForm.name.trim()) return;
    setRelationSubmitting(true);
    try {
      const endpoint = relationModal === "label" ? "/labels" : relationModal === "publisher" ? "/publishers" : "/pros";
      const key = relationModal === "label" ? "label_id" : relationModal === "publisher" ? "publisher_id" : "pro_id";
      const body: any = {
        name: relationForm.name.trim(),
        [key]: relationForm.id.trim() || null,
        contact_person: relationForm.contact_person.trim() || null,
        contact_email: relationForm.contact_email.trim() || null,
        contact_phone: relationForm.contact_phone.trim() || null,
        website: relationForm.website.trim() || null,
        address: relationForm.address.trim() || null,
      };
      if (relationModal === "pro") body.territory = relationForm.territory.trim() || null;
      const { data } = await api.post(endpoint, body);
      if (relationProfileImage) await uploadEntityProfileImage(relationModal, data.id, relationProfileImage);
      if (relationModal === "label") {
        setLabels((current) => [...current, data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
        setEditData((current: any) => ({ ...current, label_id: String(data.id) }));
      } else if (relationModal === "publisher") {
        setPublishers((current) => [...current, data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
        setEditData((current: any) => ({ ...current, publisher_id: String(data.id) }));
      } else {
        setPros((current) => [...current, data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
        setEditData((current: any) => ({ ...current, pro_id: String(data.id) }));
      }
      setRelationModal(null);
    } catch (err: any) {
      alert(errorMessage(err, "Failed to create " + relationModal));
    } finally {
      setRelationSubmitting(false);
    }
  };

  const handleProfileUpload = async (file: File) => {
    const optimized = await optimizeImage(file, "avatar");

    const uploadResponse = await api.post("/storage/upload-url", {
      entityType: "artist",
      entityId: String(id),
      fileName: optimized.name,
      mimeType: optimized.type,
      fileSize: optimized.size,
      folder: "artist",
    });

    const upload = uploadResponse.data;
    const r2Response = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": optimized.type },
      body: optimized,
    });

    if (!r2Response.ok) throw new Error(`R2 upload failed (${r2Response.status})`);

    await api.post("/storage/complete", {
      entityType: "artist",
      entityId: String(id),
      key: upload.key,
      fileName: upload.fileName,
      originalName: file.name,
      mimeType: optimized.type,
      fileSize: optimized.size,
    });

    invalidateEntityArtwork("artist", id);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.put(`/artists?id=${id}`, {
        name: editData.name,
        aka: editData.aka,
        nationality: editData.nationality,
        id_number: editData.id_number,
        contact_email: editData.contact_email,
        contact_phone: editData.contact_phone,
        physical_address: editData.physical_address,
        ipi_number: editData.ipi_number,
        label_id: editData.label_id ? Number(editData.label_id) : null,
        publisher_id: editData.publisher_id ? Number(editData.publisher_id) : null,
        pro_id: editData.pro_id ? Number(editData.pro_id) : null,
        social_media: { instagram: editData.instagram, twitter: editData.twitter },
        banking_details: { bank_name: editData.bank_name, account_number: editData.account_number, branch_code: editData.branch_code },
        streaming_links: { spotify: editData.spotify_url, apple_music: editData.apple_music_url, youtube: editData.youtube_url },
      });

      if (profileImage) await handleProfileUpload(profileImage);

      setArtist(data);
      setEditOpen(false);
      setProfileImage(null);
      await fetchData();
    } catch (err: any) {
      alert(errorMessage(err, "Failed to update artist"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!artist || !window.confirm(`Delete "${artist.display_name || artist.aka || artist.name}"?`)) return;
    try {
      await api.delete(`/artists?id=${id}`);
      router.push("/catalog/artists");
    } catch (err: any) {
      alert(errorMessage(err, "Delete failed"));
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading artist...</div>;
  if (!artist) return <div className="p-12 text-center text-text-secondary">Artist not found</div>;

  const social = artist.social_media || {};
  const banking = artist.banking_details || {};
  const streaming = artist.streaming_links || {};
  const label = labels.find((item) => item.id === artist.label_id);
  const publisher = publishers.find((item) => item.id === artist.publisher_id);
  const pro = pros.find((item) => item.id === artist.pro_id);
  const primaryName = artist.display_name || artist.aka || artist.name;
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "releases", label: `Releases (${releases.length})` },
    { key: "works", label: `Works (${works.length})` },
    { key: "documents", label: "Documents" },
    { key: "financials", label: "Financials" },
    { key: "contracts", label: `Contracts (${contracts.length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/artists")} className="text-text-secondary hover:text-white transition-colors" aria-label="Back to Artists"><ChevronLeft size={20} /></button>
        <PageHeader title={primaryName} subtitle={artist.aka && artist.name ? `Legal name: ${artist.name}` : `Artist #${id}`} actions={<div className="flex gap-2"><Button variant="secondary" size="sm" onClick={handleEditClick}><Edit size={14} /> Edit</Button><Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} /> Delete</Button></div>} />
      </div>

      {artist.artist_kind === "group" && <Card title="Group Membership"><GroupMembersManager artist={artist} onUpdate={fetchData} /></Card>}

      <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto">
        {tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-white" : "text-text-secondary hover:text-white"}`}>{tab.label}</button>)}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Contact Information"><div className="grid grid-cols-2 gap-4"><div><span className="text-text-secondary text-xs block">Email</span><span className="flex items-center gap-1"><Mail size={14} />{artist.contact_email || "—"}</span></div><div><span className="text-text-secondary text-xs block">Phone</span><span className="flex items-center gap-1"><Phone size={14} />{artist.contact_phone || "—"}</span></div><div className="col-span-2"><span className="text-text-secondary text-xs block">Address</span><span className="flex items-center gap-1"><MapPin size={14} />{artist.physical_address || "—"}</span></div></div></Card>
            <Card title="Professional Details"><div className="grid grid-cols-2 gap-4"><div><span className="text-text-secondary text-xs block">IPI Number</span><span>{artist.ipi_number || "—"}</span></div><div><span className="text-text-secondary text-xs block">ID Number</span><span>{artist.id_number || "—"}</span></div><div><span className="text-text-secondary text-xs block">Nationality</span><span>{artist.nationality || "—"}</span></div><div><span className="text-text-secondary text-xs block">Legal Name</span><span>{artist.name || artist.legal_name || "—"}</span></div><div><span className="text-text-secondary text-xs block">Label</span><span>{label?.name || "—"}</span></div><div><span className="text-text-secondary text-xs block">Publisher</span><span>{publisher?.name || "—"}</span></div><div><span className="text-text-secondary text-xs block">PRO</span><span>{pro?.name || "—"}</span></div></div></Card>
            <Card title="Social & Streaming"><div className="grid grid-cols-2 gap-4"><div><span className="text-text-secondary text-xs block">Instagram</span><span className="flex items-center gap-1"><Instagram size={14} />{social.instagram || "—"}</span></div><div><span className="text-text-secondary text-xs block">Twitter</span><span className="flex items-center gap-1"><Twitter size={14} />{social.twitter || "—"}</span></div><div><span className="text-text-secondary text-xs block">Spotify</span><span>{streaming.spotify || "—"}</span></div><div><span className="text-text-secondary text-xs block">Apple Music</span><span>{streaming.apple_music || "—"}</span></div><div><span className="text-text-secondary text-xs block">YouTube</span><span>{streaming.youtube || "—"}</span></div></div></Card>
            <Card title="Banking Details"><div className="grid grid-cols-2 gap-4"><div><span className="text-text-secondary text-xs block">Bank Name</span><span>{banking.bank_name || "—"}</span></div><div><span className="text-text-secondary text-xs block">Account Number</span><span>{banking.account_number || "—"}</span></div><div><span className="text-text-secondary text-xs block">Branch Code</span><span>{banking.branch_code || "—"}</span></div></div></Card>
          </div>
          <div className="space-y-6"><Card title="Photo"><EntityArtwork entityType="artist" entityId={artist.id} alt={primaryName} placeholder="artist" className="w-full rounded-xl" style={{ width: "100%", height: 280, borderRadius: 12 }} /></Card><Card title="Quick Stats"><div className="space-y-3"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><Disc size={14} /> Releases</span><Badge variant="primary">{releases.length}</Badge></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><Music size={14} /> Works</span><Badge variant="primary">{works.length}</Badge></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><User size={14} /> Members</span><Badge variant="primary">{artist.member_count || 0}</Badge></div></div></Card></div>
        </div>
      )}

      {activeTab === "releases" && (
        <Card title="Releases" subtitle="Releases associated with this artist.">
          {releases.length === 0 ? <p className="py-8 text-center text-text-secondary">No releases yet.</p> : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {releases.map((release) => (
                <button key={release.id} type="button" onClick={() => router.push(`/catalog/releases/${release.id}`)} className="group overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:border-accent/50 hover:bg-surface-elevated">
                  <EntityArtwork entityType="release" entityId={release.id} alt={release.title} placeholder="release" className="aspect-square w-full object-cover" style={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }} />
                  <div className="p-3"><p className="truncate text-sm font-semibold text-text-accent">{release.title}</p><p className="mt-1 text-xs text-text-secondary">{release.release_date ? new Date(release.release_date).toLocaleDateString() : "Release date not set"}</p></div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
      {activeTab === "works" && <Card title="Works">{works.length === 0 ? <p className="text-text-secondary py-4 text-center">No works yet.</p> : <div className="space-y-2">{works.map((work) => <button key={work.id} className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 text-left" onClick={() => router.push(`/catalog/works/${work.id}`)}><span className="font-medium">{work.title}</span><span className="text-text-secondary text-sm">{work.iswc_code ? `ISWC: ${work.iswc_code}` : ""}</span></button>)}</div>}</Card>}
      {activeTab === "documents" && <ArtistDocumentsPanel artistId={String(id)} />}
      {activeTab === "financials" && <ArtistFinancialsPanel artistId={String(id)} />}
      {activeTab === "contracts" && (
        <ArtistContractsPanel
          contracts={contracts}
          expandedContractId={expandedContractId}
          contractDetails={contractDetails}
          loadingContracts={loadingContracts}
          onToggle={async (contractId: number) => {
            if (expandedContractId === contractId) { setExpandedContractId(null); return; }
            setExpandedContractId(contractId);
            if (contractDetails[contractId]) return;
            setLoadingContracts(true);
            try {
              const { data } = await api.get(`/contracts?id=${contractId}`);
              setContractDetails((current) => ({ ...current, [contractId]: data }));
            } catch (err) {
              console.error("Failed to load contract:", err);
            } finally {
              setLoadingContracts(false);
            }
          }}
        />
      )}

      <EntityForm title="Edit Artist" isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} isSubmitting={submitting} error={undefined}>
        <div className="space-y-8">
          <section>
            <div className="mb-4 border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Identity</h3>
              <p className="mt-1 text-xs text-text-secondary">Core artist and professional identification.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Legal Name</label>
                <input className="input w-full" value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Stage Name (AKA)</label>
                <input className="input w-full" value={editData.aka || ""} onChange={(e) => setEditData({ ...editData, aka: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Nationality</label>
                <input className="input w-full" value={editData.nationality || ""} onChange={(e) => setEditData({ ...editData, nationality: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">IPI Number</label>
                <input className="input w-full" value={editData.ipi_number || ""} onChange={(e) => setEditData({ ...editData, ipi_number: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">ID Number</label>
                <input className="input w-full" value={editData.id_number || ""} onChange={(e) => setEditData({ ...editData, id_number: e.target.value })} />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Contact</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
                <input className="input w-full" type="email" value={editData.contact_email || ""} onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Phone</label>
                <input className="input w-full" value={editData.contact_phone || ""} onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Physical Address</label>
                <textarea className="input w-full" value={editData.physical_address || ""} onChange={(e) => setEditData({ ...editData, physical_address: e.target.value })} />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Organisation</h3>
              <p className="mt-1 text-xs text-text-secondary">Related label, publisher and performing rights organisation.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <RelationshipSelect label="Label" placeholder="Select label..." items={labels} value={editData.label_id || ""} onChange={(value) => setEditData({ ...editData, label_id: value })} onAddNew={() => openRelationModal("label")} addNewLabel="Add new label" />
              <RelationshipSelect label="Publisher" placeholder="Select publisher..." items={publishers} value={editData.publisher_id || ""} onChange={(value) => setEditData({ ...editData, publisher_id: value })} onAddNew={canManageGlobalReferenceData ? () => openRelationModal("publisher") : undefined} addNewLabel="Add new publisher" />
              <RelationshipSelect label="PRO" placeholder="Select PRO..." items={pros} value={editData.pro_id || ""} onChange={(value) => setEditData({ ...editData, pro_id: value })} onAddNew={canManageGlobalReferenceData ? () => openRelationModal("pro") : undefined} addNewLabel="Add new PRO" />
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Profile & Social</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Profile Photo</label>
                <input className="input w-full" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setProfileImage(e.target.files?.[0] || null)} />
                <p className="mt-1.5 text-xs text-text-secondary">Images are automatically resized and compressed before upload. Maximum stored avatar size: 750 KB.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Instagram</label>
                <input className="input w-full" value={editData.instagram || ""} onChange={(e) => setEditData({ ...editData, instagram: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Twitter</label>
                <input className="input w-full" value={editData.twitter || ""} onChange={(e) => setEditData({ ...editData, twitter: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Spotify</label>
                <input className="input w-full" value={editData.spotify_url || ""} onChange={(e) => setEditData({ ...editData, spotify_url: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Apple Music</label>
                <input className="input w-full" value={editData.apple_music_url || ""} onChange={(e) => setEditData({ ...editData, apple_music_url: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">YouTube</label>
                <input className="input w-full" value={editData.youtube_url || ""} onChange={(e) => setEditData({ ...editData, youtube_url: e.target.value })} />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Banking</h3>
              <p className="mt-1 text-xs text-text-secondary">Payment details used for artist financial records.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Bank Name</label>
                <input className="input w-full" value={editData.bank_name || ""} onChange={(e) => setEditData({ ...editData, bank_name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Account Number</label>
                <input className="input w-full" value={editData.account_number || ""} onChange={(e) => setEditData({ ...editData, account_number: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Branch Code</label>
                <input className="input w-full" value={editData.branch_code || ""} onChange={(e) => setEditData({ ...editData, branch_code: e.target.value })} />
              </div>
            </div>
          </section>
        </div>
      </EntityForm>
      
      <EntityForm
        title={relationModal === "label" ? "New Label" : relationModal === "publisher" ? "New Publisher" : "New PRO"}
        isOpen={relationModal !== null}
        onClose={() => setRelationModal(null)}
        onSubmit={handleCreateRelation}
        isSubmitting={relationSubmitting}
        error={undefined}
      >
        <div className="space-y-6">
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Profile Image</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setRelationProfileImage(e.target.files?.[0] || null)} />
          <p className="mt-1.5 text-xs text-text-secondary">Optional. Otto optimizes profile images automatically.</p>
        </div>

            <div className="mb-4 border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Identity</h3>
              <p className="mt-1 text-xs text-text-secondary">Create the relationship record and it will be selected on this artist.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name *</label>
                <input className="input w-full" value={relationForm.name} onChange={(e) => setRelationForm({ ...relationForm, name: e.target.value })} required autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">{relationModal === "label" ? "Label ID" : relationModal === "publisher" ? "Publisher ID" : "PRO ID"}</label>
                <input className="input w-full" value={relationForm.id} onChange={(e) => setRelationForm({ ...relationForm, id: e.target.value })} />
              </div>
              {relationModal === "pro" && <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Territory</label><input className="input w-full" value={relationForm.territory} onChange={(e) => setRelationForm({ ...relationForm, territory: e.target.value })} placeholder="e.g. South Africa" /></div>}
            </div>
          {relationModal !== null && relationModal !== "label" && (
            <section>
              <div className="mb-4 border-b border-border pb-2"><h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Contact</h3></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Contact Person</label><input className="input w-full" value={relationForm.contact_person} onChange={(e) => setRelationForm({ ...relationForm, contact_person: e.target.value })} /></div>
                <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label><input className="input w-full" type="email" value={relationForm.contact_email} onChange={(e) => setRelationForm({ ...relationForm, contact_email: e.target.value })} /></div>
                <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Phone</label><input className="input w-full" value={relationForm.contact_phone} onChange={(e) => setRelationForm({ ...relationForm, contact_phone: e.target.value })} /></div>
                <div><label className="mb-1.5 block text-xs font-medium text-text-secondary">Website</label><input className="input w-full" type="url" value={relationForm.website} onChange={(e) => setRelationForm({ ...relationForm, website: e.target.value })} placeholder="https://..." /></div>
                <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-medium text-text-secondary">Address</label><textarea className="input w-full" value={relationForm.address} onChange={(e) => setRelationForm({ ...relationForm, address: e.target.value })} /></div>
              </div>
            </section>
          )}
        </div>
      </EntityForm>
    </div>
  );
}
