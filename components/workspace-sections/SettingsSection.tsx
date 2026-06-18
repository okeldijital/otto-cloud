"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

export default function SettingsSection({ workspace, workspaceId, onRefresh }: SectionProps) {
  const [name, setName] = useState(workspace.name || "");
  const [description, setDescription] = useState(workspace.description || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/workspace?id=${workspaceId}`, { name, description });
      onRefresh();
    } catch { /* */ } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Card title="General">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Name</label>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Description</label>
            <textarea className="input w-full min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button variant="primary" onClick={save} loading={saving}><Save size={14} /> Save</Button>
        </div>
      </Card>

      <Card title="Workspace Info">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-text-secondary">Created</span><p className="text-white">{workspace.created_at ? new Date(workspace.created_at).toLocaleDateString() : "—"}</p></div>
          <div><span className="text-text-secondary">Status</span><p className="text-white">{workspace.status}</p></div>
          <div><span className="text-text-secondary">Template</span><p className="text-white">{workspace.template?.name || "—"}</p></div>
          <div><span className="text-text-secondary">Type</span><p className="text-white">{workspace.template?.slug || "—"}</p></div>
        </div>
      </Card>
    </div>
  );
}
