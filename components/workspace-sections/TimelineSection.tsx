"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

const ICONS: Record<string, string> = {
  milestone: "bg-blue-500/20 text-blue-400", deliverable: "bg-purple-500/20 text-purple-400",
  approval: "bg-green-500/20 text-green-400", publication: "bg-orange-500/20 text-orange-400",
  video: "bg-red-500/20 text-red-400", note: "bg-white/10 text-text-secondary",
};

export default function TimelineSection({ workspace, workspaceId }: SectionProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ summary: "", event_type: "note" });

  useEffect(() => { setEvents(workspace.timeline_events || []); }, [workspace.timeline_events]);

  const addEvent = async () => {
    if (!form.summary) return;
    try {
      await api.post("/workspace/timeline", { ...form, workspace_id: workspaceId });
      setForm({ summary: "", event_type: "note" }); setShowForm(false);
    } catch { /* */ }
  };

  const deleteEvent = async (id: number) => {
    try { await api.delete(`/workspace/timeline?id=${id}`); } catch { /* */ }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Timeline</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Add Event</Button>
      </div>
      {showForm && (
        <div className="flex gap-3 mb-4">
          <input className="input flex-1" placeholder="Event summary..." value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <select className="input" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
            <option value="note">Note</option><option value="milestone">Milestone</option>
            <option value="deliverable">Deliverable</option><option value="approval">Approval</option>
            <option value="publication">Publication</option><option value="video">Video</option>
          </select>
          <Button variant="primary" size="sm" onClick={addEvent}>Add</Button>
        </div>
      )}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />
        <div className="space-y-4">
          {events.length === 0 ? <p className="text-text-secondary text-sm py-8 text-center pl-10">No timeline events</p>
          : events.map((ev: any) => (
            <div key={ev.id} className="relative pl-10">
              <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white/10 ${ICONS[ev.event_type] || "bg-white/10"}`} style={{ top: "4px" }} />
              <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-all">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-white">{ev.summary}</p>
                  <button onClick={() => deleteEvent(ev.id)} className="text-text-secondary hover:text-red-400 transition-colors shrink-0 ml-2"><Trash2 size={12} /></button>
                </div>
                <p className="text-[10px] text-text-secondary mt-1">{ev.created_at ? new Date(ev.created_at).toLocaleString() : ""}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
