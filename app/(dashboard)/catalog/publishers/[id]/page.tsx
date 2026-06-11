"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

export default function PublisherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [publisher, setPublisher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/publishers`).then(r => {
      const items = Array.isArray(r.data) ? r.data : [];
      const found = items.find((p: any) => String(p.id) === id);
      setPublisher(found || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!publisher) return <div className="p-12 text-center text-text-secondary">Publisher not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={publisher.name || "Publisher"} subtitle={`Publisher #${id}`} />
      <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-lg font-semibold text-white">Details</h3>
        <div className="space-y-3">
          <div><span className="text-text-secondary text-sm">Name:</span><p className="text-white">{publisher.name || "—"}</p></div>
          <div><span className="text-text-secondary text-sm">Code:</span><p className="text-white">{publisher.code || "—"}</p></div>
        </div>
      </div>
    </div>
  );
}
