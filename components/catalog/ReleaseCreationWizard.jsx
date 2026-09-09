"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Music, Plus, UserRound, X } from "lucide-react";
import Button from "@/components/ui/Button";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";
import { invalidateEntityArtwork } from "@/hooks/useAttachment";
import { optimizeImage } from "@/lib/media/image-optimization";

const STEPS = ["Release", "Artists", "Tracks", "Artwork", "Contracts", "Review"];

function itemsFromResponse(response) {
  const value = response?.data;
  return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
}

function errorMessage(err, fallback) {
  const value = err?.response?.data?.error ?? err?.message;
  return typeof value === "string" && value.trim() ? value : fallback;
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-text-secondary">{label}</label>
      {children}
      {hint ? <p className="text-[11px] text-text-secondary">{hint}</p> : null}
    </div>
  );
}

function SelectableRow({ selected, onClick, title, subtitle, badge }) {
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? "border-accent bg-accent/10" : "border-border bg-surface hover:bg-surface-elevated"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text-primary">{title}</div>
          {subtitle ? <div className="truncate text-xs text-text-secondary">{subtitle}</div> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge ? <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary">{badge}</span> : null}
          {selected ? <Check size={16} className="text-accent" /> : null}
        </div>
      </div>
    </button>
  );
}

