"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

const STATUSES = ["pending", "approved", "rejected", "changes_requested"];

function statusColor(s: string): string {
  const map: Record<string, string> = { pending: "#6b7280", approved: "#10b981", rejected: "#ef4444", changes_requested: "#f59e0b" };
  return map[s] || "#6b7280";
}

export default function ApprovalsSection({ workspace, workspaceId, onRefresh }: SectionProps) {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", item_type: "general" });

  useEffect(() => { setItems(workspace.approvals || []); }, [workspace.approvals]);

  const createItem = async () => {
    if (!form.name) return;
    try {
      await api.post("/workspace/approvals", { ...form, workspace_id: workspaceId });
      setForm({ name: "", item_type: "general" }); setShowForm(false); onRefresh();
    } catch { /* */ }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.put(`/workspace/approvals?id=${id}`, { status }); onRefresh(); } catch { /* */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Approvals ({items.length})</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Request</Button>
      </div>

      {showForm && (
        <Card>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]"><label className="text-[10px] text-text-secondary font-bold">Item</label><input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Type</label><select className="input" value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}><option>general</option><option>audio</option><option>image</option><option>video</option><option>document</option><option>metadata</option></select></div>
            <Button variant="primary" size="sm" onClick={createItem}>Create</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {items.length === 0 ? <Card><p className="text-text-secondary text-sm py-8 text-center">No approvals requested.</p></Card>
        : items.map((item: any) => (
          <div key={item.id} className="bg-premium-glass border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: statusColor(item.status) + "20" }}>
                {item.status === "approved" ? <CheckCircle size={16} style={{ color: "#10b981" }} /> :
                 item.status === "rejected" ? <XCircle size={16} style={{ color: "#ef4444" }} /> :
                 <Clock size={16} style={{ color: statusColor(item.status) }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <Badge variant="primary">{item.item_type || "general"}</Badge>
              </div>
            </div>
            <select className="text-xs rounded-lg px-2 py-1 bg-white/10 border border-white/10 text-white" value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
