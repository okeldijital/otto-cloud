"use client";

import { useState, useEffect } from "react";
import { Activity, Database, HardDrive, RefreshCw, AlertCircle, CheckCircle, Clock, Server, Shield } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(d: string | null) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SystemsPage() {
  const [health, setHealth] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [healthRes, backupRes] = await Promise.all([
        api.get("/health").catch(() => null),
        api.get("/backup", { params: { action: "list" } }).catch(() => null),
      ]);
      if (healthRes) setHealth(healthRes.data);
      if (backupRes) setBackups(Array.isArray(backupRes.data) ? backupRes.data : []);
    } catch {
      setError("Failed to load system data");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setError("");
    try {
      await api.post("/backup", {}, { params: { action: "create" } });
      const res = await api.get("/backup", { params: { action: "list" } });
      setBackups(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Backup failed");
    } finally { setCreating(false); }
  };

  const handleCleanup = async () => {
    try {
      const res = await api.post("/backup", {}, { params: { action: "cleanup" } });
      fetchAll();
    } catch {
      setError("Cleanup failed");
    }
  };

  const totalBackupSize = backups.reduce((s, b) => s + (b.size_bytes || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Systems"
        subtitle="Monitoring, backups, and system health"
        actions={
          <Button variant="secondary" size="sm" onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {error && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4 mb-4">
          <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${health?.ok ? "bg-success/10" : "bg-danger/10"}`}>
              <Activity size={20} className={health?.ok ? "text-success" : "text-danger"} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{health?.ok ? "All Systems Operational" : "Degraded"}</p>
              <p className="text-xs text-text-secondary">Status: {health?.status || "unknown"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <Database size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Database</p>
              <p className="text-xs text-text-secondary">{health?.database === "connected" ? "Connected" : health?.database || "Unknown"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <HardDrive size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Backups</p>
              <p className="text-xs text-text-secondary">{backups.length} files ({formatBytes(totalBackupSize)})</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Health Details */}
      <Card title="Health Checks">
        <div className="space-y-3">
          {[
            { label: "Status", value: health?.status || "checking", ok: health?.ok },
            { label: "Database", value: health?.database || "checking", ok: health?.database === "connected" },
            { label: "Timestamp", value: formatDate(health?.timestamp), ok: true },
          ].map((check) => (
            <div key={check.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                {check.ok ? <CheckCircle size={14} className="text-success" /> : <AlertCircle size={14} className="text-danger" />}
                <span className="text-sm text-text-primary">{check.label}</span>
              </div>
              <span className="text-sm text-text-secondary font-mono">{check.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Backups */}
      <Card
        title="Backups"
        subtitle="Database snapshots"
        headerAction={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCleanup}>
              Cleanup (keep 10)
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateBackup} disabled={creating}>
              {creating ? "Creating..." : <><Server size={14} /> Create Backup</>}
            </Button>
          </div>
        }
      >
        {backups.length === 0 ? (
          <p className="text-sm text-text-secondary">No backups yet. Create your first backup.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">Filename</th>
                  <th className="p-4 font-bold">Size</th>
                  <th className="p-4 font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {backups.slice(0, 20).map((b) => (
                  <tr key={b.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm font-mono text-white truncate max-w-[300px]">{b.name}</td>
                    <td className="p-4 text-sm text-text-secondary">{formatBytes(b.size_bytes)}</td>
                    <td className="p-4 text-sm text-text-secondary">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Security Info */}
      <Card title="Security">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Shield size={14} className="text-accent" />
              <span className="text-sm text-text-primary">Authentication</span>
            </div>
            <Badge variant="success" size="sm">JWT + Session</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Shield size={14} className="text-accent" />
              <span className="text-sm text-text-primary">API Authentication</span>
            </div>
            <Badge variant="success" size="sm">Bearer Token</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Shield size={14} className="text-accent" />
              <span className="text-sm text-text-primary">Rate Limiting</span>
            </div>
            <Badge variant="success" size="sm">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Shield size={14} className="text-accent" />
              <span className="text-sm text-text-primary">SSL/TLS</span>
            </div>
            <Badge variant="neutral" size="sm">Via Platform</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
