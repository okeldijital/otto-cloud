"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, XCircle, ArrowUpCircle, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

const STATUSES = ["not_started", "in_progress", "review", "approved", "blocked"];

function statusColor(s: string): string {
  const map: Record<string, string> = {
    not_started: "#6b7280", in_progress: "#3b82f6", review: "#f59e0b",
    approved: "#10b981", blocked: "#ef4444",
  };
  return map[s] || "#6b7280";
}

export default function DeliverablesSection({ workspace, workspaceId, onRefresh }: SectionProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", deliverable_type: "deliverable", priority: "medium", due_date: "" });

  useEffect(() => {
    api.get(`/workspace/deliverables?workspace_id=${workspaceId}`)
      .then(({ data }) => setItems(data))
      .catch(() => setItems(workspace.deliverables || []))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (workspace.deliverables) setItems(workspace.deliverables);
  }, [workspace.deliverables]);

  const createItem = async () => {
    if (!form.name) return;
    try {
      await api.post("/workspace/deliverables", { ...form, workspace_id: workspaceId });
      setForm({ name: "", deliverable_type: "deliverable", priority: "medium", due_date: "" });
      setShowForm(false);
      onRefresh();
    } catch { /* */ }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.put(`/workspace/deliverables?id=${id}`, { status }); onRefresh(); } catch { /* */ }
  };

  const deleteItem = async (id: number) => {
    try { await api.delete(`/workspace/deliverables?id=${id}`); onRefresh(); } catch { /* */ }
  };

  const displayItems = items.length > 0 ? items : (workspace.deliverables || []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Deliverables ({displayItems.length})</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Add</Button>
      </div>

      {showForm && (
        <Card>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]"><label className="text-[10px] text-text-secondary font-bold">Name</label><input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Type</label><select className="input" value={form.deliverable_type} onChange={(e) => setForm({ ...form, deliverable_type: e.target.value })}><option>deliverable</option><option>audio</option><option>image</option><option>video</option><option>document</option></select></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Priority</label><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>low</option><option>medium</option><option>high</option></select></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Due</label><input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <Button variant="primary" size="sm" onClick={createItem}>Create</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3">
        {displayItems.length === 0 ? (
          <Card><p className="text-text-secondary text-sm py-8 text-center">No deliverables yet. Add one or apply a playbook.</p></Card>
        ) : displayItems.map((item: any) => (
          <div key={item.id} className="bg-premium-glass border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: statusColor(item.status) + "20" }}>
                {item.status === "approved" ? <CheckCircle size={16} style={{ color: statusColor(item.status) }} /> :
                 item.status === "blocked" ? <XCircle size={16} style={{ color: statusColor(item.status) }} /> :
                 item.status === "in_progress" ? <ArrowUpCircle size={16} style={{ color: statusColor(item.status) }} /> :
                 <Clock size={16} style={{ color: statusColor(item.status) }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                  <span>{item.deliverable_type || "deliverable"}</span>
                  {item.due_date && <span>· Due {new Date(item.due_date).toLocaleDateString()}</span>}
                  {item.priority === "high" && <span className="text-red-400">· High</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select className="text-xs rounded-lg px-2 py-1 bg-white/10 border border-white/10 text-white" value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <button onClick={() => deleteItem(item.id)} className="text-text-secondary hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
