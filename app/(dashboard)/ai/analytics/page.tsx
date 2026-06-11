// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, RefreshCw, AlertCircle, Loader2,
  FileText, Users, Disc3, Music, BookOpen, MessageSquare, Cpu
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

function formatNumber(n) {
  if (n === null || n === undefined) return "\u2014";
  return Number(n).toLocaleString();
}

function formatDate(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const ICON_MAP = {
  contracts: FileText,
  artists: Users,
  releases: Disc3,
  tracks: Music,
  works: BookOpen,
  sessions: MessageSquare,
};

const STATUS_VARIANTS = {
  Draft: "neutral",
  Active: "success",
  Expired: "warn",
  Terminated: "critical",
};

export default function AIAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [contractsData, setContractsData] = useState(null);
  const [catalogData, setCatalogData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, contractsRes, catalogRes] = await Promise.all([
        api.get("/ai/analytics", { params: { action: "overview" } }).catch(() => null),
        api.get("/ai/analytics", { params: { action: "contracts" } }).catch(() => null),
        api.get("/ai/analytics", { params: { action: "catalog" } }).catch(() => null),
      ]);
      if (overviewRes) setOverview(overviewRes.data);
      if (contractsRes) setContractsData(contractsRes.data);
      if (catalogRes) setCatalogData(catalogRes.data);
    } catch (err) {
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Analytics" subtitle="AI-powered analytics and insights" />
        <div className="flex items-center justify-center p-12">
          <Loader2 size={32} className="text-accent animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Analytics" subtitle="AI-powered analytics and insights" />
        <Card>
          <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4">
            <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={fetchAll}>
              <RefreshCw size={14} /> Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const summaryFields = [
    { label: "Total Contracts", key: "total_contracts", icon: FileText },
    { label: "Total Artists", key: "total_artists", icon: Users },
    { label: "Total Releases", key: "total_releases", icon: Disc3 },
    { label: "Total Tracks", key: "total_tracks", icon: Music },
    { label: "Total Works", key: "total_works", icon: BookOpen },
    { label: "AI Sessions", key: "ai_sessions", icon: MessageSquare },
    { label: "AI Runs", key: "ai_runs", icon: Cpu },
  ];

  const completeness = overview?.completeness_summary || {};

  const byStatus = contractsData?.by_status || [];
  const byType = contractsData?.by_type || [];
  const recentContracts = contractsData?.recent_contracts || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Analytics"
        subtitle="AI-powered analytics and insights"
        actions={
          <Button variant="secondary" size="sm" onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {/* Overview Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {summaryFields.map((field) => {
          const Icon = field.icon;
          const val = overview?.[field.key];
          return (
            <Card key={field.key} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white truncate">{formatNumber(val)}</p>
                  <p className="text-[10px] text-text-secondary uppercase tracking-wider truncate">{field.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Contract Status Breakdown */}
      <Card title="Contract Status Breakdown">
        <div className="flex flex-wrap gap-3">
          {completeness.draft_count != null && (
            <Badge variant="neutral" size="lg">Draft: {formatNumber(completeness.draft_count)}</Badge>
          )}
          {completeness.active_count != null && (
            <Badge variant="success" size="lg">Active: {formatNumber(completeness.active_count)}</Badge>
          )}
          {completeness.expired_count != null && (
            <Badge variant="warn" size="lg">Expired: {formatNumber(completeness.expired_count)}</Badge>
          )}
          {completeness.terminated_count != null && (
            <Badge variant="critical" size="lg">Terminated: {formatNumber(completeness.terminated_count)}</Badge>
          )}
          {!completeness.draft_count && !completeness.active_count && !completeness.expired_count && !completeness.terminated_count && (
            <p className="text-sm text-text-secondary">No status data available.</p>
          )}
        </div>
      </Card>

      {/* Contract Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="By Status">
          {byStatus.length === 0 ? (
            <p className="text-sm text-text-secondary">No data.</p>
          ) : (
            <div className="space-y-2">
              {byStatus.map((item) => (
                <div key={item.status || item.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <Badge variant={STATUS_VARIANTS[item.status || item.name] || "neutral"} size="sm">
                    {item.status || item.name}
                  </Badge>
                  <span className="text-sm font-mono text-white">{formatNumber(item.count || item._count)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="By Type">
          {byType.length === 0 ? (
            <p className="text-sm text-text-secondary">No data.</p>
          ) : (
            <div className="space-y-2">
              {byType.map((item) => (
                <div key={item.type || item.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-text-primary">{item.type || item.name}</span>
                  <span className="text-sm font-mono text-white">{formatNumber(item.count || item._count)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Contracts */}
      <Card title="Recent Contracts">
        {recentContracts.length === 0 ? (
          <p className="text-sm text-text-secondary">No recent contracts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-3 font-bold">Title</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentContracts.slice(0, 10).map((c, idx) => (
                  <tr key={c.id || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-sm text-white">{c.title || "Untitled"}</td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANTS[c.status] || "neutral"} size="sm">
                        {c.status || "Draft"}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-text-secondary">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Catalog Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Catalog — By Artist Type">
          {catalogData?.by_artist_type?.length > 0 ? (
            <div className="space-y-2">
              {catalogData.by_artist_type.map((item) => (
                <div key={item.type || item.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-text-primary">{item.type || item.name}</span>
                  <span className="text-sm font-mono text-white">{formatNumber(item.count || item._count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No data.</p>
          )}
        </Card>

        <Card title="Catalog — By Release Type">
          {catalogData?.by_release_type?.length > 0 ? (
            <div className="space-y-2">
              {catalogData.by_release_type.map((item) => (
                <div key={item.type || item.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-text-primary">{item.type || item.name}</span>
                  <span className="text-sm font-mono text-white">{formatNumber(item.count || item._count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No data.</p>
          )}
        </Card>
      </div>

      {catalogData?.summary && (
        <Card title="Catalog Summary">
          <div className="flex flex-wrap gap-3">
            {Object.entries(catalogData.summary).map(([key, val]) => (
              <Badge key={key} variant="neutral" size="md">
                {key.replace(/_/g, " ")}: {formatNumber(val)}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
