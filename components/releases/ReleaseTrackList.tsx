"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Plus, Save, Search, Trash2, Users, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

type Props = {
  releaseId: number;
  tracks: any[];
  availableTracks: any[];
  artists: any[];
  onTrackOrderChange: (ids: number[]) => void;
  onError: (message: string) => void;
};

type TrackForm = {
  title: string;
  isrc_code: string;
  genre: string;
  duration: string;
  release_date: string;
  streaming_link: string;
  work_id: string;
  artist_ids: number[];
};

type CreditRow = {
  name: string;
  role: string;
  share_percent: string;
  source?: Record<string, any>;
};

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-accent placeholder:text-text-secondary/60 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelClass = "text-xs font-medium text-text-secondary";

function formatDate(value: any) { return value ? String(value).slice(0, 10) : ""; }
function formatDuration(value: any) {
  if (!value) return "";
  const raw = String(value);
  return raw.includes("T") ? raw.split("T")[1]?.slice(0, 8) || "" : raw.slice(0, 8);
}
function unwrapMany(value: any) {
  return Array.isArray(value?.data) ? value.data : Array.isArray(value?.data?.items) ? value.data.items : [];
}
function displayArtist(artist: any) { return artist?.display_name || artist?.stage_name || artist?.name || `Artist #${artist?.id ?? ""}`; }
function parseCredits(value: any) { return Array.isArray(value) ? value : []; }
function normalizeCreditRows(value: any): CreditRow[] {
  return parseCredits(value).map((item: any) => ({
    name: item?.name || item?.artist_name || item?.display_name || item?.member || item?.party_name || "",
    role: item?.role || item?.type || item?.credit_type || "",
    share_percent: item?.share_percent ?? item?.share ?? item?.percentage ?? item?.percent ?? "",
    source: item,
  }));
}
function creditRowsToPayload(rows: CreditRow[]) {
  return rows
    .filter((row) => row.name.trim() || row.role.trim() || row.share_percent !== "")
    .map((row) => ({
      ...(row.source || {}),
      name: row.name.trim(),
      role: row.role.trim() || "Credit",
      share_percent: row.share_percent === "" ? null : Number(row.share_percent),
    }));
}
function creditShareTotal(rows: CreditRow[]) {
  return rows.reduce((total, row) => {
    const share = Number(row.share_percent);
    return Number.isFinite(share) ? total + share : total;
  }, 0);
}

