"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "Threads", "X", "Website", "Newsletter", "Press Release", "WhatsApp Broadcast"];
const STATUSES = ["draft", "review", "approved", "scheduled", "published"];

export default function PublicationsSection({ workspace, workspaceId, onRefresh }: SectionProps) {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "Instagram", title: "", scheduled_at: "" });

  useEffect(() => { setItems(workspace.publications || []); }, [workspace.publications]);

  const createItem = async () => {
    try {
      await api.post("/workspace/publications", { ...form, workspace_id: workspaceId });
      setForm({ platform: "Instagram", title: "", scheduled_at: "" }); setShowForm(false); onRefresh();
    } catch { /* */ }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.put(`/workspace/publications?id=${id}`, { status }); onRefresh(); } catch { /* */ }
  };

  const byPlatform = PLATFORMS.map((p) => ({ platform: p, items: items.filter((i) => i.platform === p) }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Publications ({items.length})</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New</Button>
      </div>
      {showForm && (
        <Card>
          <div className="flex gap-3 items-end flex-wrap">
            <div><label className="text-[10px] text-text-secondary font-bold">Platform</label><select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="flex-1 min-w-[200px]"><label className="text-[10px] text-text-secondary font-bold">Title</label><input className="input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Schedule</label><input type="date" className="input" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
            <Button variant="primary" size="sm" onClick={createItem}>Create</Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {byPlatform.map(({ platform, items: pItems }) => (
          <Card key={platform} title={platform}>
            {pItems.length === 0 ? <p className="text-[10px] text-text-secondary py-2">No publications planned</p>
            : pItems.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.title || "Untitled"}</p>
                  {item.scheduled_at && <p className="text-[10px] text-text-secondary">{new Date(item.scheduled_at).toLocaleDateString()}</p>}
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
