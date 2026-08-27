"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Member = { id: string; identityId: string; email?: string; displayName?: string | null; status: string; roleKey: string | null; isOwner: boolean };
type Role = { id: string; key: string; name: string };

export default function OrgMembersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const orgId = (currentOrg as { id?: string } | null)?.id;

  const orgHeaders: Record<string, string> = orgId ? { "x-organization-id": orgId } : {};

  const load = async () => {
    if (!orgId) return;
    setError("");
    const [membersRes, rolesRes] = await Promise.all([
      fetch("/api/organizations/members", { credentials: "include", headers: orgHeaders, cache: "no-store" }),
      fetch("/api/auth/organizations/roles", { credentials: "include", headers: orgHeaders, cache: "no-store" }),
    ]);
    const membersData = await membersRes.json().catch(() => ({}));
    const rolesData = await rolesRes.json().catch(() => ({}));
    if (!membersRes.ok) return setError(`${membersRes.status}: ${membersData.error || "Failed to load members"}`);
    if (!rolesRes.ok) return setError(`${rolesRes.status}: ${rolesData.error || "Failed to load roles"}`);
    setMembers(Array.isArray(membersData) ? membersData : membersData.members || []);
    setRoles((rolesData.roles || []).filter((r: Role) => r.key !== "owner" && r.key !== "org_admin"));
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/auth/login"); return; }
    if (isAuthenticated && orgId) load();
  }, [isAuthenticated, authLoading, orgId, router]);

  const setRole = async (identityId: string, roleKey: string) => {
    setSavingRole(identityId); setError(""); setMessage("");
    try {
      const res = await fetch("/api/organizations/members", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...orgHeaders },
        body: JSON.stringify({ identity_id: identityId, role_key: roleKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(`${res.status}: ${data.error || "Unable to change role"}`); return; }
      setMessage("Role updated."); await load();
    } finally { setSavingRole(null); }
  };

  const remove = async (identityId: string) => {
    if (!window.confirm("Remove this member from the organisation?")) return;
    const res = await fetch(`/api/organizations/members?identity_id=${encodeURIComponent(identityId)}`, { method: "DELETE", credentials: "include", headers: orgHeaders });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(`${res.status}: ${data.error || "Unable to remove member"}`); return; }
    await load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Members</h1><p className="text-sm text-white/50 mt-1">Manage membership and organisation-specific roles.</p></div>
        <Link href="/settings/organization/invitations" className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">Invite user</Link>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}
      <div className="space-y-2">
        {members.length === 0 && !error && <div className="p-6 rounded-lg bg-white/5 border border-white/10 text-sm text-white/50">No members found for this organisation.</div>}
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="min-w-0"><div className="font-medium truncate">{m.displayName || m.email || m.identityId}{m.isOwner ? " · Owner" : ""}</div><div className="text-xs text-white/40 mt-1">{m.email} · {m.status}</div></div>
            {!m.isOwner && m.status === "active" && <div className="flex items-center gap-2"><label className="text-xs text-white/50">Role</label><select value={m.roleKey || "member"} disabled={savingRole === m.identityId} onChange={(e) => setRole(m.identityId, e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">{roles.map((role) => <option key={role.id} value={role.key}>{role.name}</option>)}</select><button className="text-xs text-danger underline" onClick={() => remove(m.identityId)}>Remove</button></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
