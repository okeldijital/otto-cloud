"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, Plus, ExternalLink, Key, MapPin, Database, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const PLATFORM_TYPES = ["Distribution", "Rights Collection", "Analytics", "Payments", "Social", "Other"];

export default function PlatformsPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPlatform, setNewPlatform] = useState({
    name: "",
    platform_type: "Distribution",
    portal_url: "",
    account_reference: "",
    territory_coverage: "Worldwide",
  });

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/network/platforms");
      setPlatforms(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlatforms(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/network/platforms", newPlatform);
      setShowAddModal(false);
      setNewPlatform({ name: "", platform_type: "Distribution", portal_url: "", account_reference: "", territory_coverage: "Worldwide" });
      fetchPlatforms();
    } catch (err: any) { alert(err?.response?.data?.error || "Failed to create"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (platform: any) => {
    if (!window.confirm(`Delete "${platform.name}"?`)) return;
    try {
      await api.delete(`/network/platforms?id=${platform.id}`);
      fetchPlatforms();
    } catch (err: any) { alert("Failed to delete"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platforms"
        subtitle="Non-human but critical actors in the label ecosystem."
        actions={
          <Button variant="orange" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Add Platform
          </Button>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-text-secondary">Loading...</div>
      ) : platforms.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Database size={48} className="mx-auto text-text-secondary mb-4 opacity-40" />
            <p className="text-text-secondary">No platforms yet. Add your first platform resource.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <div key={platform.id}
              className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:border-white/20 transition-all cursor-pointer group"
              onClick={() => router.push(`/network/platforms/${platform.id}`)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white/5 rounded-xl text-blue-400">
                  <Database size={24} />
                </div>
                <div className="flex gap-2">
                  <Badge variant="primary" size="sm">{platform.platform_type || "Other"}</Badge>
                  <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleDelete(platform); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{platform.name}</h3>

              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-start gap-3 text-sm">
                  <Globe size={16} className="text-text-secondary mt-0.5" />
                  <div>
                    <div className="text-text-secondary text-xs">Portal URL</div>
                    {platform.portal_url ? (
                      <a href={platform.portal_url} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {platform.portal_url} <ExternalLink size={12} />
                      </a>
                    ) : <span className="text-text-secondary">Not specified</span>}
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Key size={16} className="text-text-secondary mt-0.5" />
                  <div>
                    <div className="text-text-secondary text-xs">Account Ref</div>
                    <span className="font-mono text-white">{platform.account_reference || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin size={16} className="text-text-secondary mt-0.5" />
                  <div>
                    <div className="text-text-secondary text-xs">Territory Coverage</div>
                    <span className="text-white">{platform.territory_coverage || "Worldwide"}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EntityForm title="New Platform Resource" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Platform Name</label>
            <input className="input w-full" value={newPlatform.name} onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })} required placeholder="e.g. Spotify for Artists" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Platform Type</label>
            <select className="input w-full" value={newPlatform.platform_type} onChange={(e) => setNewPlatform({ ...newPlatform, platform_type: e.target.value })}>
              {PLATFORM_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Portal URL</label>
            <input className="input w-full" value={newPlatform.portal_url} onChange={(e) => setNewPlatform({ ...newPlatform, portal_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Account Reference</label>
            <input className="input w-full" value={newPlatform.account_reference} onChange={(e) => setNewPlatform({ ...newPlatform, account_reference: e.target.value })} placeholder="e.g. USER-12345" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Territory Coverage</label>
            <input className="input w-full" value={newPlatform.territory_coverage} onChange={(e) => setNewPlatform({ ...newPlatform, territory_coverage: e.target.value })} placeholder="Worldwide" />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
