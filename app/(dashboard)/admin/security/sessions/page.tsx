"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminSession = {
  id: string;
  identityId: string;
  email: string;
  displayName: string | null;
  device: { name?: string | null; browser?: string | null; os?: string | null };
  ipAddress: string | null;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
  revoked: boolean;
  revokeReason: string | null;
  riskLevel: string;
  rememberMe: boolean;
};

export default function AdminSessionsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const search = async () => {
    setError("");
    const q = new URLSearchParams();
    if (email) q.set("email", email);
    q.set("activeOnly", "false");
    const res = await fetch(`/api/admin/security/sessions?${q}`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Search failed (requires security.manage)");
      return;
    }
    setSessions(data.sessions || []);
    setTotal(data.total || 0);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const revoke = async (id: string) => {
    if (!window.confirm("Force revoke this session?")) return;
    const res = await fetch(`/api/admin/security/sessions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Revoke failed");
      return;
    }
    setMessage("Session revoked");
    await search();
  };

  if (authLoading) {
    return <div className="p-8 text-white/70">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Sessions</h1>
        <Link href="/admin" className="text-sm text-white/50 underline">
          Admin home
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex gap-2"
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Filter by email"
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-accent">
          Search
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}
      <p className="text-xs text-white/40">{total} session(s)</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-white/50 border-b border-white/10">
            <tr>
              <th className="py-2 pr-2">User</th>
              <th className="py-2 pr-2">Device</th>
              <th className="py-2 pr-2">IP</th>
              <th className="py-2 pr-2">Last active</th>
              <th className="py-2 pr-2">Risk</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-white/5">
                <td className="py-2 pr-2">
                  <div>{s.email}</div>
                  <div className="text-xs text-white/40">{s.identityId.slice(0, 8)}…</div>
                </td>
                <td className="py-2 pr-2">
                  {s.device?.name ||
                    [s.device?.browser, s.device?.os].filter(Boolean).join(" / ") ||
                    "—"}
                </td>
                <td className="py-2 pr-2">{s.ipAddress || "—"}</td>
                <td className="py-2 pr-2">
                  {new Date(s.lastActivityAt).toLocaleString()}
                </td>
                <td className="py-2 pr-2">{s.riskLevel}</td>
                <td className="py-2 pr-2">
                  {s.revoked ? `Revoked (${s.revokeReason || "—"})` : "Active"}
                </td>
                <td className="py-2">
                  {!s.revoked && (
                    <button
                      onClick={() => revoke(s.id)}
                      className="text-danger text-xs underline"
                    >
                      Force logout
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
