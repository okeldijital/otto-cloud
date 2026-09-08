"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Music, Plus, Search, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

type Track = {
  id: number;
  title: string;
  isrc_code?: string | null;
  genre?: string | null;
  duration?: string | null;
  release_id?: number | null;
};

type Props = {
  workspace: any;
  workspaceId: number;
  onRefresh?: () => void | Promise<void>;
};

function formatDuration(value?: string | null) {
  if (!value) return "—";
  const match = value.match(/(?:T)?(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z)?$/);
  if (match) return `${Number(match[1]) ? `${match[1]}:` : ""}${match[2]}:${match[3]}`;
  return value;
}

export default function TracksSection({ workspace }: Props) {
  const releaseId = Number(workspace?.release?.id);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [moveTrackIds, setMoveTrackIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchTracks = async () => {
    if (!releaseId) return;
    setLoading(true);
    setError(null);
    try {
      const [allTracksResponse, assignedResponse] = await Promise.all([
        api.get("/tracks"),
        api.get(`/releases?id=${releaseId}&relation=tracks`),
      ]);
      const allTracks = Array.isArray(allTracksResponse.data)
        ? allTracksResponse.data
        : allTracksResponse.data?.items || [];
      const assignedTracks = Array.isArray(assignedResponse.data) ? assignedResponse.data : [];
      setTracks(allTracks);
      setSelectedIds(assignedTracks.map((track: Track) => track.id));
      setMoveTrackIds([]);
    } catch (err: any) {
      console.error("Failed to load release tracks:", err);
      setError(err?.response?.data?.error || "Failed to load tracks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [releaseId]);

  const filteredTracks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tracks;
    return tracks.filter((track) =>
      [track.title, track.isrc_code, track.genre]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [tracks, search]);

  const assignedTracks = useMemo(
    () => tracks.filter((track) => selectedIds.includes(track.id)),
    [tracks, selectedIds]
  );

  const toggleTrack = (track: Track) => {
    setSaved(false);
    const assigned = selectedIds.includes(track.id);
    if (!assigned && track.release_id != null && track.release_id !== releaseId) {
      const confirmed = window.confirm(
        `"${track.title}" is already assigned to another Primary Release. Move it to this Release?`,
      );
      if (!confirmed) return;
      setMoveTrackIds((current) => [...new Set([...current, track.id])]);
    } else if (assigned) {
      setMoveTrackIds((current) => current.filter((trackId) => trackId !== track.id));
    }
    setSelectedIds((current) =>
      assigned ? current.filter((trackId) => trackId !== track.id) : [...current, track.id]
    );
  };

  const save = async () => {
    if (!releaseId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.put(`/releases?id=${releaseId}`, {
        track_ids: selectedIds,
        move_track_ids: moveTrackIds.filter((trackId) => selectedIds.includes(trackId)),
      });
      await fetchTracks();
      setSaved(true);
    } catch (err: any) {
      console.error("Failed to save release tracks:", err);
      setError(err?.response?.data?.error || "Failed to save track assignment");
    } finally {
      setSaving(false);
    }
  };

  if (!releaseId) {
    return <div className="py-12 text-center text-text-secondary">Release context is unavailable.</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card title={`Tracklist (${assignedTracks.length})`}>
        <div className="space-y-3">
          {assignedTracks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-text-secondary">
              <Music size={40} className="mx-auto mb-3 opacity-30" />
              <p>No tracks assigned to this release.</p>
              <p className="mt-1 text-xs">Select tracks from the catalogue to build the release tracklist.</p>
            </div>
          ) : (
            assignedTracks.map((track, index) => (
              <div key={track.id} className="flex items-center gap-3 rounded-lg border border-border bg-white/5 p-3">
                <span className="w-6 text-xs text-text-secondary">{index + 1}</span>
                <Music size={16} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{track.title}</div>
                  <div className="text-xs text-text-secondary">
                    {track.isrc_code || "No ISRC"} · {formatDuration(track.duration)}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${track.title}`}
                  onClick={() => toggleTrack(track)}
                  className="rounded-md p-2 text-text-secondary transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="Available Tracks">
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tracks..."
              aria-label="Search tracks to assign"
              className="input w-full pl-9"
            />
          </div>

          {loading ? (
            <div className="py-8 text-center text-text-secondary">Loading tracks...</div>
          ) : filteredTracks.length === 0 ? (
            <div className="py-8 text-center text-text-secondary">No tracks found.</div>
          ) : (
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {filteredTracks.map((track) => {
                const assigned = selectedIds.includes(track.id);
                const belongsToAnotherRelease = track.release_id != null && track.release_id !== releaseId;
                const markedForMove = moveTrackIds.includes(track.id);
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => toggleTrack(track)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      assigned ? "border-accent/60 bg-accent/10" : "border-border bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${assigned ? "border-accent bg-accent text-black" : "border-border"}`}>
                      {assigned ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                    <Music size={16} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{track.title}</span>
                      <span className="block text-xs text-text-secondary">
                        {track.isrc_code || "No ISRC"} · {track.genre || "No genre"}
                        {belongsToAnotherRelease ? (markedForMove ? " · Move to this release" : " · Assigned to another release") : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-text-secondary">{selectedIds.length} track{selectedIds.length === 1 ? "" : "s"} selected</span>
            <div className="flex items-center gap-3">
              {saved && <span className="text-sm text-green-400">Saved</span>}
              <Button variant="primary" size="sm" onClick={save} disabled={saving || loading}>
                {saving ? "Saving..." : "Save Tracklist"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
