"use client";

import { Clock, CheckCircle, Calendar as CalIcon } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { type SectionProps } from "@/lib/workspace-engine";

export default function CalendarSection({ workspace }: SectionProps) {
  const release = workspace.release;
  const milestones = workspace.milestones || [];

  const events = [
    ...(release?.release_date
      ? [{ id: "release", name: "Release Day", date: new Date(release.release_date), type: "release" as const }]
      : []),
    ...milestones
      .filter((m: any) => m.due_date)
      .map((m: any) => ({ id: m.id, name: m.name, date: new Date(m.due_date), type: "milestone" as const, status: m.status })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const now = new Date();

  return (
    <Card title="Calendar">
      {events.length === 0 ? (
        <p className="text-text-secondary text-sm py-8 text-center">No upcoming dates</p>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-white/5" />
          <div className="space-y-6">
            {events.map((ev) => {
              const isPast = ev.date < now;
              const isRelease = ev.type === "release";
              return (
                <div key={ev.id} className="relative pl-14">
                  <div className={`absolute left-3 w-4 h-4 rounded-full border-2 ${
                    isRelease ? "border-accent bg-accent/20" :
                    ev.status === "completed" ? "border-green-500 bg-green-500/20" :
                    isPast ? "border-red-500 bg-red-500/20" :
                    "border-white/20 bg-white/5"
                  }`} />
                  <div className={`rounded-xl p-4 ${isRelease ? "bg-accent/10 border border-accent/20" : "bg-white/5"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isRelease ? <CalIcon size={16} className="text-accent" /> : ev.status === "completed" ? <CheckCircle size={16} className="text-green-400" /> : <Clock size={16} className="text-text-secondary" />}
                        <span className={`text-sm font-bold ${isRelease ? "text-accent" : "text-white"}`}>{ev.name}</span>
                      </div>
                      <Badge variant={isPast ? "danger" : isRelease ? "primary" : "secondary"}>{ev.date.toLocaleDateString()}</Badge>
                    </div>
                    {isPast && !isRelease && ev.status !== "completed" && (
                      <p className="text-[10px] text-red-400 mt-1">Overdue</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
