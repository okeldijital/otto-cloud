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

  const contributors: Contributor[] = useMemo(() =>
    (Array.isArray(work?.contributors) ? work.contributors : []).map((item: any) => ({
      partyType: item.party_type || "artist",
      partyEntityId: item.party_entity_id || "",
      name: item.name || "",
      role: item.role || "composer",
      sharePercent: item.share_percent == null ? "" : String(item.share_percent),
      controlledSharePercent: item.controlled_share_percent == null ? "" : String(item.controlled_share_percent),
    })), [work]);

  const publishersState: Publisher[] = useMemo(() =>
    (Array.isArray(work?.publishers) ? work.publishers : []).map((item: any) => ({
      publisherId: String(item.publisher_id),
      sharePercent: item.share_percent == null ? "" : String(item.share_percent),
      controlledSharePercent: item.controlled_share_percent == null ? "" : String(item.controlled_share_percent),
      isAdministrator: Boolean(item.is_administrator),
      administrationNotes: item.administration_notes || "",
    })), [work]);

  const registrations: Registration[] = useMemo(() =>
    (Array.isArray(work?.proRegistrations) ? work.proRegistrations : []).map((item: any) => ({
      proId: String(item.pro_id),
      proWorkNumber: item.pro_work_number || "",
      registrationStatus: item.registration_status || "pending",
      registrationDate: item.registration_date ? String(item.registration_date).slice(0, 10) : "",
      registrationReference: item.registration_reference || "",
      notes: item.notes || "",
    })), [work]);

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
    setWork((current: any) => ({ ...current, publishers: next.map((item) => ({ ...item })) }));
    setDirty(true);
  };

  const updateRegistration = (index: number, patch: Partial<Registration>) => {
    const next = [...registrations];
    next[index] = { ...next[index], ...patch };
    setWork((current: any) => ({ ...current, proRegistrations: next.map((item) => ({ ...item })) }));
    setDirty(true);
  };

  const handleContributorArtist = (index: number, artistId: string) => {
    const artist = artists.find((item) => String(item.id) === artistId);
    updateContributor(index, {
      partyType: "artist",
      partyEntityId: artistId,
      name: artist?.name || contributors[index].name,
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        workId: work.work_id || null,
        title: work.title,
        iswcCode: work.iswc_code || null,
        workType: work.work_type || null,
        status: work.status || "draft",
        originalWorkTitle: work.original_work_title || null,
        firstReleaseDate: work.first_release_date ? String(work.first_release_date).slice(0, 10) : null,
        notes: work.notes || null,
        contributors: contributors.map((item) => ({
          partyType: item.partyType,
          partyEntityId: item.partyEntityId || null,
          name: item.name,
          role: item.role,
          sharePercent: numberOrNull(item.sharePercent),
          controlledSharePercent: numberOrNull(item.controlledSharePercent),
        })),
        publishers: publishersState.filter((item) => item.publisherId).map((item) => ({
          publisherId: Number(item.publisherId),
          sharePercent: numberOrNull(item.sharePercent),
          controlledSharePercent: numberOrNull(item.controlledSharePercent),
          isAdministrator: item.isAdministrator,
          administrationNotes: item.administrationNotes || null,
        })),
        proRegistrations: registrations.filter((item) => item.proId).map((item) => ({
          proId: Number(item.proId),
          proWorkNumber: item.proWorkNumber || null,
          registrationStatus: item.registrationStatus || "pending",
          registrationDate: item.registrationDate || null,
          registrationReference: item.registrationReference || null,
          notes: item.notes || null,
        })),
        trackIds: allTracks.filter((track) => track.work_id === Number(id) || selectedTrackIds.has(track.id)).map((track) => track.id),
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

  const selectedTrackIds = useMemo(() => {
    const ids = new Set<number>();
    (Array.isArray(work?.recordings) ? work.recordings : []).forEach((track: any) => ids.add(Number(track.id)));
    return ids;
  }, [work]);

  const toggleTrack = (trackId: number) => {
    const current = new Set(selectedTrackIds);
    if (current.has(trackId)) current.delete(trackId); else current.add(trackId);
    const nextTracks = allTracks.filter((track) => current.has(Number(track.id)));
    setWork((currentWork: any) => ({ ...currentWork, recordings: nextTracks }));
    setDirty(true);
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!work) return <div className="p-12 text-center text-text-secondary">Work not found</div>;

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
                try { await api.delete(`/works?id=${id}`); router.push("/catalog/works"); }
                catch (e: any) { alert(e?.response?.data?.error || "Delete failed"); }
              }}><Trash2 size={14} /> Delete</Button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Card title="Identity">
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
            <div className="space-y-3">
              {contributors.map((contributor, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="md:col-span-4"><label className="text-xs font-bold text-text-secondary">Party</label><select className="input w-full" value={contributor.partyEntityId} onChange={(e) => handleContributorArtist(index, e.target.value)}><option value="">Select artist...</option>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></div>
                    <div className="md:col-span-2"><label className="text-xs font-bold text-text-secondary">Role</label><select className="input w-full" value={contributor.role} onChange={(e) => updateContributor(index, { role: e.target.value })}><option value="composer">Composer</option><option value="lyricist">Lyricist</option><option value="songwriter">Songwriter</option><option value="arranger">Arranger</option><option value="producer">Producer</option><option value="adapter">Adapter</option><option value="translator">Translator</option></select></div>
                    <div className="md:col-span-2"><label className="text-xs font-bold text-text-secondary">Share %</label><input className="input w-full" type="number" min="0" max="100" step="0.01" value={contributor.sharePercent} onChange={(e) => updateContributor(index, { sharePercent: e.target.value })} /></div>
                    <div className="md:col-span-2"><label className="text-xs font-bold text-text-secondary">Controlled %</label><input className="input w-full" type="number" min="0" max="100" step="0.01" value={contributor.controlledSharePercent} onChange={(e) => updateContributor(index, { controlledSharePercent: e.target.value })} /></div>
                    <div className="flex items-end justify-end md:col-span-2"><Button variant="secondary" size="sm" onClick={() => { const next = contributors.filter((_, i) => i !== index); setWork((current: any) => ({ ...current, contributors: next })); setDirty(true); }}><Trash2 size={14} /></Button></div>
                  </div>
                  <div className="text-xs text-text-secondary">{contributor.name || "No party selected"} · {contributor.partyType}</div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => { const next = [...contributors, emptyContributor()]; setWork((current: any) => ({ ...current, contributors: next })); setDirty(true); }}><Plus size={14} /> Add Contributor</Button>
            </div>
          </Card>

          <Card title="Publishing">
            <div className="space-y-3">
              {publishersState.map((publisher, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="md:col-span-4"><label className="text-xs font-bold text-text-secondary">Publisher</label><select className="input w-full" value={publisher.publisherId} onChange={(e) => updatePublisher(index, { publisherId: e.target.value })}><option value="">Select publisher...</option>{publishers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                    <div className="md:col-span-2"><label className="text-xs font-bold text-text-secondary">Share %</label><input className="input w-full" type="number" min="0" max="100" step="0.01" value={publisher.sharePercent} onChange={(e) => updatePublisher(index, { sharePercent: e.target.value })} /></div>
                    <div className="md:col-span-2"><label className="text-xs font-bold text-text-secondary">Controlled %</label><input className="input w-full" type="number" min="0" max="100" step="0.01" value={publisher.controlledSharePercent} onChange={(e) => updatePublisher(index, { controlledSharePercent: e.target.value })} /></div>
                    <label className="flex items-end gap-2 pb-2 text-sm md:col-span-2"><input type="checkbox" checked={publisher.isAdministrator} onChange={(e) => updatePublisher(index, { isAdministrator: e.target.checked })} /> Administrator</label>
                    <div className="flex items-end justify-end md:col-span-2"><Button variant="secondary" size="sm" onClick={() => { const next = publishersState.filter((_, i) => i !== index); setWork((current: any) => ({ ...current, publishers: next })); setDirty(true); }}><Trash2 size={14} /></Button></div>
                  </div>
                  <input className="input w-full" value={publisher.administrationNotes} onChange={(e) => updatePublisher(index, { administrationNotes: e.target.value })} placeholder="Administration notes" />
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => { const next = [...publishersState, emptyPublisher()]; setWork((current: any) => ({ ...current, publishers: next })); setDirty(true); }}><Plus size={14} /> Add Publisher</Button>
            </div>
          </Card>

          <Card title="PRO / Registration">
            <div className="space-y-3">
              {registrations.map((registration, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">PRO</span><select className="input w-full" value={registration.proId} onChange={(e) => updateRegistration(index, { proId: e.target.value })}><option value="">Select PRO...</option>{pros.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">PRO Work No.</span><input className="input w-full" value={registration.proWorkNumber} onChange={(e) => updateRegistration(index, { proWorkNumber: e.target.value })} /></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Registration Status</span><select className="input w-full" value={registration.registrationStatus} onChange={(e) => updateRegistration(index, { registrationStatus: e.target.value })}><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="registered">Registered</option><option value="rejected">Rejected</option></select></label>
                    <label className="space-y-1"><span className="text-xs font-bold text-text-secondary">Registration Date</span><input className="input w-full" type="date" value={registration.registrationDate} onChange={(e) => updateRegistration(index, { registrationDate: e.target.value })} /></label>
                    <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Reference</span><input className="input w-full" value={registration.registrationReference} onChange={(e) => updateRegistration(index, { registrationReference: e.target.value })} /></label>
                    <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-text-secondary">Registration Notes</span><textarea className="input w-full" rows={2} value={registration.notes} onChange={(e) => updateRegistration(index, { notes: e.target.value })} /></label>
                  </div>
                  <div className="flex justify-end"><Button variant="secondary" size="sm" onClick={() => { const next = registrations.filter((_, i) => i !== index); setWork((current: any) => ({ ...current, proRegistrations: next })); setDirty(true); }}><Trash2 size={14} /> Remove</Button></div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => { const next = [...registrations, emptyRegistration()]; setWork((current: any) => ({ ...current, proRegistrations: next })); setDirty(true); }}><Plus size={14} /> Add PRO Registration</Button>
            </div>
          </Card>

          <Card title="Administration & Evidence">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-text-secondary"><FileText size={16} /> Use the Work administration area for filings and documents; this section stores the operational notes that belong to the Work aggregate.</div>
              <textarea className="input w-full" rows={6} value={work.notes || ""} onChange={(e) => updateWork({ notes: e.target.value })} placeholder="Agreements, registration evidence, references, ownership notes..." />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Linked Recordings">
            <div className="space-y-2">
              {allTracks.length === 0 ? <p className="text-sm text-text-secondary">No tracks available.</p> : allTracks.map((track) => (
                <label key={track.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10">
                  <span className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={selectedTrackIds.has(Number(track.id))} onChange={() => toggleTrack(Number(track.id))} /><Music size={15} /><span className="truncate text-sm">{track.title}</span></span>
                  <Badge variant="neutral">{track.isrc_code || "—"}</Badge>
                </label>
              ))}
            </div>
          </Card>

          <Card title="Work Summary">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-text-secondary">Writers</span><Badge variant="primary">{contributors.length}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-text-secondary">Publishers</span><Badge variant="primary">{publishersState.length}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-text-secondary">PRO registrations</span><Badge variant="primary">{registrations.length}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-text-secondary">Recordings</span><Badge variant="primary">{selectedTrackIds.size}</Badge></div>
              <div className="flex items-center gap-2 pt-2 text-xs text-text-secondary"><Users size={14} /> Authorship is stored as first-class Work participation.</div>
              <div className="flex items-center gap-2 text-xs text-text-secondary"><Building2 size={14} /> Publishing is separate from creator participation.</div>
              <div className="flex items-center gap-2 text-xs text-text-secondary"><ShieldCheck size={14} /> PRO registration is separate from publishing.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
