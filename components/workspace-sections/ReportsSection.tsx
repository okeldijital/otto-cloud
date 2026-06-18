"use client";

import Card from "@/components/ui/Card";
import { calculateReadiness, calculateWorkspaceHealth } from "@/lib/workspace-engine";
import { type SectionProps } from "@/lib/workspace-engine";

export default function ReportsSection({ workspace }: SectionProps) {
  const input = {
    deliverables: workspace.deliverables || [],
    approvals: workspace.approvals || [],
    publications: workspace.publications || [],
    videos: workspace.videos || [],
    milestones: workspace.milestones || [],
  };

  const readiness = calculateReadiness(input);
  const health = calculateWorkspaceHealth(input);
  const overallScore = readiness.overallScore;
  const healthScore = health.score;

  const overdueMilestones = (workspace.milestones || []).filter((m: any) => {
    if (m.status === "completed") return false;
    return m.due_date && new Date(m.due_date) < new Date();
  });

  const blockedCount = (workspace.deliverables || []).filter((d: any) => d.status === "blocked").length;

  return (
    <div className="space-y-6">
      <Card title="Workspace Health">
        <div className="flex items-center gap-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${
            healthScore >= 80 ? "bg-green-500/20 text-green-400" : healthScore >= 50 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
          }`}>
            {healthScore}%
          </div>
          <div className="flex-1 space-y-1">
            {health.items.map((item) => (
              <div key={item.entityId} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.severity === "high" ? "bg-red-400" : "bg-yellow-400"}`} />
                <span className="text-text-secondary">{item.label}</span>
              </div>
            ))}
            {health.items.length === 0 && <p className="text-xs text-text-secondary">No issues found</p>}
          </div>
        </div>
      </Card>

      <Card title="Readiness Breakdown">
        <div className="space-y-2">
          {readiness.categories.map((cat) => (
            <div key={cat.key} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-24">{cat.label}</span>
              <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${cat.score}%`, backgroundColor: cat.score >= 80 ? "#10b981" : cat.score >= 50 ? "#f59e0b" : "#ef4444" }} />
              </div>
              <span className="text-[10px] font-bold w-8 text-right">{cat.score}%</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <span className="text-2xl font-bold text-white">{overallScore}%</span>
          <span className="text-xs text-text-secondary ml-2">Overall Readiness</span>
        </div>
      </Card>

      <Card title="Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{(workspace.deliverables || []).length}</p>
            <p className="text-[10px] text-text-secondary">Total Tasks</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{(workspace.deliverables || []).filter((d: any) => d.status === "approved" || d.status === "completed").length}</p>
            <p className="text-[10px] text-text-secondary">Completed</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{blockedCount}</p>
            <p className="text-[10px] text-text-secondary">Blocked</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{overdueMilestones.length}</p>
            <p className="text-[10px] text-text-secondary">Overdue</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
