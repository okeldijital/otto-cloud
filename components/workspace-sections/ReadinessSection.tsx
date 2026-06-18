"use client";

import Card from "@/components/ui/Card";
import { type SectionProps } from "@/lib/workspace-engine";

export default function ReadinessSection({ workspace }: SectionProps) {
  const score = workspace.readiness_scores?.[0];
  if (!score) {
    return (
      <Card title="Readiness Check">
        <p className="text-text-secondary text-sm py-8 text-center">No readiness data yet</p>
      </Card>
    );
  }

  const categories = [
    { label: "Metadata", key: "metadata_score", weight: 20 },
    { label: "Artwork", key: "artwork_score", weight: 15 },
    { label: "Marketing", key: "marketing_score", weight: 20 },
    { label: "Distribution", key: "distribution_score", weight: 20 },
    { label: "Approvals", key: "approvals_score", weight: 15 },
    { label: "Videos", key: "videos_score", weight: 10 },
  ] as const;

  return (
    <Card title="Readiness Check">
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={score.overall_score >= 80 ? "#10b981" : score.overall_score >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth="3" strokeDasharray={`${score.overall_score} ${100 - score.overall_score}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold text-white">{score.overall_score}%</span>
            <span className="text-[10px] text-text-secondary">Overall</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {categories.map((cat) => {
            const val = (score as any)[cat.key] ?? 0;
            return (
              <div key={cat.key} className="flex items-center gap-2">
                <span className="text-xs text-text-secondary w-20">{cat.label}</span>
                <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: val >= 80 ? "#10b981" : val >= 50 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <span className="text-[10px] font-bold w-8 text-right" style={{ color: val >= 80 ? "#10b981" : val >= 50 ? "#f59e0b" : "#ef4444" }}>{val}%</span>
              </div>
            );
          })}
        </div>
      </div>
      {score.last_calculated && (
        <p className="text-[10px] text-text-secondary text-right">Last updated: {new Date(score.last_calculated).toLocaleString()}</p>
      )}
    </Card>
  );
}
