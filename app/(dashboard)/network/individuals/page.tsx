"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Plus, Search, Mail, Star } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const STRENGTH_VARIANTS: Record<string, string> = {
  Core: "success",
  Regular: "primary",
  "Ad-hoc": "neutral",
};

export default function IndividualsPage() {
  const router = useRouter();
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newInd, setNewInd] = useState({ first_name: "", last_name: "", email: "", role: "", relationship_strength: "Regular" });

  const fetchIndividuals = async () => {
    try {
      setLoading(true);
      const res = await api.get("/network/individuals");
      setIndividuals(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchIndividuals(); }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return individuals.filter((ind) =>
      `${ind.first_name} ${ind.last_name}`.toLowerCase().includes(q) ||
      (ind.email || "").toLowerCase().includes(q)
    );
  }, [individuals, searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/network/individuals", newInd);
      setShowAddModal(false);
      setNewInd({ first_name: "", last_name: "", email: "", role: "", relationship_strength: "Regular" });
      fetchIndividuals();
    } catch (err: any) { alert(err?.response?.data?.error || "Failed to create"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (ind: any) => {
    if (!window.confirm(`Delete ${ind.first_name} ${ind.last_name}?`)) return;
    try {
      await api.delete(`/network/individuals?id=${ind.id}`);
      fetchIndividuals();
    } catch (err: any) { alert("Failed to delete"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Individuals"
        subtitle="Human collaborators and role-first identities."
        actions={
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input className="input pl-9" placeholder="Search individuals..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="orange" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus size={14} /> Add Individual
            </Button>
          </div>
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            {individuals.length === 0 ? "No individuals yet. Add your first contact." : "No individuals match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold"></th>
                  <th className="p-4 font-bold">Name</th>
                  <th className="p-4 font-bold">Role</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold">Organization</th>
                  <th className="p-4 font-bold">Relationship</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ind) => {
                  const orgName = ind.individual_organizations?.[0]?.organizations?.name;
                  return (
                    <tr key={ind.id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => router.push(`/network/individuals/${ind.id}`)}>
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                          {ind.image_url ? <img src={ind.image_url} alt="" className="w-full h-full object-cover" /> : <UserCircle size={24} className="text-text-secondary" />}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-white">{ind.first_name} {ind.last_name}</td>
                      <td className="p-4 text-sm text-text-secondary">{ind.role || "Professional"}</td>
                      <td className="p-4 text-sm text-text-secondary">
                        {ind.email ? <span className="flex items-center gap-1"><Mail size={14} />{ind.email}</span> : "—"}
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{orgName || "—"}</td>
                      <td className="p-4">
                        <Badge variant={STRENGTH_VARIANTS[ind.relationship_strength] || "neutral"} size="sm">
                          {ind.relationship_strength === "Core" && <Star size={10} className="mr-1" />}
                          {ind.relationship_strength || "Regular"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(ind); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EntityForm title="New Individual" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary font-bold">First Name</label>
              <input className="input w-full" value={newInd.first_name} onChange={(e) => setNewInd({ ...newInd, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold">Last Name</label>
              <input className="input w-full" value={newInd.last_name} onChange={(e) => setNewInd({ ...newInd, last_name: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Email</label>
            <input className="input w-full" type="email" value={newInd.email} onChange={(e) => setNewInd({ ...newInd, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Role / Title</label>
            <input className="input w-full" value={newInd.role} onChange={(e) => setNewInd({ ...newInd, role: e.target.value })} placeholder="e.g. Mixing Engineer" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Relationship Strength</label>
            <select className="input w-full" value={newInd.relationship_strength} onChange={(e) => setNewInd({ ...newInd, relationship_strength: e.target.value })}>
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
