"use client";

import Link from "next/link";
import { ShieldCheck, FolderOpen, Calendar, ListTodo, StickyNote, BarChart3, ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

const sections = [
  { icon: ShieldCheck, label: "Status Quo", path: "/office/status-quo", color: "text-blue-400" },
  { icon: FolderOpen, label: "Documents", path: "/office/documents", color: "text-emerald-400" },
  { icon: Calendar, label: "Events", path: "/office/events", color: "text-purple-400" },
  { icon: ListTodo, label: "Tasks", path: "/office/tasks", color: "text-amber-400" },
  { icon: StickyNote, label: "Notes", path: "/office/notes", color: "text-rose-400" },
  { icon: BarChart3, label: "Reports", path: "/office/reports", color: "text-cyan-400" },
];

export default function OfficePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Office" subtitle="Administrative tools and documentation" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ icon: Icon, label, path, color }) => (
          <Link key={path} href={path}
            className="group bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:border-white/20 transition-all hover:shadow-glow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 bg-white/5 rounded-xl ${color}`}>
                <Icon size={24} />
              </div>
              <ArrowRight size={18} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-accent transition-colors">{label}</h3>
            <p className="text-sm text-text-secondary mt-1">View and manage</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
