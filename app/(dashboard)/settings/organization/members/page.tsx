"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Member = {
  id: string;
  identityId: string;
  email?: string;
  displayName?: string | null;
  status: string;
  roleKey: string | null;
  roleName?: string | null;
  isOwner: boolean;
};

type Role = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissionCount: number;
  memberCount: number;
};

export default function OrgMembersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [membersError, setMembersError] = useState("");
  const [rolesError, setRolesError] = useState("");
  const [message, setMessage] = useState("");
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const orgId = (currentOrg as { id?: string } | null)?.id;

  const orgHeaders = useMemo<Record<string, string>>(
    () => (orgId ? { "x-organization-id": orgId } : {}),
    [orgId],
  );

  const loadMembers = useCallback(async () => {
    if (!orgId) return;
    setMembersLoading(true);
    setMembersError("");
    try {
      const res = await fetch("/api/organizations/members", {
        credentials: "include",
        headers: orgHeaders,
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${res.status}: ${data.error || "Failed to load members"}`);
      setMembers(Array.isArray(data) ? data : Array.isArray(data.members) ? data.members : []);
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }, [orgId, orgHeaders]);

  const loadRoles = useCallback(async () => {
    if (!orgId) return;
    setRolesLoading(true);
    setRolesError("");
    try {
      const res = await fetch("/api/auth/organizations/roles", {
        credentials: "include",
        headers: orgHeaders,
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${res.status}: ${data.error || "Failed to load roles"}`);
      setRoles(Array.isArray(data.roles) ? data.roles : []);
    } catch (error) {
      setRolesError(error instanceof Error ? error.message : "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  }, [orgId, orgHeaders]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated && orgId) {
      void loadMembers();
      void loadRoles();
    }
  }, [authLoading, isAuthenticated, orgId, router, loadMembers, loadRoles]);

  const assignableRoles = roles.filter((role) => role.key !== "owner" && role.key !== "org_admin");

  const setRole = async (identityId: string, roleKey: string) => {
    setSavingRole(identityId);
    setMembersError("");
    setMessage("");
    try {
      const res = await fetch("/api/organizations/members", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...orgHeaders },
        body: JSON.stringify({ identity_id: identityId, role_key: roleKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${res.status}: ${data.error || "Unable to change role"}`);
      setMessage("Role updated.");
      await Promise.all([loadMembers(), loadRoles()]);
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Unable to change role");
    } finally {
      setSavingRole(null);
    }
  };

  const remove = async (identityId: string) => {
    if (!window.confirm("Remove this member from the organisation?")) return;
    setRemoving(identityId);
    setMembersError("");
    setMessage("");
    try {
      const res = await fetch(`/api/organizations/members?identity_id=${encodeURIComponent(identityId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: orgHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${res.status}: ${data.error || "Unable to remove member"}`);
      setMessage("Member removed.");
      await Promise.all([loadMembers(), loadRoles()]);
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Unable to remove member");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-white">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-white/50 mt-1">
            Manage people, membership status, and organisation roles for {currentOrg?.name || "this organisation"}.
          </p>
        </div>
        <Link href="/settings/organization/invitations" className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">
          Invite user
        </Link>
      </header>

      {message && <p className="text-sm text-green-400">{message}</p>}

      <section className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Organisation members</h2>
            <p className="text-xs text-white/40 mt-1">{membersLoading ? "Loading…" : `${members.length} member${members.length === 1 ? "" : "s"}`}</p>
          </div>
          <button onClick={() => void loadMembers()} disabled={membersLoading} className="text-xs text-white/60 underline disabled:opacity-40">
            Refresh
          </button>
        </div>

        {membersError && <div className="px-5 py-4 text-sm text-danger bg-danger/5">{membersError}</div>}

        {membersLoading ? (
          <div className="p-8 text-sm text-white/40">Loading members…</div>
        ) : members.length === 0 && !membersError ? (
          <div className="p-8 text-sm text-white/50">No members are currently assigned to this organisation.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {members.map((member) => (
              <div key={member.id} className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {member.displayName || member.email || member.identityId}
                    {member.isOwner && <span className="ml-2 text-xs text-white/50">Owner</span>}
                  </div>
                  <div className="text-xs text-white/40 mt-1">{member.email || "No email"} · {member.status}</div>
                </div>

                {member.isOwner ? (
                  <div className="text-sm text-white/50">{member.roleName || "Owner"}</div>
                ) : member.status === "active" ? (
                  <div className="flex items-center gap-3">
                    <label htmlFor={`role-${member.id}`} className="text-xs text-white/50">Role</label>
                    <select
                      id={`role-${member.id}`}
                      value={member.roleKey || "member"}
                      disabled={savingRole === member.identityId || rolesLoading || assignableRoles.length === 0}
                      onChange={(event) => void setRole(member.identityId, event.target.value)}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                    >
                      {assignableRoles.map((role) => <option key={role.id} value={role.key}>{role.name}</option>)}
                    </select>
                    <button
                      className="text-xs text-danger underline disabled:opacity-40"
                      disabled={removing === member.identityId}
                      onClick={() => void remove(member.identityId)}
                    >
                      {removing === member.identityId ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-white/40">{member.roleName || member.roleKey || "No role"}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Available roles</h2>
            <p className="text-xs text-white/40 mt-1">System roles available to this organisation.</p>
          </div>
          <Link href="/settings/organization/roles" className="text-xs text-white/60 underline">View permissions</Link>
        </div>
        {rolesError ? (
          <div className="p-5 text-sm text-danger">{rolesError}</div>
        ) : rolesLoading ? (
          <div className="p-5 text-sm text-white/40">Loading roles…</div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div key={role.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{role.name}</div>
                  {role.isSystem && <span className="text-[10px] uppercase tracking-wide text-white/40">System</span>}
                </div>
                <div className="text-xs text-white/40 mt-2">{role.memberCount} member{role.memberCount === 1 ? "" : "s"} · {role.permissionCount} permissions</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
