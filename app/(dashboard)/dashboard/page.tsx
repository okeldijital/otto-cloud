"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ArrowUpRight, Music, Users, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/lib/api";

function StatsCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
        </div>
        <div className="p-3 bg-surface-elevated rounded-lg text-accent border border-border">{icon}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [statusQuo, setStatusQuo] = useState({ total: 0, critical: 0, warning: 0, entities: 0 });
  const [statusQuoLoading, setStatusQuoLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get("/artists?limit=1"),
      api.get("/releases/list?limit=1"),
      api.get("/contracts?limit=1"),
      api.get("/tracks?limit=1"),
      api.get("/works?limit=1"),
      api.get("/office/status-quo"),
    ]).then((results) => {
      const valueAt = (index: number) => results[index]?.status === "fulfilled" ? results[index].value.data : null;
      const artists = valueAt(0);
      const releases = valueAt(1);
      const contracts = valueAt(2);
      const tracks = valueAt(3);
      const works = valueAt(4);
      const status = valueAt(5);

      if (status) {
        setStatusQuo({
          total: status?.summary?.total ?? 0,
          critical: status?.summary?.critical ?? 0,
          warning: status?.summary?.warning ?? 0,
          entities: status?.summary?.entities ?? 0,
        });
      }
      setStatusQuoLoading(false);

      setStats({
        artists: Array.isArray(artists) ? artists.length : artists?.total || 0,
        releases: Array.isArray(releases) ? releases.length : releases?.total || 0,
        contracts: Array.isArray(contracts) ? contracts.length : contracts?.total || 0,
        tracks: Array.isArray(tracks) ? tracks.length : tracks?.total || 0,
        works: Array.isArray(works) ? works.length : works?.total || 0,
      });
    });
  }, []);

  const entityData = stats ? [
    { name: "Artists", value: stats.artists },
    { name: "Releases", value: stats.releases },
    { name: "Contracts", value: stats.contracts },
    { name: "Tracks", value: stats.tracks },
    { name: "Works", value: stats.works },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Welcome to OTTO Cloud</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Artists" value={stats ? String(stats.artists) : "—"} icon={<Users size={24} />} />
        <StatsCard title="Releases" value={stats ? String(stats.releases) : "—"} icon={<Music size={24} />} />
        <StatsCard title="Contracts" value={stats ? String(stats.contracts) : "—"} icon={<FileText size={24} />} />
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-danger/30 bg-danger/10 text-danger">
              <AlertTriangle size={19} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Status Quo</h2>
              <p className="text-xs text-text-secondary mt-0.5">Current operational issues requiring attention</p>
            </div>
          </div>
          <a
            href="/office/status-quo"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            View Status Quo <ArrowUpRight size={14} />
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface-elevated p-3">
            <p className="text-xl font-semibold text-text-primary">{statusQuoLoading ? "—" : statusQuo.total}</p>
            <p className="mt-1 text-xs text-text-secondary">Open issues</p>
          </div>
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-3">
            <p className="text-xl font-semibold text-danger">{statusQuoLoading ? "—" : statusQuo.critical}</p>
            <p className="mt-1 text-xs text-text-secondary">Blocking</p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="text-xl font-semibold text-warning">{statusQuoLoading ? "—" : statusQuo.warning}</p>
            <p className="mt-1 text-xs text-text-secondary">Warnings</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-elevated p-3">
            <p className="text-xl font-semibold text-text-primary">{statusQuoLoading ? "—" : statusQuo.entities}</p>
            <p className="mt-1 text-xs text-text-secondary">Entities affected</p>
          </div>
        </div>
      </div>

      <ChartCard title="Catalog Overview">
        {entityData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={entityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                labelStyle={{ color: "var(--color-text-primary)" }}
              />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-text-secondary text-sm">Loading chart data...</div>
        )}
      </ChartCard>
    </div>
  );
}
