"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Role = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissionCount: number;
  memberCount: number;
  permissions: string[];
};

export default function OrgRolesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const organization = currentOrg as { id?: string; name?: string } | null;
  const orgId = organization?.id;
  const orgHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (orgId) headers["x-organization-id"] = orgId;
    return headers;
  }, [orgId]);

  const loadRoles = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/organizations/roles", {
        credentials: "include",
        headers: orgHeaders,
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${res.status}: ${data.error || "Failed to load roles"}`);
      setRoles(Array.isArray(data.roles) ? data.roles : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [orgId, orgHeaders]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated && orgId) void loadRoles();
  }, [authLoading, isAuthenticated, orgId, router, loadRoles]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-white">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & permissions</h1>
          <p className="text-sm text-white/50 mt-1">
            Review the roles available to {organization?.name || "this organisation"} and the permissions assigned to each role.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => void loadRoles()} disabled={loading} className="text-sm text-white/60 underline disabled:opacity-40">Refresh</button>
          <Link href="/settings/organization/members" className="text-sm text-white/50 underline">Members</Link>
        </div>
      </header>

      {error && <div className="p-4 rounded-lg bg-danger/5 border border-danger/20 text-sm text-danger">{error}</div>}

      {loading ? (
        <div className="p-8 rounded-xl border border-white/10 text-sm text-white/40">Loading roles…</div>
      ) : roles.length === 0 && !error ? (
        <div className="p-8 rounded-xl border border-white/10 text-sm text-white/50">No roles are configured for this organisation.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <article key={role.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{role.name}</h2>
                    <div className="text-xs text-white/40 mt-1 font-mono">{role.key}</div>
                  </div>
                  {role.isSystem && <span className="text-[10px] uppercase tracking-wide text-white/40 border border-white/10 rounded-full px-2 py-1">System role</span>}
                </div>
                <div className="text-xs text-white/50 mt-4">{role.memberCount} member{role.memberCount === 1 ? "" : "s"} · {role.permissionCount} permissions</div>
              </div>
              <div className="p-5">
                <h3 className="text-xs uppercase tracking-wide text-white/40 mb-3">Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission) => (
                    <span key={permission} className="text-[11px] rounded-md bg-white/5 border border-white/10 px-2 py-1 font-mono text-white/60">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
