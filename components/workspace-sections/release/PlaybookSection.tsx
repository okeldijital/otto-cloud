"use client";

import { useState, useEffect } from "react";
import { BookOpen, Loader } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

interface Playbook {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  release_type: string | null;
  icon: string | null;
  color: string | null;
  playbook_tasks: any[];
  playbook_milestones: any[];
  playbook_deliverables: any[];
  playbook_approvals: any[];
}

export default function PlaybookSection({ workspaceId, onRefresh }: SectionProps) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<number | null>(null);

  useEffect(() => {
    api.get("/release-workspace/playbook")
      .then(({ data }) => setPlaybooks(data))
      .catch(() => setPlaybooks([]))
      .finally(() => setLoading(false));
  }, []);

  const applyPlaybook = async (playbookId: number) => {
    setApplying(playbookId);
    try {
      await api.post("/release-workspace/playbook", { _apply: true, workspace_id: workspaceId, playbook_id: playbookId });
      onRefresh();
    } catch { /* */ } finally { setApplying(null); }
  };

  if (loading) {
    return <Card><div className="py-8 text-center"><Loader size={24} className="animate-spin mx-auto text-text-secondary" /></div></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Playbook Templates ({playbooks.length})</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playbooks.length === 0 ? (
          <Card className="md:col-span-3"><p className="text-text-secondary text-sm py-8 text-center">No playbook templates available</p></Card>
        ) : playbooks.map((pb) => (
          <div key={pb.id} className="bg-premium-glass border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: (pb.color || "#6366f1") + "20", color: pb.color || "#6366f1" }}>
                {pb.icon || <BookOpen size={20} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{pb.name}</h4>
                {pb.release_type && <Badge variant="primary">{pb.release_type}</Badge>}
              </div>
            </div>
            {pb.description && <p className="text-xs text-text-secondary mb-3 line-clamp-2">{pb.description}</p>}
            <div className="flex gap-3 mb-4 text-[10px] text-text-secondary">
              <span>{pb.playbook_tasks?.length || 0} tasks</span>
              <span>{pb.playbook_milestones?.length || 0} milestones</span>
              <span>{pb.playbook_deliverables?.length || 0} deliverables</span>
            </div>
            <Button variant="primary" size="sm" onClick={() => applyPlaybook(pb.id)} loading={applying === pb.id} disabled={applying !== null}>
              Apply Playbook
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
