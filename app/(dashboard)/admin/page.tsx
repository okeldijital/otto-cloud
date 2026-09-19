"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Building2, CheckCircle, Database, HardDrive, RefreshCw, ShieldCheck, Users, AlertCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "orgs" | "users" | "systems";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isPlatformAuthority(user: any) {
  return Boolean(
    user?.is_superuser ||
    user?.role === "platform_admin" ||
    user?.role === "super_admin" ||
    user?.permissions?.includes?.("platform.admin") ||
    user?.roles?.includes?.("platform_admin") ||
    user?.roles?.includes?.("super_admin")
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const platformAuthority = useMemo(() => isPlatformAuthority(user), [user]);
  const [tab, setTab] = useState<Tab>("orgs");
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("tab");
    if (requested === "users" || requested === "systems") setTab(requested);
  }, []);

  const setActiveTab = (next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "orgs") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url);
  };

  const fetchPlatformData = async () => {
    if (!platformAuthority) return;
    setLoading(true);
    setError("");
    const [orgResult, userResult] = await Promise.allSettled([
      api.get("/admin/orgs"),
      api.get("/admin/users"),
    ]);

    if (orgResult.status === "fulfilled") {
      setOrgs(Array.isArray(orgResult.value.data) ? orgResult.value.data : []);
    } else {
      setOrgs([]);
      setError("Unable to load organizations.");
    }

    if (userResult.status === "fulfilled") {
      setUsers(Array.isArray(userResult.value.data) ? userResult.value.data : []);
    } else {
      setUsers([]);
      setError((current) => current || "Unable to load users.");
    }

    setLoading(false);
  };

  const fetchHealth = async () => {
    if (!platformAuthority) return;
    setHealthLoading(true);
    try {
      const response = await api.get("/health");
      setHealth(response.data);
    } catch {
      setHealth({ ok: false, status: "unavailable", database: "unknown" });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && platformAuthority) {
      void fetchPlatformData();
      void fetchHealth();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, platformAuthority]);

  const handleToggleUser = async (userId: number, field: string, value: boolean) => {
    try {
      await api.put("/admin/users", { id: userId, [field]: value });
      await fetchPlatformData();
    } catch {
      setError("Failed to update user.");
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;

  if (authLoading || loading) {
    return <div className="p-12 text-center text-text-secondary">Loading administration...</div>;
  }

  if (!platformAuthority) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Control" subtitle="Platform administration" />
        <Card>
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text-primary">Platform administrator access required</p>
              <p className="text-sm text-text-secondary mt-1">
                Organization administration is available from Organization Settings.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Control"
        subtitle="Platform administration"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (tab === "systems") void fetchHealth();
              else void fetchPlatformData();
            }}
          >
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {error && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4">
          <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      )}

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { id: "orgs" as const, label: "Organizations", icon: Building2 },
          { id: "users" as const, label: "Users", icon: Users },
          { id: "systems" as const, label: "Systems", icon: HardDrive },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`whitespace-nowrap px-4 py-2 text-sm font-bold transition-colors ${
                tab === item.id
                  ? "text-text-primary border-b-2 border-accent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={14} className="inline mr-1" /> {item.label}
              {item.id === "orgs" && ` (${orgs.length})`}
              {item.id === "users" && ` (${totalUsers})`}
            </button>
          );
        })}
      </div>

      {tab === "orgs" && (
        <Card title="Organizations">
          {orgs.length === 0 ? (
            <p className="text-sm text-text-secondary">No organizations found.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 -mb-6">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-border">
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Display Name</th>
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold">Org ID</th>
                    <th className="p-4 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id} className="border-b border-border hover:bg-surface-elevated transition-colors">
                      <td className="p-4 text-sm text-text-primary font-medium">{org.name}</td>
                      <td className="p-4 text-sm text-text-secondary">{org.display_name || "—"}</td>
                      <td className="p-4 text-sm capitalize">
                        <Badge variant="neutral" size="sm">{org.org_type || "standard"}</Badge>
                      </td>
                      <td className="p-4 text-sm font-mono text-text-secondary">{org.organization_id}</td>
                      <td className="p-4 text-sm text-text-secondary">{formatDate(org.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "users" && (
        <Card title={`Users (${activeUsers}/${totalUsers} active)`}>
          {users.length === 0 ? (
            <p className="text-sm text-text-secondary">No users found.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 -mb-6">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-border">
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Role</th>
                    <th className="p-4 font-bold">Org ID</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Superuser</th>
                    <th className="p-4 font-bold">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border hover:bg-surface-elevated transition-colors">
                      <td className="p-4 text-sm text-text-primary font-medium">{u.name || "—"}</td>
                      <td className="p-4 text-sm text-text-secondary">{u.email}</td>
                      <td className="p-4">
                        <Badge variant={u.role === "admin" ? "primary" : "neutral"} size="sm">
                          {u.role || "user"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm font-mono text-text-secondary">{u.organization_id?.slice(0, 8)}...</td>
                      <td className="p-4">
                        <button
                          className={`text-xs px-2 py-1 rounded-full transition-colors ${
                            u.is_active ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                          }`}
                          onClick={() => handleToggleUser(u.id, "is_active", !u.is_active)}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-4">
                        <button
                          className={`text-xs px-2 py-1 rounded-full transition-colors ${
                            u.is_superuser ? "bg-accent/20 text-accent" : "bg-surface-elevated text-text-secondary"
                          }`}
                          onClick={() => handleToggleUser(u.id, "is_superuser", !u.is_superuser)}
                        >
                          {u.is_superuser ? "Yes" : "No"}
                        </button>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{formatDate(u.last_login)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "systems" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  health?.ok ? "bg-success/10" : "bg-danger/10"
                }`}>
                  <Activity size={20} className={health?.ok ? "text-success" : "text-danger"} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {healthLoading ? "Checking..." : health?.ok ? "Application Operational" : "Degraded"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Status: {health?.status || "unknown"}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  health?.database === "connected" ? "bg-accent/10" : "bg-danger/10"
                }`}>
                  <Database size={20} className={health?.database === "connected" ? "text-accent" : "text-danger"} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Database</p>
                  <p className="text-xs text-text-secondary">
                    {health?.database === "connected" ? "Connected" : health?.database || "Unknown"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card title="Health Checks" subtitle="Live checks performed by OTTO Cloud">
            <div className="space-y-3">
              {[
                { label: "Application", value: health?.status || "checking", ok: health?.ok },
                { label: "Database", value: health?.database || "checking", ok: health?.database === "connected" },
                { label: "Timestamp", value: health?.timestamp ? new Date(health.timestamp).toLocaleString() : "—", ok: true },
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

          <Card title="Operational boundary" subtitle="What this screen reports">
            <p className="text-sm text-text-secondary">
              This surface reports application and database health only. Production database backups are
              managed by the underlying infrastructure and are not represented as files stored inside OTTO Cloud.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
