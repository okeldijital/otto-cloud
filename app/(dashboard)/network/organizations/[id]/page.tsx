"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, ChevronLeft, Globe, Mail, MapPin, FileText, PenLine, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const ORG_TYPES = ["Distributor", "Publisher", "Label", "PRO", "Legal", "Studio", "Accounting", "Other"];

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/network/organizations?id=${id}`);
      setOrg(res.data);
      setEditData({
        name: res.data.name,
        org_type: res.data.org_type || "Distributor",
        website: res.data.website || "",
        address: res.data.address || "",
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrg(); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.put(`/network/organizations?id=${id}`, editData);
      setOrg(data);
      setEditOpen(false);
    } catch (err: any) { alert(err?.response?.data?.error || "Failed to update"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/network/organizations?id=${id}`);
      router.push("/network/organizations");
    } catch (err: any) { alert(err?.response?.data?.error || "Delete failed"); }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!org) return <div className="p-12 text-center text-text-secondary">Organization not found</div>;

  const individuals = org.individual_organizations?.map((io: any) => io.individuals).filter(Boolean) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/network/organizations")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title={org.name} subtitle={org.org_type || "Organization"} actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><PenLine size={14} /> Edit</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} /> Delete</Button>
          </div>
        } />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Contracts & Catalog">
            <div className="bg-white/5 rounded-xl p-8 text-center border border-dashed border-white/10">
              <FileText size={32} className="mx-auto text-text-secondary mb-4 opacity-40" />
              <p className="text-text-secondary text-sm mb-4">No active contracts linked to this organization.</p>
              <Button variant="ghost" size="sm" onClick={() => router.push("/contracts")}>+ Initialize Contract</Button>
            </div>
          </Card>

          <Card title="Affiliated Catalog">
            <div className="bg-white/5 rounded-xl p-8 text-center">
              <Building2 size={32} className="mx-auto text-text-secondary mb-4 opacity-40" />
              <p className="text-text-secondary text-sm">Tracks and releases distributed or published by {org.name} will appear here.</p>
            </div>
          </Card>

          {individuals.length > 0 && (
            <Card title={`Individuals (${individuals.length})`}>
              <div className="space-y-2">
                {individuals.map((ind: any) => (
                  <div key={ind.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                    onClick={() => router.push(`/network/individuals/${ind.id}`)}>
                    <span className="font-medium text-sm">{ind.first_name} {ind.last_name}</span>
                    <span className="text-xs text-text-secondary">{ind.role || "—"}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Building2 size={40} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{org.name}</h2>
            <Badge variant="primary" size="sm">{org.org_type || "Organization"}</Badge>
            {org.address && (
              <div className="flex items-center justify-center gap-2 mt-4 text-text-secondary text-sm">
                <MapPin size={14} /> {org.address}
              </div>
            )}
          </div>

          <Card title="Contact Info">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Globe size={16} className="text-text-secondary" />
                <span>{org.website || "No website"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-text-secondary" />
                <span>No contact email</span>
              </div>
            </div>
          </Card>

          <Card title="Quick Stats">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span className="text-sm">Individuals</span><Badge variant="primary">{individuals.length}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-sm">Releases</span><Badge variant="primary">{org._count?.releases ?? 0}</Badge></div>
            </div>
          </Card>
        </div>
      </div>

      <EntityForm title="Edit Organization" isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} isSubmitting={submitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name</label>
            <input className="input w-full" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Type</label>
            <select className="input w-full" value={editData.org_type} onChange={(e) => setEditData({ ...editData, org_type: e.target.value })}>
              {ORG_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Website</label>
            <input className="input w-full" value={editData.website} onChange={(e) => setEditData({ ...editData, website: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Address</label>
            <textarea className="input w-full" rows={2} value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
