"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [track, setTrack] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/tracks?id=${id}`).then(r => setTrack(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!track) return <div className="p-12 text-center text-text-secondary">Track not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={track.title || "Track"} subtitle={`Track #${id}`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Details</h3>
          <div className="space-y-3">
            <div><span className="text-text-secondary text-sm">Title:</span><p className="text-white">{track.title || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">ISRC:</span><p className="text-white">{track.isrc || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Genre:</span><p className="text-white">{track.genre || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Duration:</span><p className="text-white">{track.duration || "—"}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
