"use client";

import Link from "next/link";
import { FileText, ShieldCheck, BarChart3, Inbox, ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

const sections = [
  { icon: FileText, label: "Contracts", path: "/admin-of-works/contracts", color: "text-blue-400" },
  { icon: Inbox, label: "Bulk Processing", path: "/contracts/bulk", color: "text-emerald-400" },
  { icon: ShieldCheck, label: "Works Administration", path: "/admin-of-works/works", color: "text-purple-400" },
  { icon: BarChart3, label: "Status Quo", path: "/admin-of-works/status-quo", color: "text-amber-400" },
];

export default function AdminOfWorksPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Administration of Works" subtitle="Contract and works management" />

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
