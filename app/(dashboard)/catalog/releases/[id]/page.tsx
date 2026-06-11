"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

export default function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [release, setRelease] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/releases?id=${id}`).then(r => setRelease(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!release) return <div className="p-12 text-center text-text-secondary">Release not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={release.title || "Release"} subtitle={`Release #${id}`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Details</h3>
          <div className="space-y-3">
            <div><span className="text-text-secondary text-sm">Title:</span><p className="text-white">{release.title || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Type:</span><p className="text-white">{release.release_type || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Release Date:</span><p className="text-white">{release.release_date ? new Date(release.release_date).toLocaleDateString() : "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Catalog #:</span><p className="text-white">{release.catalog_number || "—"}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
