"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Users, Calendar, Activity } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users?all=true").then(r => {
      setUsers(Array.isArray(r.data) ? r.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Control" subtitle="System administration" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Users" subtitle={`${users.length} registered users`}>
          {loading ? (
            <div className="py-4 text-center text-text-secondary text-sm">Loading...</div>
          ) : users.length === 0 ? (
            <div className="py-4 text-center text-text-secondary text-sm">No users found</div>
          ) : (
            <div className="overflow-x-auto -mx-6 -mb-6">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Role</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm text-white font-medium">{u.name || "—"}</td>
                      <td className="p-4 text-sm text-text-secondary">{u.email}</td>
                      <td className="p-4">
                        <Badge variant={u.is_superuser ? "primary" : "neutral"} size="sm">{u.role || (u.is_superuser ? "admin" : "user")}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={u.is_active ? "success" : "danger"} size="sm">{u.is_active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{u.last_login ? new Date(u.last_login).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="System" subtitle="Platform overview">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Activity size={20} className="text-accent" />
              <div>
                <p className="text-sm text-white font-medium">Status</p>
                <p className="text-xs text-text-secondary">All systems operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Users size={20} className="text-accent" />
              <div>
                <p className="text-sm text-white font-medium">Total Users</p>
                <p className="text-xs text-text-secondary">{loading ? "..." : users.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Calendar size={20} className="text-accent" />
              <div>
                <p className="text-sm text-white font-medium">Platform</p>
                <p className="text-xs text-text-secondary">OTTO Cloud v1.0.0</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
