"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Invitation = {
  id: string;
  email: string;
  status: string;
  roleKey: string | null;
  expiresAt: string;
};

export default function OrgInvitationsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("member");
  const [error, setError] = useState("");
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const orgId = (currentOrg as { id?: string } | null)?.id;

  const load = async () => {
    if (!orgId) return;
    const res = await fetch(`/api/admin/organizations/${orgId}/invitations`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setInvitations(data.invitations || []);
    else setError(data.error || "Failed to load");
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/auth/login");
    if (isAuthenticated && orgId) load();
  }, [isAuthenticated, authLoading, orgId, router]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setError("");
    setDevUrl(null);
    const res = await fetch(`/api/admin/organizations/${orgId}/invitations`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, roleKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    if (data.inviteUrl) setDevUrl(data.inviteUrl);
    setEmail("");
    await load();
  };

  const cancel = async (id: string) => {
    await fetch(`/api/admin/invitations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 text-white">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Invitations</h1>
        <Link href="/settings/organization" className="text-sm text-white/50 underline">
          Organization
        </Link>
      </div>
      <form onSubmit={invite} className="flex gap-2 flex-wrap">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@company.com"
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          required
        />
        <select
          value={roleKey}
          onChange={(e) => setRoleKey(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
        >
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="manager">Manager</option>
          <option value="administrator">Administrator</option>
        </select>
        <button type="submit" className="px-4 py-2 rounded-lg bg-accent">
          Invite
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      {devUrl && (
        <a href={devUrl} className="block text-xs text-accent break-all">
          {devUrl}
        </a>
      )}
      <ul className="space-y-2 text-sm">
        {invitations.map((i) => (
          <li
            key={i.id}
            className="flex justify-between p-3 rounded-lg bg-white/5 border border-white/10"
          >
            <div>
              {i.email} · {i.roleKey} · {i.status}
              <div className="text-xs text-white/40">
                expires {new Date(i.expiresAt).toLocaleString()}
              </div>
            </div>
            {i.status === "pending" && (
              <button
                className="text-xs text-danger underline"
                onClick={() => cancel(i.id)}
              >
                Cancel
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
