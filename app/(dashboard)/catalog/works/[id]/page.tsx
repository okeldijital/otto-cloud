"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { ChevronLeft, Plus, Trash2, Save, Music, Users, Building2, ShieldCheck, FileText } from "lucide-react";

type Contributor = {
  partyType: string;
  partyEntityId: string;
  name: string;
  role: string;
  sharePercent: string;
  controlledSharePercent: string;
  contactEmail: string;
  contactPhone: string;
  ipiNumber: string;
  proId: string;
  publisherId: string;
};

type Publisher = {
  publisherId: string;
  sharePercent: string;
  controlledSharePercent: string;
  isAdministrator: boolean;
  administrationNotes: string;
};

type Registration = {
  proId: string;
  proWorkNumber: string;
  registrationStatus: string;
  registrationDate: string;
  registrationReference: string;
  notes: string;
};

const emptyContributor = (): Contributor => ({
  partyType: "artist",
  partyEntityId: "",
  name: "",
  role: "composer",
  sharePercent: "",
  controlledSharePercent: "",
  contactEmail: "",
  contactPhone: "",
  ipiNumber: "",
  proId: "",
  publisherId: "",
});

const emptyPublisher = (): Publisher => ({
  publisherId: "",
  sharePercent: "",
  controlledSharePercent: "",
  isAdministrator: false,
  administrationNotes: "",
});

const emptyRegistration = (): Registration => ({
  proId: "",
  proWorkNumber: "",
  registrationStatus: "pending",
  registrationDate: "",
  registrationReference: "",
  notes: "",
});

