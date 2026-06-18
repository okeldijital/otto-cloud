"use client";

import { useState, useEffect } from "react";
import { Plus, Video } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

const STATUSES = ["planning", "pre-production", "production", "post-production", "review", "completed"];
const VIDEO_TYPES = ["Official Video", "Visualizer", "Lyric Video", "Trailer", "Behind The Scenes", "Interview", "TikTok Clips", "YouTube Shorts", "Promo Clips"];

export default function VideosSection({ workspace, workspaceId, onRefresh }: SectionProps) {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", video_type: "Official Video", due_date: "" });

  useEffect(() => { setItems(workspace.videos || []); }, [workspace.videos]);

  const createItem = async () => {
    if (!form.title) return;
    try {
      await api.post("/workspace/videos", { ...form, workspace_id: workspaceId });
      setForm({ title: "", video_type: "Official Video", due_date: "" }); setShowForm(false); onRefresh();
    } catch { /* */ }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.put(`/workspace/videos?id=${id}`, { status }); onRefresh(); } catch { /* */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Videos ({items.length})</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Add Video</Button>
      </div>
      {showForm && (
        <Card>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]"><label className="text-[10px] text-text-secondary font-bold">Title</label><input className="input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Type</label><select className="input" value={form.video_type} onChange={(e) => setForm({ ...form, video_type: e.target.value })}>{VIDEO_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="text-[10px] text-text-secondary font-bold">Due</label><input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <Button variant="primary" size="sm" onClick={createItem}>Create</Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.length === 0 ? <Card className="md:col-span-2"><p className="text-text-secondary text-sm py-8 text-center">No videos planned.</p></Card>
        : items.map((v: any) => (
          <div key={v.id} className="bg-premium-glass border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="primary">{v.video_type}</Badge>
              <select className="text-xs rounded-lg px-2 py-1 bg-white/10 border border-white/10 text-white" value={v.status} onChange={(e) => updateStatus(v.id, e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("-", " ")}</option>)}
              </select>
            </div>
            <h4 className="text-sm font-bold text-white mb-2">{v.title}</h4>
            {v.due_date && <p className="text-[10px] text-text-secondary">Due: {new Date(v.due_date).toLocaleDateString()}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
