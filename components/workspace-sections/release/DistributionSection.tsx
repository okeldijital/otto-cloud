"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { type SectionProps } from "@/lib/workspace-engine";

const DSP_LIST = [
  { name: "Spotify", icon: "🎵", color: "#1DB954" },
  { name: "Apple Music", icon: "🍎", color: "#FA233B" },
  { name: "YouTube Music", icon: "▶️", color: "#FF0000" },
  { name: "Amazon Music", icon: "📦", color: "#FF9900" },
  { name: "Deezer", icon: "🎧", color: "#FEAA2D" },
  { name: "Boomplay", icon: "🌍", color: "#FF8C00" },
  { name: "Audiomack", icon: "🎤", color: "#FF6900" },
  { name: "Tidal", icon: "🌊", color: "#000000" },
];

const DSP_STATUSES = ["pending", "delivered", "rejected", "live"];

function statusColor(s: string): string {
  const map: Record<string, string> = { pending: "#6b7280", delivered: "#3b82f6", rejected: "#ef4444", live: "#10b981" };
  return map[s] || "#6b7280";
}

export default function DistributionSection({ workspace }: SectionProps) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const updateStatus = (dsp: string, status: string) => {
    setStatuses((prev) => ({ ...prev, [dsp]: status }));
  };

  return (
    <Card title="Distribution Status">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {DSP_LIST.map((dsp) => {
          const currentStatus = statuses[dsp.name] || "pending";
          return (
            <div key={dsp.name} className="bg-premium-glass border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{dsp.icon}</span>
                  <span className="text-sm font-bold text-white">{dsp.name}</span>
                </div>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(currentStatus) }} />
              </div>
              <select
                className="w-full text-xs rounded-lg px-2 py-1.5 bg-white/10 border border-white/10 text-white"
                value={currentStatus}
                onChange={(e) => updateStatus(dsp.name, e.target.value)}
              >
                {DSP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-text-secondary mt-4 text-center">Status changes are local only — distribution API integration coming soon</p>
    </Card>
  );
}
