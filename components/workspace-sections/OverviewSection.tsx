"use client";

import { useRouter } from "next/navigation";
import {
  Upload, Plus, User, Bot, CheckCircle, FileText, Clock,
  AlertCircle, LayoutDashboard,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { type SectionProps } from "@/lib/workspace-engine";

function statusColor(status: string): string {
  const map: Record<string, string> = {
    not_started: "#6b7280", in_progress: "#3b82f6", review: "#f59e0b",
    approved: "#10b981", blocked: "#ef4444", completed: "#10b981",
    pending: "#6b7280", planning: "#6b7280", "pre-production": "#f59e0b",
    production: "#3b82f6", marketing: "#f97316", distribution: "#f59e0b",
    "launch-ready": "#10b981", released: "#84cc16",
  };
  return map[status] || "#6b7280";
}

function QuickAction({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold text-text-secondary hover:text-white border border-white/5 hover:border-accent/30" style={color ? { borderColor: color } : undefined}>
      {icon} {label}
    </button>
  );
}

export default function OverviewSection({ workspace, workspaceId, onRefresh, onNavigate }: SectionProps) {
  const router = useRouter();
  const readiness = workspace.readiness_scores?.[0];
  const members = workspace.members || [];
  const deliverables = workspace.deliverables || [];
  const milestones = workspace.milestones || [];
  const timelineEvents = workspace.timeline_events || [];
  const release = workspace.release;

  const stats = [
    { label: "Status", value: workspace.status, color: statusColor(workspace.status) },
    { label: "Members", value: members.length },
    { label: "Outstanding Tasks", value: deliverables.filter((d: any) => d.status !== "approved" && d.status !== "completed").length },
    { label: "Blocked Items", value: deliverables.filter((d: any) => d.status === "blocked").length },
    { label: "Upcoming Deadlines", value: milestones.filter((m: any) => m.status !== "completed" && m.due_date).length },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-premium-glass border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1">{s.label}</p>
              <p className="text-xl font-bold text-white" style={s.color ? { color: s.color } : undefined}>{s.value}</p>
            </div>
          ))}
        </div>

        {readiness && (
          <Card title="Readiness Score">
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={readiness.overall_score >= 80 ? "#10b981" : readiness.overall_score >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth="3" strokeDasharray={`${readiness.overall_score} ${100 - readiness.overall_score}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{readiness.overall_score}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[
                  { label: "Metadata", score: readiness.metadata_score, weight: 20 },
                  { label: "Artwork", score: readiness.artwork_score, weight: 15 },
                  { label: "Marketing", score: readiness.marketing_score, weight: 20 },
                  { label: "Distribution", score: readiness.distribution_score, weight: 20 },
                  { label: "Approvals", score: readiness.approvals_score, weight: 15 },
                  { label: "Videos", score: readiness.videos_score, weight: 10 },
                ].map((cat) => (
                  <div key={cat.label} className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-20">{cat.label}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${cat.score}%`, backgroundColor: cat.score >= 80 ? "#10b981" : cat.score >= 50 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right">{cat.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card title="Upcoming Deadlines">
          {milestones.filter((m: any) => m.status !== "completed" && m.due_date).length === 0 ? (
            <p className="text-text-secondary text-sm py-4 text-center">No upcoming deadlines</p>
          ) : (
            <div className="space-y-2">
              {milestones.filter((m: any) => m.status !== "completed" && m.due_date).slice(0, 5).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-text-secondary" />
                    <span className="text-sm text-white">{m.name}</span>
                  </div>
                  <span className="text-xs text-text-secondary">{m.due_date ? new Date(m.due_date).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Activity">
          {timelineEvents.slice(0, 10).map((event: any) => (
            <div key={event.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: statusColor(event.event_type) }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{event.summary}</p>
                <p className="text-[10px] text-text-secondary">{event.created_at ? new Date(event.created_at).toLocaleString() : ""}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Quick Actions">
          <div className="flex flex-wrap gap-2">
            <QuickAction icon={<Upload size={14} />} label="Upload Asset" onClick={() => onNavigate("files")} />
            <QuickAction icon={<Plus size={14} />} label="Add Task" onClick={() => onNavigate("deliverables")} />
            <QuickAction icon={<User size={14} />} label="Invite Member" onClick={() => onNavigate("settings")} />
            <QuickAction icon={<Bot size={14} />} label="Ask AI" onClick={() => onNavigate("ai")} />
            <QuickAction icon={<CheckCircle size={14} />} label="Approve" onClick={() => onNavigate("approvals")} />
            <QuickAction icon={<FileText size={14} />} label="Report" onClick={() => onNavigate("reports")} />
          </div>
        </Card>

        <Card title="Team Members">
          {members.length === 0 ? (
            <p className="text-text-secondary text-sm py-4 text-center">No members</p>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                    {m.user?.name?.[0] || m.name?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{m.user?.name || m.name || "Unknown"}</p>
                    <Badge variant="primary">{m.role}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {release && (
          <Card title="Release Info">
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Artist</span><span>{release.artist_id || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Type</span><Badge variant="primary">{release.release_type || "—"}</Badge></div>
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Date</span><span>{release.release_date ? new Date(release.release_date).toLocaleDateString() : "TBA"}</span></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
