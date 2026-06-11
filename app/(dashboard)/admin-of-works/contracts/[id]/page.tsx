"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/contracts?id=${id}`).then(r => setContract(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!contract) return <div className="p-12 text-center text-text-secondary">Contract not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={contract.title || "Contract"} subtitle={`Contract #${id}`} />
      <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-lg font-semibold text-white">Details</h3>
        <div className="space-y-3">
          <div><span className="text-text-secondary text-sm">Title:</span><p className="text-white">{contract.title || "—"}</p></div>
          <div><span className="text-text-secondary text-sm">Status:</span><p className="text-white">{contract.status || "—"}</p></div>
          <div><span className="text-text-secondary text-sm">Created:</span><p className="text-white">{contract.created_at ? new Date(contract.created_at).toLocaleDateString() : "—"}</p></div>
        </div>
      </div>
    </div>
  );
}
