"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserCircle, ChevronLeft, Mail, Phone, Building2, PenLine, Trash2, Music, Disc } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import EntityProfileImageField from "@/components/media/EntityProfileImageField";
import EntityArtwork from "@/components/media/EntityArtwork";
import api from "@/lib/api";

export default function IndividualDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [individual, setIndividual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchIndividual = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/network/individuals?id=${id}`);
      const data = res.data;
      setIndividual(data);
      setEditData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
        role: data.role || "",
        relationship_strength: data.relationship_strength || "Regular",
        organization_ids: (data.individual_organizations || []).map((item: any) => item.organization_id),
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchIndividual(); api.get("/network/organizations").then((res) => setOrganizations(Array.isArray(res.data) ? res.data : [])).catch(() => setOrganizations([])); }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.put(`/network/individuals?id=${id}`, editData);
      setIndividual(data);
      setEditOpen(false);
    } catch (err: any) { alert(err?.response?.data?.error || "Failed to update"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this contact? This cannot be undone.`)) return;
    try {
      await api.delete(`/network/individuals?id=${id}`);
      router.push("/network/individuals");
    } catch (err: any) { alert(err?.response?.data?.error || "Delete failed"); }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!individual) return <div className="p-12 text-center text-text-secondary">Individual not found</div>;

  const fullName = `${individual.first_name || ""} ${individual.last_name || ""}`.trim() || "Unnamed";
  const orgs = individual.individual_organizations?.map((io: any) => io.organizations).filter(Boolean) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/network/individuals")} className="text-text-secondary transition-colors hover:text-text-accent">
          <ChevronLeft size={20} />
        </button>
        <PageHeader title={fullName} subtitle={individual.role || "Professional"} actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><PenLine size={14} /> Edit</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={14} /> Delete</Button>
          </div>
        } />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Contribution Catalog">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-elevated rounded-xl p-6 text-center">
                <Music size={24} className="mx-auto text-text-secondary mb-3 opacity-40" />
                <div className="text-2xl font-bold text-text-accent">0</div>
                <div className="text-xs text-text-secondary mt-1">Tracks</div>
              </div>
              <div className="bg-surface-elevated rounded-xl p-6 text-center">
                <Disc size={24} className="mx-auto text-text-secondary mb-3 opacity-40" />
                <div className="text-2xl font-bold text-text-accent">0</div>
                <div className="text-xs text-text-secondary mt-1">Releases</div>
              </div>
              <div className="bg-surface-elevated rounded-xl p-6 text-center">
                <Music size={24} className="mx-auto text-text-secondary mb-3 opacity-40" />
                <div className="text-2xl font-bold text-text-accent">0</div>
                <div className="text-xs text-text-secondary mt-1">Works</div>
              </div>
            </div>
          </Card>

          {orgs.length > 0 && (
            <Card title={`Organizations (${orgs.length})`}>
              <div className="space-y-2">
                {orgs.map((org: any) => (
                  <div key={org.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated hover:bg-surface cursor-pointer"
                    onClick={() => router.push(`/network/organizations/${org.id}`)}>
                    <div className="flex items-center gap-3">
                      <Building2 size={16} className="text-accent" />
                      <span className="text-sm font-medium">{org.name}</span>
                    </div>
                    <Badge variant="neutral" size="sm">{org.org_type || "Organization"}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 backdrop-blur-xl text-center">
            <div className="w-24 h-24 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <EntityArtwork entityType="individual" entityId={id} alt={fullName} placeholder="user" size={96} className="w-24 h-24 rounded-full" />
            </div>
            <h2 className="text-xl font-bold text-text-accent mb-1">{fullName}</h2>
            <div className="text-accent text-sm font-medium mb-3">{individual.role || "Contributor"}</div>
            <Badge variant="neutral" size="sm">#{individual.id}</Badge>
          </div>

          <Card title="Contact Details">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-text-secondary" />
                <span>{individual.email || "No email provided"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-text-secondary" />
                <span>{individual.phone || "No phone provided"}</span>
              </div>
            </div>
          </Card>

          <Card title="Quick Stats">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Relationship</span>
                <Badge variant={
                  individual.relationship_strength === "Core" ? "success" :
                  individual.relationship_strength === "Regular" ? "primary" : "neutral"
                } size="sm">{individual.relationship_strength || "Regular"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Organizations</span>
                <Badge variant="primary">{orgs.length}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <EntityForm title="Edit Individual" isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleUpdate} isSubmitting={submitting} error={undefined}>
        <div className="mb-6"><EntityProfileImageField entityType="individual" entityId={id} name={fullName} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">First Name</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={editData.first_name} onChange={(e) => setEditData({ ...editData, first_name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Last Name</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={editData.last_name} onChange={(e) => setEditData({ ...editData, last_name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Email</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Phone</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Role / Title</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Organization</label>
            <select className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" value={editData.organization_ids?.[0] || ""} onChange={(e) => setEditData({ ...editData, organization_ids: e.target.value ? [Number(e.target.value)] : [] })}>
              <option value="">No organization</option>
              {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Relationship Strength</label>
            <select className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={editData.relationship_strength} onChange={(e) => setEditData({ ...editData, relationship_strength: e.target.value })}>
              <option value="Core">Core</option>
              <option value="Regular">Regular</option>
              <option value="Ad-hoc">Ad-hoc</option>
            </select>
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
