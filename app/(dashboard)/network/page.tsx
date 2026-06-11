"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, UserCircle, Building2, Globe, ArrowRight, Share2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

export default function NetworkPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/network/health").then((r) => setHealth(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sections = [
    { icon: Users, label: "All Contacts", path: "/network/contacts", color: "text-emerald-400", count: health ? health.total_individuals + health.total_organizations + health.total_platforms : "—" },
    { icon: UserCircle, label: "Individuals", path: "/network/individuals", color: "text-purple-400", count: health?.total_individuals ?? "—" },
    { icon: Building2, label: "Organizations", path: "/network/organizations", color: "text-amber-400", count: health?.total_organizations ?? "—" },
    { icon: Globe, label: "Platforms", path: "/network/platforms", color: "text-blue-400", count: health?.total_platforms ?? "—" },
    { icon: Share2, label: "Relationships", path: "/network/relationships", color: "text-pink-400", count: health?.total_relationships ?? "—" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Network" subtitle="Manage your professional network" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {sections.map(({ icon: Icon, label, path, color, count }) => (
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
            <p className="text-3xl font-extrabold text-white mt-2">{count}</p>
          </Link>
        ))}
      </div>

      {health && (
        <Card title="Network Health">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-white">{health.active_relationships}</div>
              <div className="text-xs text-text-secondary mt-1">Active Relationships</div>
            </div>
            <div className="text-center p-4 bg-warn/10 rounded-xl">
              <div className="text-2xl font-bold text-warning">{health.missing_contracts}</div>
              <div className="text-xs text-text-secondary mt-1">Missing Contracts</div>
            </div>
            <div className="text-center p-4 bg-danger/10 rounded-xl">
              <div className="text-2xl font-bold text-danger">{health.expired_agreements}</div>
              <div className="text-xs text-text-secondary mt-1">Expired Agreements</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
