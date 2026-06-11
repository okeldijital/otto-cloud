"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

export default function ProDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/pros?id=${id}`).then(r => setPro(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!pro) return <div className="p-12 text-center text-text-secondary">PRO not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={pro.name || "PRO"} subtitle={`Performance Rights Organization #${id}`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Details</h3>
          <div className="space-y-3">
            <div><span className="text-text-secondary text-sm">Name:</span><p className="text-white">{pro.name || "—"}</p></div>
            <div><span className="text-text-secondary text-sm">Code:</span><p className="text-white">{pro.code || "—"}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
