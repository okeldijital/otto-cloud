"use client";

import { useState, useEffect } from "react";
import { Plus, Megaphone } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

const PHASES = ["Pre-Release", "Launch Week", "Post-Release", "Sustained"];
const STATUSES = ["planning", "active", "completed", "cancelled"];

export default function MarketingSection({ workspace, workspaceId, onRefresh }: SectionProps) {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phase: "Pre-Release", description: "" });

  useEffect(() => { setItems(workspace.marketing_phases || []); }, [workspace.marketing_phases]);

  const createItem = async () => {
    if (!form.name) return;
    try {
      await api.post("/workspace/marketing", { ...form, workspace_id: workspaceId });
      setForm({ name: "", phase: "Pre-Release", description: "" }); setShowForm(false); onRefresh();
    } catch { /* */ }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.put(`/workspace/marketing?id=${id}`, { status }); onRefresh(); } catch { /* */ }
  };

  const byPhase = PHASES.map((p) => ({ phase: p, items: items.filter((i) => i.phase === p) }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Marketing ({items.length})</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Add Phase</Button>
      </div>
      {showForm && (
        <Card>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]"><label className="text-[10px] text-text-secondary font-bold">Name</label><input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Phase</label><select className="input" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>{PHASES.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="flex-1 min-w-[200px]"><label className="text-[10px] text-text-secondary font-bold">Description</label><input className="input w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button variant="primary" size="sm" onClick={createItem}>Create</Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {byPhase.map(({ phase, items: pItems }) => (
          <Card key={phase} title={phase}>
            {pItems.length === 0 ? <p className="text-[10px] text-text-secondary py-2">No items</p>
            : pItems.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{item.name}</p>
                  {item.description && <p className="text-[10px] text-text-secondary truncate">{item.description}</p>}
                </div>
                <select className="text-xs rounded-lg px-2 py-1 bg-white/10 border border-white/10 text-white ml-2" value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