export default function ReleaseCreationWizard({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [releaseId, setReleaseId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [artists, setArtists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [artwork, setArtwork] = useState(null);
  const [artworkUploading, setArtworkUploading] = useState(false);
  const [linkedContractIds, setLinkedContractIds] = useState([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [moveTrackIds, setMoveTrackIds] = useState([]);
  const [release, setRelease] = useState({
    title: "",
    release_type: "Single",
    release_date: "",
    catalog_number: "",
    upc_code: "",
    label_id: "",
    distributor_id: "",
    streaming_link: "",
    status: "draft",
  });

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setReleaseId(null);
    setSaving(false);
    setError("");
    setArtwork(null);
    setArtworkUploading(false);
    setLinkedContractIds([]);
    setSelectedArtistIds([]);
    setSelectedTrackIds([]);
    setMoveTrackIds([]);
    setRelease({ title: "", release_type: "Single", release_date: "", catalog_number: "", upc_code: "", label_id: "", distributor_id: "", streaming_link: "", status: "draft" });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      api.get("/artists"),
      api.get("/tracks"),
      api.get("/contracts"),
    ]).then(([artistsRes, tracksRes, contractsRes]) => {
      setArtists(itemsFromResponse(artistsRes));
      setTracks(itemsFromResponse(tracksRes));
      setContracts(itemsFromResponse(contractsRes));
    }).catch((err) => console.error("Release wizard reference data failed", err));
  }, [isOpen]);

  const selectedArtists = useMemo(() => artists.filter((a) => selectedArtistIds.includes(a.id)), [artists, selectedArtistIds]);
  const selectedTracks = useMemo(() => tracks.filter((t) => selectedTrackIds.includes(t.id)), [tracks, selectedTrackIds]);
  const selectedContracts = useMemo(() => contracts.filter((c) => linkedContractIds.includes(c.id)), [contracts, linkedContractIds]);

  const createDraft = async () => {
    if (!release.title.trim()) {
      setError("Release title is required.");
      return null;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...release, release_date: release.release_date || undefined, catalog_number: release.catalog_number || undefined, upc_code: release.upc_code || undefined, label_id: release.label_id ? Number(release.label_id) : undefined, distributor_id: release.distributor_id ? Number(release.distributor_id) : undefined, streaming_link: release.streaming_link || undefined, status: "draft" };
      const response = await api.post("/releases", payload);
      const created = response.data;
      setReleaseId(created.id);
      return created.id;
    } catch (err) {
      setError(errorMessage(err, "Failed to create release draft."));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateRelease = async (payload) => {
    if (!releaseId) return false;
    setSaving(true);
    setError("");
    try {
      await api.put(`/releases?id=${releaseId}`, payload);
      return true;
    } catch (err) {
      setError(errorMessage(err, "Failed to save release changes."));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadArtwork = async () => {
    if (!artwork || !releaseId) return true;
    setArtworkUploading(true);
    setError("");
    try {
      const optimized = await optimizeImage(artwork, "artwork");
      const uploadResponse = await api.post("/storage/upload-url", {
        entityType: "release",
        entityId: String(releaseId),
        fileName: optimized.name,
        mimeType: optimized.type,
        fileSize: optimized.size,
        folder: "releases",
      });
      const upload = uploadResponse.data;
      const r2Response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": optimized.type }, body: optimized });
      if (!r2Response.ok) throw new Error(`R2 upload failed (${r2Response.status})`);
      await api.post("/storage/complete", { entityType: "release", entityId: String(releaseId), key: upload.key, fileName: upload.fileName, originalName: artwork.name, mimeType: optimized.type, fileSize: optimized.size });
      invalidateEntityArtwork("release", releaseId);
      return true;
    } catch (err) {
      setError(errorMessage(err, "Failed to upload release artwork."));
      return false;
    } finally {
      setArtworkUploading(false);
    }
  };

  const linkContracts = async () => {
    if (!releaseId) return true;
    for (const contractId of linkedContractIds) {
      try {
        await api.post("/contracts?action=add_asset", { id: contractId, asset_type: "Release", asset_id: releaseId });
      } catch (err) {
        const message = errorMessage(err, "Failed to link contract.");
        if (!message.toLowerCase().includes("already")) {
          setError(message);
          return false;
        }
      }
    }
    return true;
  };

  const next = async () => {
    setError("");
    if (step === 0) {
      const id = releaseId || await createDraft();
      if (!id) return;
    } else if (step === 1) {
      if (!(await updateRelease({ artist_ids: selectedArtistIds }))) return;
    } else if (step === 2) {
      if (!(await updateRelease({ track_ids: selectedTrackIds, move_track_ids: moveTrackIds }))) return;
    } else if (step === 3) {
      if (!(await uploadArtwork())) return;
    } else if (step === 4) {
      if (!(await linkContracts())) return;
    }
    if (step < STEPS.length - 1) setStep((current) => current + 1);
  };

  const finish = () => {
    const id = releaseId;
    onClose();
    if (id) onCreated?.(id);
  };

  const toggleArtist = (id) => setSelectedArtistIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const toggleTrack = (track) => {
    setSelectedTrackIds((ids) => ids.includes(track.id) ? ids.filter((id) => id !== track.id) : [...ids, track.id]);
    if (track.release_id && !selectedTrackIds.includes(track.id)) setMoveTrackIds((ids) => ids.includes(track.id) ? ids : [...ids, track.id]);
    if (!track.release_id) setMoveTrackIds((ids) => ids.filter((id) => id !== track.id));
  };
  const toggleContract = (id) => setLinkedContractIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);

  return (
    <EntityForm
      title={`New Release · ${STEPS[step]}`}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={(event) => { event.preventDefault(); next(); }}
      isSubmitting={saving || artworkUploading}
      error={error || undefined}
    >
      <div className="mb-6 grid grid-cols-6 gap-1">
        {STEPS.map((label, index) => (
          <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={`group text-center ${index <= step ? "text-text-primary" : "text-text-secondary"}`}>
            <div className={`mx-auto mb-2 h-1 rounded-full ${index <= step ? "bg-accent" : "bg-border"}`} />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div><h3 className="text-lg font-bold">Start with the release identity</h3><p className="text-sm text-text-secondary">Enter the information you would normally need to identify this release. Otto will keep it as a draft while you complete the setup.</p></div>
          <Field label="Release title *"><input className="input w-full" autoFocus value={release.title} onChange={(e) => setRelease({ ...release, title: e.target.value })} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Release type"><select className="input w-full" value={release.release_type} onChange={(e) => setRelease({ ...release, release_type: e.target.value })}><option>Single</option><option>EP</option><option>Album</option><option>Compilation</option></select></Field>
            <Field label="Release date"><input className="input w-full" type="date" value={release.release_date} onChange={(e) => setRelease({ ...release, release_date: e.target.value })} /></Field>
            <Field label="Catalog number"><input className="input w-full" value={release.catalog_number} onChange={(e) => setRelease({ ...release, catalog_number: e.target.value })} /></Field>
            <Field label="UPC"><input className="input w-full" value={release.upc_code} onChange={(e) => setRelease({ ...release, upc_code: e.target.value })} /></Field>
          </div>
          <Field label="Label"><input className="input w-full" list="release-labels" value={release.label_id} onChange={(e) => setRelease({ ...release, label_id: e.target.value })} placeholder="Label ID" /><datalist id="release-labels"><option value="" /></datalist></Field>
          <Field label="Distributor ID"><input className="input w-full" value={release.distributor_id} onChange={(e) => setRelease({ ...release, distributor_id: e.target.value })} /></Field>
          <Field label="Streaming link"><input className="input w-full" type="url" value={release.streaming_link} onChange={(e) => setRelease({ ...release, streaming_link: e.target.value })} placeholder="https://..." /></Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div><h3 className="text-lg font-bold">Who is on this release?</h3><p className="text-sm text-text-secondary">Select one or more catalog artists. Their existing stage-facing identity is used where available.</p></div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {artists.map((artist) => <SelectableRow key={artist.id} selected={selectedArtistIds.includes(artist.id)} onClick={() => toggleArtist(artist.id)} title={artist.display_name || artist.stage_name || artist.name} subtitle={artist.display_name || artist.stage_name ? artist.name : undefined} />)}
            {!artists.length ? <p className="py-8 text-center text-sm text-text-secondary">No artists available.</p> : null}
          </div>
          <p className="text-xs text-text-secondary">{selectedArtists.length} artist{selectedArtists.length === 1 ? "" : "s"} selected.</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div><h3 className="text-lg font-bold">Build the tracklist</h3><p className="text-sm text-text-secondary">Select existing tracks. Tracks already assigned to another Primary Release are explicitly marked for a move.</p></div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {tracks.map((track) => <SelectableRow key={track.id} selected={selectedTrackIds.includes(track.id)} onClick={() => toggleTrack(track)} title={track.title} subtitle={track.isrc_code || track.genre || "No ISRC"} badge={track.release_id ? (selectedTrackIds.includes(track.id) ? "Move Primary" : "Has Primary") : "Unassigned"} />)}
            {!tracks.length ? <p className="py-8 text-center text-sm text-text-secondary">No tracks available.</p> : null}
          </div>
          <p className="text-xs text-text-secondary">{selectedTracks.length} track{selectedTracks.length === 1 ? "" : "s"} selected · {moveTrackIds.length} primary move{moveTrackIds.length === 1 ? "" : "s"} requested.</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div><h3 className="text-lg font-bold">Add the release artwork</h3><p className="text-sm text-text-secondary">Artwork is optimized in the browser and uploaded directly to the media R2 bucket. The media policy caps artwork at 1.5 MB.</p></div>
          <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface hover:bg-surface-elevated">
            <ImageIcon size={40} className="mb-3 text-text-secondary" />
            <span className="text-sm font-semibold">{artwork ? artwork.name : "Choose artwork"}</span>
            <span className="mt-1 text-xs text-text-secondary">JPEG, PNG or WebP · optimized automatically</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setArtwork(e.target.files?.[0] || null)} />
          </label>
          {artwork ? <div className="flex items-center justify-between rounded-xl border border-border p-3 text-xs"><span>{artwork.name} · {(artwork.size / 1024 / 1024).toFixed(2)} MB source</span><button type="button" onClick={() => setArtwork(null)}><X size={15} /></button></div> : null}
          <p className="text-xs text-text-secondary">You can continue without artwork and add it later.</p>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div><h3 className="text-lg font-bold">Link contracts</h3><p className="text-sm text-text-secondary">Attach existing contracts to this release. This is optional and does not create a new contract.</p></div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {contracts.map((contract) => <SelectableRow key={contract.id} selected={linkedContractIds.includes(contract.id)} onClick={() => toggleContract(contract.id)} title={contract.title || contract.contract_number || `Contract ${contract.id}`} subtitle={contract.contract_number || contract.type || "Contract"} />)}
            {!contracts.length ? <p className="py-8 text-center text-sm text-text-secondary">No existing contracts available.</p> : null}
          </div>
          <p className="text-xs text-text-secondary">{selectedContracts.length} contract{selectedContracts.length === 1 ? "" : "s"} selected.</p>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div><h3 className="text-lg font-bold">Review release setup</h3><p className="text-sm text-text-secondary">Everything below belongs to the same draft. Nothing here publishes or distributes the release.</p></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[ ["Title", release.title || "—"], ["Type", release.release_type || "—"], ["Date", release.release_date || "TBA"], ["Catalog #", release.catalog_number || "—"], ["Artists", String(selectedArtists.length)], ["Tracks", String(selectedTracks.length)], ["Artwork", artwork ? "Selected" : "Not added"], ["Contracts", String(selectedContracts.length)], ["Status", "Draft"] ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</div><div className="mt-1 truncate text-sm font-semibold">{value}</div></div>)}
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary"><div className="mb-2 flex items-center gap-2 text-text-primary"><FileText size={15} /> Draft saved as you progressed</div><p>You can continue editing this release from its detail page after finishing this setup.</p></div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
        <Button type="button" variant="secondary" disabled={step === 0 || saving || artworkUploading} onClick={() => setStep((current) => Math.max(0, current - 1))}><ChevronLeft size={15} />Back</Button>
        {step < STEPS.length - 1 ? <Button type="submit" disabled={saving || artworkUploading}>{step === 0 ? "Create Draft & Continue" : "Save & Continue"}<ChevronRight size={15} /></Button> : <Button type="button" onClick={finish}><Check size={15} />Finish Release Setup</Button>}
      </div>
    </EntityForm>
  );
}
