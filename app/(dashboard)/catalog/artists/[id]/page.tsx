"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/artists?id=${id}`).then(r => setArtist(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!artist) return <div className="p-12 text-center text-text-secondary">Artist not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={artist.name || artist.stage_name || "Artist"} subtitle={`Artist #${id}`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Details</h3>
          <div className="space-y-3">
            <div><span className="text-text-secondary text-sm">Name:</span><p className="text-white">{artist.name || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Stage Name:</span><p className="text-white">{artist.stage_name || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Email:</span><p className="text-white">{artist.email || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">IPI:</span><p className="text-white">{artist.ipi_number || "—"}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