const numberOrNull = (value: string) => (value === "" ? null : Number(value));
const textOrNull = (value: string) => (value.trim() === "" ? null : value.trim());

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [work, setWork] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [publishers, setPublishers] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [workResponse, artistsResponse, publishersResponse, prosResponse, tracksResponse] = await Promise.all([
        api.get(`/works?id=${id}`),
        api.get(`/artists`),
        api.get(`/publishers`),
        api.get(`/pros`),
        api.get(`/tracks`),
      ]);
      setWork(workResponse.data);
      setArtists(Array.isArray(artistsResponse.data) ? artistsResponse.data : artistsResponse.data?.items || []);
      setPublishers(Array.isArray(publishersResponse.data) ? publishersResponse.data : publishersResponse.data?.items || []);
      setPros(Array.isArray(prosResponse.data) ? prosResponse.data : prosResponse.data?.items || []);
      setAllTracks(Array.isArray(tracksResponse.data) ? tracksResponse.data : tracksResponse.data?.items || []);
      setDirty(false);
    } catch (err) {
      console.error("Failed to load work:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const contributors: Contributor[] = useMemo(
    () =>
      (Array.isArray(work?.contributors) ? work.contributors : []).map((item: any) => ({
        partyType: item.party_type || "artist",
        partyEntityId: item.party_entity_id || "",
        name: item.name || "",
        role: item.role || "composer",
        sharePercent: item.share_percent == null ? "" : String(item.share_percent),
        controlledSharePercent: item.controlled_share_percent == null ? "" : String(item.controlled_share_percent),
        contactEmail: item.contact_email || "",
        contactPhone: item.contact_phone || "",
        ipiNumber: item.ipi_number || "",
        proId: item.pro_id == null ? "" : String(item.pro_id),
        publisherId: item.publisher_id == null ? "" : String(item.publisher_id),
      })),
    [work],
  );

  const publishersState: Publisher[] = useMemo(
    () =>
      (Array.isArray(work?.publishers) ? work.publishers : []).map((item: any) => ({
        publisherId: String(item.publisher_id),
        sharePercent: item.share_percent == null ? "" : String(item.share_percent),
        controlledSharePercent: item.controlled_share_percent == null ? "" : String(item.controlled_share_percent),
        isAdministrator: Boolean(item.is_administrator),
        administrationNotes: item.administration_notes || "",
      })),
    [work],
  );

  const registrations: Registration[] = useMemo(
    () =>
      (Array.isArray(work?.proRegistrations) ? work.proRegistrations : []).map((item: any) => ({
        proId: String(item.pro_id),
        proWorkNumber: item.pro_work_number || "",
        registrationStatus: item.registration_status || "pending",
        registrationDate: item.registration_date ? String(item.registration_date).slice(0, 10) : "",
        registrationReference: item.registration_reference || "",
        notes: item.notes || "",
      })),
    [work],
  );

  const selectedTrackIds = useMemo(() => {
    const ids = new Set<number>();
    (Array.isArray(work?.recordings) ? work.recordings : []).forEach((track: any) => ids.add(Number(track.id)));
    return ids;
  }, [work]);

  const updateWork = (patch: Record<string, any>) => {
    setWork((current: any) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const updateContributor = (index: number, patch: Partial<Contributor>) => {
    const next = [...contributors];
    next[index] = { ...next[index], ...patch };
    setWork((current: any) => ({ ...current, contributors: next }));
    setDirty(true);
  };

  const updatePublisher = (index: number, patch: Partial<Publisher>) => {
    const next = [...publishersState];
    next[index] = { ...next[index], ...patch };
    setWork((current: any) => ({ ...current, publishers: next }));
    setDirty(true);
  };

  const updateRegistration = (index: number, patch: Partial<Registration>) => {
    const next = [...registrations];
    next[index] = { ...next[index], ...patch };
    setWork((current: any) => ({ ...current, proRegistrations: next }));
    setDirty(true);
  };

  const handleContributorParty = (index: number, artistId: string) => {
    const artist = artists.find((item) => String(item.id) === artistId);
    updateContributor(index, {
      partyType: "artist",
      partyEntityId: artistId,
      name: artist?.name || contributors[index].name,
      contactEmail: artist?.contact_email || "",
      contactPhone: artist?.contact_phone || "",
      ipiNumber: artist?.ipi_number || "",
      proId: artist?.pro_id == null ? "" : String(artist.pro_id),
      publisherId: artist?.publisher_id == null ? "" : String(artist.publisher_id),
    });
  };

  const toggleTrack = (trackId: number) => {
    const current = new Set(selectedTrackIds);
    if (current.has(trackId)) current.delete(trackId);
    else current.add(trackId);
    const nextTracks = allTracks.filter((track) => current.has(Number(track.id)));
    setWork((currentWork: any) => ({ ...currentWork, recordings: nextTracks }));
    setDirty(true);
  };

  const save = async () => {
    if (!work.title?.trim()) {
      alert("Work title is required.");
      return;
    }

    const invalidContributor = contributors.find(
      (item) => !item.name.trim() || !item.role.trim() || (item.sharePercent !== "" && (Number(item.sharePercent) < 0 || Number(item.sharePercent) > 100)) || (item.controlledSharePercent !== "" && (Number(item.controlledSharePercent) < 0 || Number(item.controlledSharePercent) > 100)),
    );
    if (invalidContributor) {
      alert("Each contributor needs a name and role, and shares must be between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        workId: work.work_id || null,
        title: work.title.trim(),
        iswcCode: textOrNull(work.iswc_code || ""),
        workType: work.work_type || null,
        status: work.status || "draft",
        originalWorkTitle: textOrNull(work.original_work_title || ""),
        firstReleaseDate: work.first_release_date ? String(work.first_release_date).slice(0, 10) : null,
        notes: textOrNull(work.notes || ""),
        contributors: contributors.map((item) => ({
          partyType: item.partyType,
          partyEntityId: textOrNull(item.partyEntityId),
          name: item.name.trim(),
          role: item.role,
          sharePercent: numberOrNull(item.sharePercent),
          controlledSharePercent: numberOrNull(item.controlledSharePercent),
          contactEmail: textOrNull(item.contactEmail),
          contactPhone: textOrNull(item.contactPhone),
          ipiNumber: textOrNull(item.ipiNumber),
          proId: item.proId ? Number(item.proId) : null,
          publisherId: item.publisherId ? Number(item.publisherId) : null,
        })),
        publishers: publishersState.filter((item) => item.publisherId).map((item) => ({
          publisherId: Number(item.publisherId),
          sharePercent: numberOrNull(item.sharePercent),
          controlledSharePercent: numberOrNull(item.controlledSharePercent),
          isAdministrator: item.isAdministrator,
          administrationNotes: textOrNull(item.administrationNotes),
        })),
        proRegistrations: registrations.filter((item) => item.proId).map((item) => ({
          proId: Number(item.proId),
          proWorkNumber: textOrNull(item.proWorkNumber),
          registrationStatus: item.registrationStatus || "pending",
          registrationDate: item.registrationDate || null,
          registrationReference: textOrNull(item.registrationReference),
          notes: textOrNull(item.notes),
        })),
        trackIds: Array.from(selectedTrackIds),
      };

      const { data } = await api.put(`/works?id=${id}`, payload);
      setWork(data);
      setDirty(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to save work");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!work) return <div className="p-12 text-center text-text-secondary">Work not found</div>;

  const contributorShareTotal = contributors.reduce((sum, item) => sum + (Number(item.sharePercent) || 0), 0);
  const controlledShareTotal = contributors.reduce((sum, item) => sum + (Number(item.controlledSharePercent) || 0), 0);
  const publisherShareTotal = publishersState.reduce((sum, item) => sum + (Number(item.sharePercent) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/catalog/works")} className="text-text-secondary hover:text-white transition-colors" aria-label="Back to works">
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title={work.title}
          subtitle={`Work #${id}${dirty ? " · Unsaved changes" : ""}`}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={load}>Reload</Button>
              <Button variant="primary" size="sm" onClick={save} disabled={saving}>
                <Save size={14} /> {saving ? "Saving..." : "Save Work"}
              </Button>
              <Button variant="danger" size="sm" onClick={async () => {
                if (!window.confirm(`Delete "${work.title}"?`)) return;
                try {
                  await api.delete(`/works?id=${id}`);
                  router.push("/catalog/works");
                } catch (err: any) {
                  alert(err?.response?.data?.error || "Delete failed");
                }
              }}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Card title="Work Identity">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Title *</span><input className="input w-full" value={work.title || ""} onChange={(e) => updateWork({ title: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Work ID</span><input className="input w-full" value={work.work_id || ""} onChange={(e) => updateWork({ work_id: e.target.value })} /></label>
              <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">ISWC</span><input className="input w-full" value={work.iswc_code || ""} onChange={(e) => updateWork({ iswc_code: e.target.value })} placeholder="T-123456789-0" /></label>
              <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Work Type</span><select className="input w-full" value={work.work_type || "composition"} onChange={(e) => updateWork({ work_type: e.target.value })}><option value="composition">Composition</option><option value="arrangement">Arrangement</option><option value="adaptation">Adaptation</option><option value="translation">Translation</option></select></label>
              <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Status</span><select className="input w-full" value={work.status || "draft"} onChange={(e) => updateWork({ status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="registered">Registered</option><option value="rejected">Rejected</option></select></label>
              <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">First Release Date</span><input className="input w-full" type="date" value={work.first_release_date ? String(work.first_release_date).slice(0, 10) : ""} onChange={(e) => updateWork({ first_release_date: e.target.value })} /></label>
              <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Original Work Title</span><input className="input w-full" value={work.original_work_title || ""} onChange={(e) => updateWork({ original_work_title: e.target.value })} /></label>
            </div>
          </Card>

          <Card title="Contributors / Writers">
            <div className="mb-4 flex items-center justify-between text-xs text-text-secondary">
              <span>Capture the legal writer/contributor participation, identity metadata and ownership/control splits.</span>
              <span className={Math.abs(contributorShareTotal - 100) < 0.01 ? "text-green-400" : "text-yellow-400"}>Writer split: {contributorShareTotal.toFixed(2)}%</span>
            </div>
            <div className="space-y-4">
              {contributors.map((contributor, index) => (
                <div key={index} className="rounded-lg border border-border p-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <label className="space-y-1 md:col-span-4"><span className="text-xs font-bold text-text-secondary">Catalogue Party</span><select className="input w-full" value={contributor.partyEntityId} onChange={(e) => handleContributorParty(index, e.target.value)}><option value="">Select artist...</option>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
                    <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Party Type</span><select className="input w-full" value={contributor.partyType} onChange={(e) => updateContributor(index, { partyType: e.target.value })}><option value="artist">Artist</option><option value="individual">Individual</option><option value="organization">Organization</option></select></label>
                    <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Copyright Role</span><select className="input w-full" value={contributor.role} onChange={(e) => updateContributor(index, { role: e.target.value })}><option value="composer">Composer</option><option value="lyricist">Lyricist</option><option value="songwriter">Songwriter</option><option value="arranger">Arranger</option><option value="producer">Producer</option><option value="adapter">Adapter</option><option value="translator">Translator</option></select></label>
                    <div className="flex items-end justify-end md:col-span-4"><Button variant="secondary" size="sm" onClick={() => { const next = contributors.filter((_, i) => i !== index); setWork((current: any) => ({ ...current, contributors: next })); setDirty(true); }}><Trash2 size={14} /> Remove</Button></div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Contributor / Writer Name *</span><input className="input w-full" value={contributor.name} onChange={(e) => updateContributor(index, { name: e.target.value })} /></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">IPI / CAE</span><input className="input w-full" value={contributor.ipiNumber} onChange={(e) => updateContributor(index, { ipiNumber: e.target.value })} /></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Email</span><input className="input w-full" type="email" value={contributor.contactEmail} onChange={(e) => updateContributor(index, { contactEmail: e.target.value })} /></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Phone</span><input className="input w-full" value={contributor.contactPhone} onChange={(e) => updateContributor(index, { contactPhone: e.target.value })} /></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Writer Split %</span><input className="input w-full" type="number" min="0" max="100" step="0.01" value={contributor.sharePercent} onChange={(e) => updateContributor(index, { sharePercent: e.target.value })} /></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Controlled Split %</span><input className="input w-full" type="number" min="0" max="100" step="0.01" value={contributor.controlledSharePercent} onChange={(e) => updateContributor(index, { controlledSharePercent: e.target.value })} /></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Contributor PRO</span><select className="input w-full" value={contributor.proId} onChange={(e) => updateContributor(index, { proId: e.target.value })}><option value="">Not specified</option>{pros.map((pro) => <option key={pro.id} value={pro.id}>{pro.name}</option>)}</select></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Publishing Company</span><select className="input w-full" value={contributor.publisherId} onChange={(e) => updateContributor(index, { publisherId: e.target.value })}><option value="">Not specified</option>{publishers.map((publisher) => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}</select></label>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => { const next = [...contributors, emptyContributor()]; setWork((current: any) => ({ ...current, contributors: next })); setDirty(true); }}><Plus size={14} /> Add Contributor / Writer</Button>
            </div>
          </Card>

          <Card title="Publishing">
            <div className="mb-4 flex items-center justify-between text-xs text-text-secondary">
              <span>Publishing ownership and administration are distinct from writer participation.</span>
              <span className={Math.abs(publisherShareTotal - 100) < 0.01 ? "text-green-400" : "text-yellow-400"}>Publisher split: {publisherShareTotal.toFixed(2)}%</span>
            </div>
            <div className="space-y-3">
              {publishersState.map((publisher, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 md:grid-cols-12">
                  <label className="space-y-1 md:col-span-4"><span className="text-xs font-bold text-text-secondary">Publisher</span><select className="input w-full" value={publisher.publisherId} onChange={(e) => updatePublisher(index, { publisherId: e.target.value })}><option value="">Select publisher...</option>{publishers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Share %</span><input className="input w-full" type="number" min="0" max="100" step="0.01" value={publisher.sharePercent} onChange={(e) => updatePublisher(index, { sharePercent: e.target.value })} /></label>
                  <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Controlled %</span><input className="input w-full" type="number" min="0" max="100" step="0.01" value={publisher.controlledSharePercent} onChange={(e) => updatePublisher(index, { controlledSharePercent: e.target.value })} /></label>
                  <label className="flex items-center gap-2 pt-6 text-sm md:col-span-2"><input type="checkbox" checked={publisher.isAdministrator} onChange={(e) => updatePublisher(index, { isAdministrator: e.target.checked })} /> Administrator</label>
                  <div className="flex items-end justify-end md:col-span-2"><Button variant="secondary" size="sm" onClick={() => { const next = publishersState.filter((_, i) => i !== index); setWork((current: any) => ({ ...current, publishers: next })); setDirty(true); }}><Trash2 size={14} /></Button></div>
                  <label className="space-y-1 md:col-span-10"><span className="text-xs font-bold text-text-secondary">Administration Notes</span><input className="input w-full" value={publisher.administrationNotes} onChange={(e) => updatePublisher(index, { administrationNotes: e.target.value })} /></label>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => { const next = [...publishersState, emptyPublisher()]; setWork((current: any) => ({ ...current, publishers: next })); setDirty(true); }}><Plus size={14} /> Add Publisher</Button>
            </div>
          </Card>

          <Card title="PRO / Registration">
            <div className="space-y-3">
              {registrations.map((registration, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 md:grid-cols-12">
                  <label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-text-secondary">PRO</span><select className="input w-full" value={registration.proId} onChange={(e) => updateRegistration(index, { proId: e.target.value })}><option value="">Select PRO...</option>{pros.map((pro) => <option key={pro.id} value={pro.id}>{pro.name}</option>)}</select></label>
                  <label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-text-secondary">PRO Work No.</span><input className="input w-full" value={registration.proWorkNumber} onChange={(e) => updateRegistration(index, { proWorkNumber: e.target.value })} /></label>
                  <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Registration Status</span><select className="input w-full" value={registration.registrationStatus} onChange={(e) => updateRegistration(index, { registrationStatus: e.target.value })}><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="registered">Registered</option><option value="rejected">Rejected</option></select></label>
                  <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Registration Date</span><input className="input w-full" type="date" value={registration.registrationDate} onChange={(e) => updateRegistration(index, { registrationDate: e.target.value })} /></label>
                  <div className="flex items-end justify-end md:col-span-2"><Button variant="secondary" size="sm" onClick={() => { const next = registrations.filter((_, i) => i !== index); setWork((current: any) => ({ ...current, proRegistrations: next })); setDirty(true); }}><Trash2 size={14} /></Button></div>
                  <label className="space-y-1 md:col-span-5"><span className="text-xs font-bold text-text-secondary">Registration Reference</span><input className="input w-full" value={registration.registrationReference} onChange={(e) => updateRegistration(index, { registrationReference: e.target.value })} /></label>
                  <label className="space-y-1 md:col-span-7"><span className="text-xs font-bold text-text-secondary">Notes</span><input className="input w-full" value={registration.notes} onChange={(e) => updateRegistration(index, { notes: e.target.value })} /></label>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => { const next = [...registrations, emptyRegistration()]; setWork((current: any) => ({ ...current, proRegistrations: next })); setDirty(true); }}><Plus size={14} /> Add PRO Registration</Button>
            </div>
          </Card>

          <Card title="Linked Recordings">
            <div className="space-y-2">
              {allTracks.length === 0 && <div className="text-sm text-text-secondary">No recordings available.</div>}
              {allTracks.map((track) => {
                const selected = selectedTrackIds.has(Number(track.id));
                return (
                  <label key={track.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-white/5">
                    <input type="checkbox" checked={selected} onChange={() => toggleTrack(Number(track.id))} />
                    <Music size={16} className="text-text-secondary" />
                    <span className="flex-1 text-sm">{track.title || `Track #${track.id}`}</span>
                    {track.isrc && <span className="text-xs text-text-secondary">{track.isrc}</span>}
                    {selected && <Badge>Linked</Badge>}
                  </label>
                );
              })}
            </div>
          </Card>

          <Card title="Administration & Evidence">
            <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Work Notes / Evidence Summary</span><textarea className="input min-h-32 w-full" value={work.notes || ""} onChange={(e) => updateWork({ notes: e.target.value })} placeholder="Agreements, registration evidence, ownership notes, references..." /></label>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Work Summary">
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3"><Users size={16} className="text-text-secondary" /><span>{contributors.length} contributor{contributors.length === 1 ? "" : "s"}</span></div>
              <div className="flex items-center gap-3"><Building2 size={16} className="text-text-secondary" /><span>{publishersState.length} publisher{publishersState.length === 1 ? "" : "s"}</span></div>
              <div className="flex items-center gap-3"><ShieldCheck size={16} className="text-text-secondary" /><span>{registrations.length} PRO registration{registrations.length === 1 ? "" : "s"}</span></div>
              <div className="flex items-center gap-3"><Music size={16} className="text-text-secondary" /><span>{selectedTrackIds.size} linked recording{selectedTrackIds.size === 1 ? "" : "s"}</span></div>
              <div className="flex items-center gap-3"><FileText size={16} className="text-text-secondary" /><span>{work.iswc_code || "ISWC not assigned"}</span></div>
            </div>
          </Card>

          <Card title="Ownership Checks">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Writer split</span><span className={Math.abs(contributorShareTotal - 100) < 0.01 ? "text-green-400" : "text-yellow-400"}>{contributorShareTotal.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span>Controlled split</span><span>{controlledShareTotal.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span>Publisher split</span><span className={publishersState.length === 0 || Math.abs(publisherShareTotal - 100) < 0.01 ? "text-green-400" : "text-yellow-400"}>{publisherShareTotal.toFixed(2)}%</span></div>
              <p className="text-xs text-text-secondary">These are advisory UI checks. The current schema permits partial or unassigned splits.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
