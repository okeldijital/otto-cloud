"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Users, Building2, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

function formatDate(d: string | null) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminPage() {
  const [tab, setTab] = useState<"orgs" | "users">("orgs");
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrgs = async () => {
    try {
      const res = await api.get("/admin/orgs");
      setOrgs(Array.isArray(res.data) ? res.data : []);
    } catch { setOrgs([]); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { setUsers([]); }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchOrgs(), fetchUsers()]);
    } catch {
      setError("Failed to load admin data");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleToggleUser = async (userId: number, field: string, value: boolean) => {
    try {
      await api.put("/admin/users", { id: userId, [field]: value });
      fetchUsers();
    } catch { setError("Failed to update user"); }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Control"
        subtitle="System administration"
        actions={
          <Button variant="secondary" size="sm" onClick={fetchAll}>
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

      <div className="flex gap-1 border-b border-white/5 mb-4">
        <button
          className={`px-4 py-2 text-sm font-bold transition-colors ${tab === "orgs" ? "text-white border-b-2 border-accent" : "text-text-secondary hover:text-white"}`}
          onClick={() => setTab("orgs")}
        >
          <Building2 size={14} className="inline mr-1" /> Organizations ({orgs.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-bold transition-colors ${tab === "users" ? "text-white border-b-2 border-accent" : "text-text-secondary hover:text-white"}`}
          onClick={() => setTab("users")}
        >
          <Users size={14} className="inline mr-1" /> Users ({totalUsers})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-text-secondary">Loading...</div>
      ) : tab === "orgs" ? (
        <Card title="Organizations">
          {orgs.length === 0 ? (
            <p className="text-sm text-text-secondary">No organizations found.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 -mb-6">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Display Name</th>
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold">Org ID</th>
                    <th className="p-4 font-bold">Brand Color</th>
                    <th className="p-4 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm text-white font-medium">{org.name}</td>
                      <td className="p-4 text-sm text-text-secondary">{org.display_name || "\u2014"}</td>
                      <td className="p-4 text-sm capitalize"><Badge variant="neutral" size="sm">{org.org_type || "standard"}</Badge></td>
                      <td className="p-4 text-sm font-mono text-text-secondary">{org.organization_id}</td>
                      <td className="p-4">
                        {org.brand_color && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: org.brand_color }} />
                            <span className="text-xs font-mono text-text-secondary">{org.brand_color}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{formatDate(org.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card title={`Users (${activeUsers}/${totalUsers} active)`}>
          {users.length === 0 ? (
            <p className="text-sm text-text-secondary">No users found.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 -mb-6">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
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
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm text-white font-medium">{u.name || "\u2014"}</td>
                      <td className="p-4 text-sm text-text-secondary">{u.email}</td>
                      <td className="p-4">
                        <Badge variant={u.role === "admin" ? "primary" : "neutral"} size="sm">{u.role || "user"}</Badge>
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
                            u.is_superuser ? "bg-accent/20 text-accent" : "bg-white/10 text-text-secondary"
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
    </div>
  );
}
