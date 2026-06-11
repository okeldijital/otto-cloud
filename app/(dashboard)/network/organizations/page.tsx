"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const ORG_TYPES = ["Distributor", "Publisher", "Label", "PRO", "Legal", "Studio", "Accounting", "Other"];

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", org_type: "Distributor", website: "", address: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/network/organizations");
      setOrgs(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const filteredOrgs = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return orgs.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      (o.org_type || "").toLowerCase().includes(q)
    );
  }, [orgs, searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/network/organizations", newOrg);
      setShowAddModal(false);
      setNewOrg({ name: "", org_type: "Distributor", website: "", address: "" });
      fetchOrgs();
    } catch (err: any) { alert(err?.response?.data?.error || "Failed to create"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (org: any) => {
    if (!window.confirm(`Delete "${org.name}"?`)) return;
    try {
      await api.delete(`/network/organizations?id=${org.id}`);
      fetchOrgs();
    } catch (err: any) { alert("Failed to delete"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="External entities with legal or operational relevance."
        actions={
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input className="input pl-9" placeholder="Search organizations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="orange" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus size={14} /> Add Organization
            </Button>
          </div>
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading...</div>
        ) : filteredOrgs.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            {orgs.length === 0 ? "No organizations yet. Add your first one." : "No organizations match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">Name</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Website</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => router.push(`/network/organizations/${org.id}`)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg text-amber-400"><Building2 size={18} /></div>
                        <div>
                          <div className="font-medium text-white">{org.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold uppercase text-text-secondary bg-white/5 px-2 py-1 rounded">{org.org_type || "Other"}</span>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{org.website ? org.website.replace(/^https?:\/\//, "") : "—"}</td>
                    <td className="p-4">
                      <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(org); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EntityForm title="New Organization" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Organization Name</label>
            <input className="input w-full" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} required placeholder="e.g. Universal Music Group" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Type</label>
            <select className="input w-full" value={newOrg.org_type} onChange={(e) => setNewOrg({ ...newOrg, org_type: e.target.value })}>
              {ORG_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Website</label>
            <input className="input w-full" value={newOrg.website} onChange={(e) => setNewOrg({ ...newOrg, website: e.target.value })} placeholder="https://example.com" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Address</label>
            <textarea className="input w-full" rows={2} value={newOrg.address} onChange={(e) => setNewOrg({ ...newOrg, address: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
