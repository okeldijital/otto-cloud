"use client";

import { useState, useEffect } from "react";
import { Music, Users, FileText, DollarSign, TrendingUp, Calendar } from "lucide-react";
import api from "@/lib/api";

function StatsCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend?: number }) {
  return (
    <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend !== undefined && (
            <p className={`text-xs mt-1 ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
            </p>
          )}
        </div>
        <div className="p-3 bg-white/5 rounded-xl text-accent">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl h-64 flex items-center justify-center">
      <p className="text-text-secondary text-sm">Loading chart data...</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get("/artists?limit=1").then(r => r.data),
      api.get("/releases?limit=1").then(r => r.data),
      api.get("/contracts?limit=1").then(r => r.data),
    ]).then(([artists, releases, contracts]) => {
      setStats({
        artists: Array.isArray(artists) ? artists.length : artists?.total || 0,
        releases: Array.isArray(releases) ? releases.length : releases?.total || 0,
        contracts: Array.isArray(contracts) ? contracts.length : contracts?.total || 0,
      });
    }).catch(() => null);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Welcome to OTTO Cloud</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Artists"
          value={stats ? String(stats.artists) : "—"}
          icon={<Users size={24} />}
        />
        <StatsCard
          title="Releases"
          value={stats ? String(stats.releases) : "—"}
          icon={<Music size={24} />}
        />
        <StatsCard
          title="Contracts"
          value={stats ? String(stats.contracts) : "—"}
          icon={<FileText size={24} />}
        />
        <StatsCard
          title="Revenue"
          value="—"
          icon={<DollarSign size={24} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
