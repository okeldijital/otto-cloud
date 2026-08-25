"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Invitation = { id: string; email: string; status: string; roleKey: string | null; expiresAt: string };
type Role = { id: string; key: string; name: string };

export default function OrgInvitationsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("member");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const orgId = (currentOrg as { id?: string } | null)?.id;

  const load = async () => {
    if (!orgId) return;
    const [invRes, rolesRes] = await Promise.all([
      fetch("/api/auth/invitations", { credentials: "include" }),
      fetch("/api/auth/organizations/roles", { credentials: "include" }),
    ]);
    const invData = await invRes.json().catch(() => ({}));
    const rolesData = await rolesRes.json().catch(() => ({}));
    if (!invRes.ok) return setError(invData.error || "Failed to load invitations");
    if (!rolesRes.ok) return setError(rolesData.error || "Failed to load roles");
    setInvitations(invData.invitations || []);
    setRoles(rolesData.roles || []);
    if (rolesData.roles?.length && !rolesData.roles.some((r: Role) => r.key === roleKey)) {
      setRoleKey(rolesData.roles[0].key);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/auth/login");
    if (isAuthenticated && orgId) load();
  }, [isAuthenticated, authLoading, orgId, router]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSending(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/auth/invitations", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, roleKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Invitation failed"); return; }
      setMessage(`Invitation sent to ${email}.`);
      setEmail("");
      await load();
    } finally { setSending(false); }
  };

  const cancel = async (id: string) => {
    const res = await fetch(`/api/auth/invitations?invitation_id=${encodeURIComponent(id)}`, {
      method: "DELETE", credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Unable to cancel invitation");
    else await load();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Invitations</h1><p className="text-sm text-white/50 mt-1">Invite people to this organisation.</p></div>
        <Link href="/settings/organization/members" className="text-sm text-white/50 underline">Members</Link>
      </div>
      <form onSubmit={invite} className="flex gap-2 flex-wrap p-4 rounded-xl bg-white/5 border border-white/10">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-white/5 border border-white/10" required />
        <select value={roleKey} onChange={(e) => setRoleKey(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          {roles.map((role) => <option key={role.id} value={role.key}>{role.name}</option>)}
        </select>
        <button type="submit" disabled={sending || !roles.length} className="px-4 py-2 rounded-lg bg-accent disabled:opacity-50">{sending ? "Sending…" : "Invite"}</button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}
      <ul className="space-y-2 text-sm">
        {invitations.map((i) => <li key={i.id} className="flex justify-between p-3 rounded-lg bg-white/5 border border-white/10"><div>{i.email} · {i.roleKey || "member"} · {i.status}<div className="text-xs text-white/40">expires {new Date(i.expiresAt).toLocaleString()}</div></div>{i.status === "pending" && <button className="text-xs text-danger underline" onClick={() => cancel(i.id)}>Cancel</button>}</li>)}
      </ul>
    </div>
  );
}
