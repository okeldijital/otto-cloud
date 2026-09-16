"use client";

import { useMemo, useState } from "react";
import { Plus, Music, UserPlus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

interface Props { contractId: string; }

const PARTY_ROLES = ["Artist", "Label", "Publisher", "Licensee", "Licensor", "Producer", "Other"];

export default function ContractQuickCreatePanel({ contractId }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"track" | "artist">("track");
  const [title, setTitle] = useState("");
  const [isrc, setIsrc] = useState("");
  const [artistName, setArtistName] = useState("");
  const [role, setRole] = useState("Artist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const heading = useMemo(() => mode === "track" ? "Create track from contract" : "Create artist from contract", [mode]);

  const reset = () => {
    setTitle(""); setIsrc(""); setArtistName(""); setRole("Artist"); setError(""); setSuccess("");
  };

  const createTrack = async () => {
    if (!title.trim()) { setError("Track title is required."); return; }
    setBusy(true); setError(""); setSuccess("");
    try {
      const payload: any = { title: title.trim() };
      if (isrc.trim()) payload.isrc_code = isrc.trim();
      const created = await api.post("/tracks", payload);
      const track = created.data;
      await api.post("/contracts?action=link_track", { id: Number(contractId), track_id: track.id });
      setSuccess(`Created “${track.title}” and linked it to this contract.`);
      setTitle(""); setIsrc("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to create and link the track.");
    } finally { setBusy(false); }
  };

  const createArtist = async () => {
    if (!artistName.trim()) { setError("Artist name is required."); return; }
    setBusy(true); setError(""); setSuccess("");
    try {
      const created = await api.post("/artists", { name: artistName.trim(), artist_kind: "solo" });
      const artist = created.data;
      await api.post("/contracts?action=add_party", {
        id: Number(contractId),
        entity_type: "Artist",
        entity_id: artist.id,
        role,
      });
      setSuccess(`Created “${artist.name}” and added them as a ${role.toLowerCase()} party.`);
      setArtistName("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to create and add the artist.");
    } finally { setBusy(false); }
  };

  return (
    <Card title="Add missing catalog records" headerAction={<Button variant="ghost" size="sm" onClick={() => { setOpen((v) => !v); if (!open) reset(); }}>{open ? <X size={14} /> : <Plus size={14} />} {open ? "Close" : "Create"}</Button>}>
      {!open ? (
        <p className="text-sm text-text-secondary">Create a future track or missing artist without leaving the contract. New records remain ordinary Core catalog/party records.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "track" ? "primary" : "secondary"} size="sm" onClick={() => { setMode("track"); setError(""); setSuccess(""); }}><Music size={14} /> Track</Button>
            <Button variant={mode === "artist" ? "primary" : "secondary"} size="sm" onClick={() => { setMode("artist"); setError(""); setSuccess(""); }}><UserPlus size={14} /> Artist</Button>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{heading}</h3>
            <p className="text-xs text-text-secondary mt-1">This creates deterministic master data and links it to the current contract. No document interpretation is performed.</p>
          </div>
          {mode === "track" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1"><span className="text-xs text-text-secondary">Track title *</span><input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Future or unreleased track" /></label>
              <label className="space-y-1"><span className="text-xs text-text-secondary">ISRC</span><input className="input w-full" value={isrc} onChange={(e) => setIsrc(e.target.value)} placeholder="Optional" /></label>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1"><span className="text-xs text-text-secondary">Artist name *</span><input className="input w-full" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist or group" /></label>
              <label className="space-y-1"><span className="text-xs text-text-secondary">Contract role</span><select className="input w-full" value={role} onChange={(e) => setRole(e.target.value)}>{PARTY_ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
          )}
          {error && <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
          {success && <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">{success}</div>}
          <div className="flex justify-end"><Button variant="primary" size="sm" disabled={busy} onClick={() => void (mode === "track" ? createTrack() : createArtist())}>{busy ? "Creating…" : mode === "track" ? "Create & Link Track" : "Create & Add Artist"}</Button></div>
        </div>
      )}
    </Card>
  );
}
