"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layout, Filter, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import WorkspaceCard from "@/components/workspaces/WorkspaceCard";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Planning", value: "planning" },
  { label: "Released", value: "released" },
  { label: "Archived", value: "archived" },
];

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);

  const fetchWorkspaces = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await api.get(`/workspaces?${params.toString()}`);
      setWorkspaces(res.data?.items || []);
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/workspaces/templates");
      setTemplates(res.data || []);
    } catch {
      // Templates may not have a dedicated endpoint yet
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchTemplates();
  }, [statusFilter, searchQuery]);

  const [newWorkspace, setNewWorkspace] = useState<any>({
    name: "",
    description: "",
    template_id: "",
    status: "planning",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...newWorkspace };
      if (!payload.template_id) delete payload.template_id;
      else payload.template_id = parseInt(payload.template_id);
      const res = await api.post("/workspaces", payload);
      setShowCreateModal(false);
      setNewWorkspace({ name: "", description: "", template_id: "", status: "planning" });
      router.push(`/workspaces/${res.data.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        subtitle="Project hubs for your teams and releases"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            New Workspace
          </Button>
        }
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            className="input w-full pl-10"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-secondary" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === f.value
                  ? "bg-accent text-white"
                  : "bg-white/5 text-text-secondary hover:text-white hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-premium-glass border border-white/5 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-4" />
              <div className="h-3 bg-white/10 rounded w-1/2 mb-3" />
              <div className="h-3 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="bg-premium-glass border border-white/5 rounded-2xl py-16 text-center">
          <Layout size={48} className="mx-auto mb-4 text-text-secondary opacity-30" />
          <h3 className="text-lg font-semibold text-white mb-2">No workspaces yet</h3>
          <p className="text-text-secondary text-sm mb-6">Create your first workspace to start collaborating.</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Create Workspace
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} onClick={() => router.push(`/workspaces/${ws.id}`)} />
          ))}
        </div>
      )}

      <EntityForm title="New Workspace" isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="input w-full" value={newWorkspace.name} onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Description</label>
            <textarea className="input w-full" rows={3} value={newWorkspace.description} onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Template</label>
            <select className="input w-full" value={newWorkspace.template_id} onChange={(e) => setNewWorkspace({ ...newWorkspace, template_id: e.target.value })}>
              <option value="">Blank Workspace</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
