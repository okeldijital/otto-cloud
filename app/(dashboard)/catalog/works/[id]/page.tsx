"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/works?id=${id}`).then(r => setWork(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!work) return <div className="p-12 text-center text-text-secondary">Work not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={work.title || "Work"} subtitle={`Work #${id}`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Details</h3>
          <div className="space-y-3">
            <div><span className="text-text-secondary text-sm">Title:</span><p className="text-white">{work.title || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Type:</span><p className="text-white">{work.work_type || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">ISWC:</span><p className="text-white">{work.iswc || "—"}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
