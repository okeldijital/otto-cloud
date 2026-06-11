"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Globe, Database, ExternalLink, Key, MapPin, Activity, Settings, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

export default function PlatformDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [platform, setPlatform] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/network/platforms?id=${id}`).then((r) => setPlatform(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading platform technical metadata...</div>;
  if (!platform) return <div className="p-12 text-center text-text-secondary">Platform not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/network/platforms")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title={platform.name} subtitle={
          <Badge variant="primary" size="sm">{platform.platform_type || "Platform"}</Badge>
        } actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Sync Data</Button>
            <Button variant="primary" size="sm">Credential Settings</Button>
          </div>
        } />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title={<span className="flex items-center gap-2"><Settings size={16} className="text-primary" /> Technical Configuration</span>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-xs text-text-secondary uppercase font-bold mb-1">Platform Portal</div>
                {platform.portal_url ? (
                  <a href={platform.portal_url} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 text-sm">
                    {platform.portal_url} <ExternalLink size={12} />
                  </a>
                ) : <span className="text-text-secondary italic text-sm">Not configured</span>}
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-xs text-text-secondary uppercase font-bold mb-1">Account Reference</div>
                <div className="font-mono text-white text-lg">{platform.account_reference || "NONE"}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-xs text-text-secondary uppercase font-bold mb-1">Territory Coverage</div>
                <div className="text-white">{platform.territory_coverage || "Worldwide"}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-xs text-text-secondary uppercase font-bold mb-1">Integration Status</div>
                <div className="text-success font-bold text-sm">LEGACY (MANUAL)</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Execution Log">
            <div className="text-sm text-text-secondary py-4 text-center border-t border-white/5">
              No recent activity logged for this platform resource.
            </div>
          </Card>

          <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl text-center">
            <ShieldCheck size={32} className="mx-auto text-success mb-4" />
            <h3 className="font-bold text-white mb-1">Validated Resource</h3>
            <p className="text-xs text-text-secondary">This platform is a confirmed node in your label's supply chain.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
