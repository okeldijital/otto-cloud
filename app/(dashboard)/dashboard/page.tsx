"use client";

import { useState, useEffect } from "react";
import { Music, Users, FileText } from "lucide-react";
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

  useEffect(() => {
    Promise.allSettled([
      api.get("/artists?limit=1"),
      api.get("/releases/list?limit=1"),
      api.get("/contracts?limit=1"),
      api.get("/tracks?limit=1"),
      api.get("/works?limit=1"),
    ]).then((results) => {
      const valueAt = (index: number) => results[index]?.status === "fulfilled" ? results[index].value.data : null;
      const artists = valueAt(0);
      const releases = valueAt(1);
      const contracts = valueAt(2);
      const tracks = valueAt(3);
      const works = valueAt(4);

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
