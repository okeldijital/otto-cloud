"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, CheckCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

const STATUSES = ["not_started", "in_progress", "completed", "missed"];

export default function MilestonesSection({ workspace, workspaceId, onRefresh }: SectionProps) {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", due_date: "" });

  useEffect(() => { setItems(workspace.milestones || []); }, [workspace.milestones]);

  const createItem = async () => {
    if (!form.name) return;
    try {
      await api.post("/workspace/milestones", { ...form, workspace_id: workspaceId });
      setForm({ name: "", due_date: "" }); setShowForm(false); onRefresh();
    } catch { /* */ }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.put(`/workspace/milestones?id=${id}`, { status }); onRefresh(); } catch { /* */ }
  };

  const deleteItem = async (id: number) => {
    try { await api.delete(`/workspace/milestones?id=${id}`); onRefresh(); } catch { /* */ }
  };

  const sorted = [...(items.length > 0 ? items : workspace.milestones || [])].sort((a, b) => {
    if (!a.due_date) return 1; if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Milestones ({sorted.length})</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Add</Button>
      </div>
      {showForm && (
        <Card>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]"><label className="text-[10px] text-text-secondary font-bold">Name</label><input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Due</label><input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <Button variant="primary" size="sm" onClick={createItem}>Create</Button>
          </div>
        </Card>
      )}
      <div className="space-y-2">
        {sorted.length === 0 ? <Card><p className="text-text-secondary text-sm py-8 text-center">No milestones</p></Card>
        : sorted.map((m: any) => {
          const overdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== "completed" && m.status !== "missed";
          return (
            <div key={m.id} className="bg-premium-glass border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.status === "completed" ? "bg-green-500/20" : overdue ? "bg-red-500/20" : "bg-white/10"}`}>
                  {m.status === "completed" ? <CheckCircle size={16} className="text-green-400" /> : <Clock size={16} className={overdue ? "text-red-400" : "text-text-secondary"} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  <p className={`text-[10px] ${overdue ? "text-red-400" : "text-text-secondary"}`}>
                    {m.due_date ? `${overdue ? "Overdue: " : "Due: "}${new Date(m.due_date).toLocaleDateString()}` : "No due date"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-xs rounded-lg px-2 py-1 bg-white/10 border border-white/10 text-white" value={m.status} onChange={(e) => updateStatus(m.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
                <button onClick={() => deleteItem(m.id)} className="text-text-secondary hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