export default function ReleaseTrackList({ releaseId, tracks, availableTracks, artists, onTrackOrderChange, onError }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, string>>({});
  const [details, setDetails] = useState<Record<number, any>>({});
  const [forms, setForms] = useState<Record<number, TrackForm>>({});
  const [creditRows, setCreditRows] = useState<Record<number, CreditRow[]>>({});
  const [works, setWorks] = useState<any[]>([]);
  const [worksLoaded, setWorksLoaded] = useState(false);
  const [savingTrackId, setSavingTrackId] = useState<number | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  const [trackSearch, setTrackSearch] = useState("");
  const [showAddTracks, setShowAddTracks] = useState(false);
  const [artistSearch, setArtistSearch] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!expandedId || worksLoaded) return;
    api.get("/works?limit=100").then((response) => {
      setWorks(unwrapMany(response));
      setWorksLoaded(true);
    }).catch(() => setWorksLoaded(true));
  }, [expandedId, worksLoaded]);

  const trackIds = useMemo(() => tracks.map((track) => track.id), [tracks]);
  const filteredAvailable = useMemo(() => {
    const q = trackSearch.trim().toLowerCase();
    return availableTracks
      .filter((track) => !trackIds.includes(track.id))
      .filter((track) => !q || `${track.title || ""} ${track.isrc_code || ""}`.toLowerCase().includes(q))
      .slice(0, 80);
  }, [availableTracks, trackIds, trackSearch]);

  const openTrack = async (trackId: number) => {
    if (expandedId === trackId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(trackId);
    setActiveTab((current) => ({ ...current, [trackId]: current[trackId] || "details" }));
    if (details[trackId]) return;

    setLoadingTrackId(trackId);
    try {
      const response = await api.get(`/tracks?id=${trackId}`);
      const track = response.data;
      let work = null;
      if (track.work_id) {
        try { work = (await api.get(`/works?id=${track.work_id}`)).data; } catch { work = null; }
      }
      setDetails((current) => ({ ...current, [trackId]: { ...track, work } }));
      setForms((current) => ({
        ...current,
        [trackId]: {
          title: track.title || "",
          isrc_code: track.isrc_code || "",
          genre: track.genre || "",
          duration: formatDuration(track.duration),
          release_date: formatDate(track.release_date),
          streaming_link: track.streaming_link || "",
          work_id: track.work_id ? String(track.work_id) : "",
          artist_ids: Array.isArray(track.artist_ids) ? track.artist_ids : [],
        },
      }));
      setCreditRows((current) => ({ ...current, [trackId]: normalizeCreditRows(track.credits) }));
    } catch (err: any) {
      onError(err?.response?.data?.error || "Unable to load track details.");
    } finally {
      setLoadingTrackId(null);
    }
  };

  const updateForm = (trackId: number, patch: Partial<TrackForm>) => {
    setForms((current) => ({ ...current, [trackId]: { ...current[trackId], ...patch } }));
  };

  const updateCreditRow = (trackId: number, index: number, patch: Partial<CreditRow>) => {
    setCreditRows((current) => ({ ...current, [trackId]: (current[trackId] || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }));
  };
  const addCreditRow = (trackId: number) => {
    setCreditRows((current) => ({ ...current, [trackId]: [...(current[trackId] || []), { name: "", role: "", share_percent: "" }] }));
  };
  const removeCreditRow = (trackId: number, index: number) => {
    setCreditRows((current) => ({ ...current, [trackId]: (current[trackId] || []).filter((_, rowIndex) => rowIndex !== index) }));
  };

  const saveTrack = async (trackId: number) => {
    const form = forms[trackId];
    if (!form?.title.trim()) { onError("Track title is required."); return; }
    setSavingTrackId(trackId);
    onError("");
    try {
      const credits = creditRowsToPayload(creditRows[trackId] || []);
      await api.put(`/tracks?id=${trackId}`, {
        title: form.title.trim(),
        isrc_code: form.isrc_code.trim() || null,
        genre: form.genre.trim() || null,
        duration: form.duration.trim() || null,
        release_date: form.release_date || null,
        streaming_link: form.streaming_link.trim() || null,
        work_id: form.work_id ? Number(form.work_id) : null,
        artist_ids: form.artist_ids,
        credits,
      });
      const updated = (await api.get(`/tracks?id=${trackId}`)).data;
      let work = null;
      if (updated.work_id) {
        try { work = (await api.get(`/works?id=${updated.work_id}`)).data; } catch { work = null; }
      }
      setDetails((current) => ({ ...current, [trackId]: { ...updated, work } }));
      setForms((current) => ({
        ...current,
        [trackId]: {
          title: updated.title || "",
          isrc_code: updated.isrc_code || "",
          genre: updated.genre || "",
          duration: formatDuration(updated.duration),
          release_date: formatDate(updated.release_date),
          streaming_link: updated.streaming_link || "",
          work_id: updated.work_id ? String(updated.work_id) : "",
          artist_ids: Array.isArray(updated.artist_ids) ? updated.artist_ids : [],
        },
      }));
      setCreditRows((current) => ({ ...current, [trackId]: normalizeCreditRows(updated.credits) }));
    } catch (err: any) {
      onError(err?.response?.data?.error || err?.message || "Unable to save track.");
    } finally {
      setSavingTrackId(null);
    }
  };

  const addTrack = (trackId: number) => {
    onTrackOrderChange([...trackIds, trackId]);
    setTrackSearch("");
    setShowAddTracks(false);
    void openTrack(trackId);
  };

  const removeTrack = (trackId: number) => {
    onTrackOrderChange(trackIds.filter((id) => id !== trackId));
    if (expandedId === trackId) setExpandedId(null);
  };

  const moveTrack = (trackId: number, direction: -1 | 1) => {
    const index = trackIds.indexOf(trackId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= trackIds.length) return;
    const next = [...trackIds];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onTrackOrderChange(next);
  };

  return (
    <Card title="Tracklist" subtitle="Tracks appear in release sequence. Expand a track to view and edit its metadata without leaving the release.">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-3">
        <div>
          <p className="text-sm font-medium text-text-accent">{tracks.length} track{tracks.length === 1 ? "" : "s"}</p>
          <p className="text-xs text-text-secondary">The numbered order is the delivery sequence for this release.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddTracks((value) => !value)}>
          <Plus size={14} /> {showAddTracks ? "Close track picker" : "Add tracks"}
        </Button>
      </div>

      {showAddTracks && (
        <div className="mb-5 rounded-lg border border-border bg-surface p-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input className={`${fieldClass} pl-9`} value={trackSearch} onChange={(e) => setTrackSearch(e.target.value)} placeholder="Search tracks by title or ISRC..." />
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border">
            {filteredAvailable.length ? filteredAvailable.map((track: any) => (
              <button key={track.id} type="button" onClick={() => addTrack(track.id)} className="flex w-full items-center justify-between gap-4 border-b border-border px-3 py-3 text-left last:border-b-0 hover:bg-surface-elevated">
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-text-accent">{track.title}</span><span className="block truncate text-xs text-text-secondary">{track.isrc_code || "No ISRC"}</span></span>
                <Plus size={15} className="shrink-0 text-accent" />
              </button>
            )) : <p className="px-3 py-5 text-center text-xs text-text-secondary">No additional tracks found.</p>}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tracks.length ? tracks.map((track: any, index: number) => {
          const open = expandedId === track.id;
          const detail = details[track.id] || track;
          const form = forms[track.id];
          const tab = activeTab[track.id] || "details";
          const linkedArtists = (detail.artist_ids || []).map((artistId: number) => artists.find((artist) => artist.id === artistId)).filter(Boolean);

          return (
            <div key={track.id} className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className={`flex items-center gap-2 px-3 py-3 ${open ? "bg-surface-elevated" : ""}`}>
                <button type="button" onClick={() => openTrack(track.id)} className="shrink-0 rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-text-accent" aria-label={open ? "Collapse track" : "Expand track"}>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold text-text-accent">{index + 1}</div>
                <button type="button" onClick={() => openTrack(track.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-text-accent">{detail.title || track.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-text-secondary">
                    {linkedArtists.length ? linkedArtists.map(displayArtist).join(", ") : "No artists linked"}
                    {detail.isrc_code ? ` · ${detail.isrc_code}` : ""}
                    {detail.duration ? ` · ${formatDuration(detail.duration)}` : ""}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/catalog/tracks/${track.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-text-accent"
                    aria-label={`Open ${detail.title || track.title} full track page`}
                    title="Open full track page"
                  >
                    <ExternalLink size={15} />
                  </Link>
                  <div className="hidden items-center gap-1 sm:flex">
                    <button type="button" onClick={() => moveTrack(track.id, -1)} disabled={index === 0} className="rounded-md p-1.5 text-text-secondary hover:bg-surface-elevated disabled:opacity-30" aria-label="Move track up"><ChevronUp size={15} /></button>
                    <button type="button" onClick={() => moveTrack(track.id, 1)} disabled={index === tracks.length - 1} className="rounded-md p-1.5 text-text-secondary hover:bg-surface-elevated disabled:opacity-30" aria-label="Move track down"><ChevronDown size={15} /></button>
                  </div>
                </div>
                <button type="button" onClick={() => removeTrack(track.id)} className="rounded-md p-1.5 text-text-secondary hover:text-danger" aria-label={`Remove ${detail.title || track.title} from release`}><Trash2 size={15} /></button>
              </div>

              {open && (
                <div className="border-t border-border">
                  {loadingTrackId === track.id ? (
                    <div className="flex items-center gap-2 px-4 py-8 text-sm text-text-secondary"><Loader2 size={16} className="animate-spin" /> Loading track metadata...</div>
                  ) : form ? (
                    <>
                      <div className="flex overflow-x-auto border-b border-border bg-background px-3">
                        {[
                          ["details", "Details"],
                          ["artists", "Artists & Credits"],
                          ["publishing", "Publishing"],
                        ].map(([value, label]) => (
                          <button key={value} type="button" onClick={() => setActiveTab((current) => ({ ...current, [track.id]: value }))} className={`shrink-0 border-b-2 px-4 py-3 text-xs font-semibold transition ${tab === value ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-accent"}`}>
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="p-4">
                        {tab === "details" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <Field label="Track title" className="md:col-span-2"><input className={fieldClass} value={form.title} onChange={(e) => updateForm(track.id, { title: e.target.value })} /></Field>
                              <Field label="ISRC"><input className={fieldClass} value={form.isrc_code} onChange={(e) => updateForm(track.id, { isrc_code: e.target.value })} /></Field>
                              <Field label="Genre"><input className={fieldClass} value={form.genre} onChange={(e) => updateForm(track.id, { genre: e.target.value })} /></Field>
                              <Field label="Duration"><input className={fieldClass} placeholder="HH:MM:SS" value={form.duration} onChange={(e) => updateForm(track.id, { duration: e.target.value })} /></Field>
                              <Field label="Track release date"><input className={fieldClass} type="date" value={form.release_date} onChange={(e) => updateForm(track.id, { release_date: e.target.value })} /></Field>
                              <Field label="Linked work" className="md:col-span-2">
                                <select className={fieldClass} value={form.work_id} onChange={(e) => updateForm(track.id, { work_id: e.target.value })}>
                                  <option value="">No work linked</option>
                                  {works.map((work: any) => <option key={work.id} value={work.id}>{work.title}</option>)}
                                </select>
                              </Field>
                              <Field label="Streaming link" className="md:col-span-2"><input className={fieldClass} type="url" value={form.streaming_link} onChange={(e) => updateForm(track.id, { streaming_link: e.target.value })} placeholder="https://..." /></Field>
                            </div>
                            <div className="flex justify-end"><Button type="button" variant="primary" size="sm" onClick={() => saveTrack(track.id)} disabled={savingTrackId === track.id}>{savingTrackId === track.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save track</Button></div>
                          </div>
                        )}

                        {tab === "artists" && (
                          <div className="space-y-5">
                            <div>
                              <div className="mb-2 flex items-center gap-2"><Users size={15} className="text-accent" /><p className="text-sm font-semibold text-text-accent">Track artists</p></div>
                              <div className="flex flex-wrap gap-2">
                                {(form.artist_ids || []).map((artistId: number) => {
                                  const artist = artists.find((item) => item.id === artistId);
                                  if (!artist) return null;
                                  return <span key={artistId} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-accent">{displayArtist(artist)}<button type="button" onClick={() => updateForm(track.id, { artist_ids: form.artist_ids.filter((id) => id !== artistId) })} className="text-text-secondary hover:text-danger"><X size={13} /></button></span>;
                                })}
                              </div>
                              <div className="mt-3 max-w-md">
                                <input className={fieldClass} value={artistSearch[track.id] || ""} onChange={(e) => setArtistSearch((current) => ({ ...current, [track.id]: e.target.value }))} placeholder="Add artist..." />
                                {!!(artistSearch[track.id] || "").trim() && (
                                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
                                    {artists.filter((artist) => !form.artist_ids.includes(artist.id)).filter((artist) => displayArtist(artist).toLowerCase().includes((artistSearch[track.id] || "").toLowerCase())).slice(0, 20).map((artist) => (
                                      <button key={artist.id} type="button" onClick={() => { updateForm(track.id, { artist_ids: [...form.artist_ids, artist.id] }); setArtistSearch((current) => ({ ...current, [track.id]: "" })); }} className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface-elevated">
                                        <span className="text-sm text-text-accent">{displayArtist(artist)}</span><Plus size={14} className="text-accent" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-text-accent">Credits & splits</p>
                                  <p className="mt-1 text-xs text-text-secondary">Add contributors, roles and royalty/split percentages directly to this track.</p>
                                </div>
                                <Button type="button" variant="secondary" size="sm" onClick={() => addCreditRow(track.id)}><Plus size={14} />Add credit</Button>
                              </div>
                              <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full min-w-[640px] text-left text-xs">
                                  <thead className="bg-surface-elevated text-text-secondary"><tr><th className="px-3 py-2 font-medium">Contributor</th><th className="px-3 py-2 font-medium">Role</th><th className="w-32 px-3 py-2 font-medium">Split %</th><th className="w-12 px-2 py-2" /></tr></thead>
                                  <tbody>
                                    {(creditRows[track.id] || []).map((row, rowIndex) => (
                                      <tr key={rowIndex} className="border-t border-border">
                                        <td className="px-3 py-2"><input className={fieldClass} value={row.name} onChange={(e) => updateCreditRow(track.id, rowIndex, { name: e.target.value })} placeholder="Artist, producer, licensor..." /></td>
                                        <td className="px-3 py-2"><input className={fieldClass} value={row.role} onChange={(e) => updateCreditRow(track.id, rowIndex, { role: e.target.value })} placeholder="Original Artist, Producer, ..." /></td>
                                        <td className="px-3 py-2"><input className={fieldClass} type="number" min="0" max="100" step="0.01" value={row.share_percent} onChange={(e) => updateCreditRow(track.id, rowIndex, { share_percent: e.target.value })} placeholder="0" /></td>
                                        <td className="px-2 py-2 text-center"><button type="button" onClick={() => removeCreditRow(track.id, rowIndex)} className="rounded-md p-2 text-text-secondary hover:bg-surface-elevated hover:text-danger" aria-label="Remove credit"><Trash2 size={14} /></button></td>
                                      </tr>
                                    ))}
                                    {!(creditRows[track.id] || []).length && <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-text-secondary">No credits or splits added yet.</td></tr>}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="text-text-secondary">Total allocated: <strong className="text-text-accent">{creditShareTotal(creditRows[track.id] || []).toFixed(2)}%</strong></span>
                                <span className={Math.abs(creditShareTotal(creditRows[track.id] || []) - 100) < 0.001 ? "text-accent" : "text-text-secondary"}>{Math.abs(creditShareTotal(creditRows[track.id] || []) - 100) < 0.001 ? "Fully allocated" : "Allocation can be completed when the split is final"}</span>
                              </div>
                            </div>

                            <div className="flex justify-end"><Button type="button" variant="primary" size="sm" onClick={() => saveTrack(track.id)} disabled={savingTrackId === track.id}>{savingTrackId === track.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save artists & credits</Button></div>
                          </div>
                        )}

                        {tab === "publishing" && <PublishingPanel work={detail.work} />}

                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm font-medium text-text-accent">No tracks on this release yet.</p>
            <p className="mt-1 text-xs text-text-secondary">Use Add tracks to build the release sequence.</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function PublishingPanel({ work }: { work: any }) {
  if (!work) {
    return <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center"><p className="text-sm font-medium text-text-accent">No musical work linked</p><p className="mt-1 text-xs text-text-secondary">Link a work in the Details tab to see publishing, PRO and split information here.</p></div>;
  }
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3">
        <p className="text-xs text-text-secondary">Musical work</p>
        <p className="mt-1 text-sm font-semibold text-text-accent">{work.title}</p>
        <p className="mt-1 text-xs text-text-secondary">{work.work_id || `Work #${work.id}`}{work.iswc_code ? ` · ISWC ${work.iswc_code}` : ""}</p>
      </div>
      <section>
        <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-text-accent">Contributor splits</h4><span className="text-xs text-text-secondary">{Array.isArray(work.contributors) ? work.contributors.length : 0} contributors</span></div>
        {work.contributors?.length ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated text-text-secondary"><tr><th className="px-3 py-2 font-medium">Contributor</th><th className="px-3 py-2 font-medium">Role</th><th className="px-3 py-2 font-medium">Share</th><th className="px-3 py-2 font-medium">Controlled</th><th className="px-3 py-2 font-medium">PRO</th><th className="px-3 py-2 font-medium">Publisher</th></tr></thead>
              <tbody>{work.contributors.map((item: any) => <tr key={item.id} className="border-t border-border"><td className="px-3 py-2 text-text-accent">{item.name}</td><td className="px-3 py-2 text-text-secondary">{item.role}</td><td className="px-3 py-2 text-text-secondary">{item.share_percent == null ? "—" : `${item.share_percent}%`}</td><td className="px-3 py-2 text-text-secondary">{item.controlled_share_percent == null ? "—" : `${item.controlled_share_percent}%`}</td><td className="px-3 py-2 text-text-secondary">{item.pro_name || "—"}</td><td className="px-3 py-2 text-text-secondary">{item.publisher_name || "—"}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-text-secondary">No contributor splits recorded on the work.</p>}
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-text-accent">Publishers</h4>
          {work.publishers?.length ? work.publishers.map((item: any) => <div key={item.id} className="mb-2 rounded-lg border border-border bg-surface px-3 py-3"><p className="text-sm text-text-accent">{item.publisher_name || item.publisher_id}</p><p className="mt-1 text-xs text-text-secondary">Share {item.share_percent == null ? "—" : `${item.share_percent}%`} · Controlled {item.controlled_share_percent == null ? "—" : `${item.controlled_share_percent}%`}{item.is_administrator ? " · Administrator" : ""}</p></div>) : <p className="text-xs text-text-secondary">No publishers recorded.</p>}
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-text-accent">PRO registrations</h4>
          {work.proRegistrations?.length ? work.proRegistrations.map((item: any) => <div key={item.id} className="mb-2 rounded-lg border border-border bg-surface px-3 py-3"><p className="text-sm text-text-accent">{item.pro_name || item.pro_id}</p><p className="mt-1 text-xs text-text-secondary">{item.registration_status || "pending"}{item.pro_work_number ? ` · ${item.pro_work_number}` : ""}{item.registration_date ? ` · ${String(item.registration_date).slice(0, 10)}` : ""}</p></div>) : <p className="text-xs text-text-secondary">No PRO registrations recorded.</p>}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children, className = "" }: any) {
  return <label className={`block min-w-0 ${className}`}><span className={labelClass}>{label}</span>{children}</label>;
}
function Info({ label, value }: { label: string; value: any }) {
  return <div className="rounded-lg border border-border bg-surface px-3 py-3"><p className={labelClass}>{label}</p><p className="mt-1 break-words text-sm text-text-accent">{String(value ?? "—")}</p></div>;
}
