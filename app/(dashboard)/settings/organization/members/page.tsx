"use client";

import { useEffect, useState } from "react";
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
  isOwner: boolean;
};

export default function OrgMembersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const orgId = (currentOrg as { id?: string } | null)?.id;

  const load = async () => {
    if (!orgId) return;
    const res = await fetch(`/api/admin/organizations/${orgId}/members`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to load members");
      return;
    }
    setMembers(data.members || []);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated && orgId) load();
  }, [isAuthenticated, authLoading, orgId, router]);

  const act = async (identityId: string, action: string, roleKey?: string) => {
    if (!orgId) return;
    setError("");
    const res = await fetch(
      `/api/admin/organizations/${orgId}/members/${identityId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, roleKey }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Action failed");
      return;
    }
    setMessage(`Updated ${action}`);
    await load();
  };

  const remove = async (identityId: string) => {
    if (!orgId || !window.confirm("Remove this member?")) return;
    await fetch(`/api/admin/organizations/${orgId}/members/${identityId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Members</h1>
        <Link href="/settings/organization" className="text-sm text-white/50 underline">
          Organization
        </Link>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex justify-between p-3 rounded-lg bg-white/5 border border-white/10 text-sm"
          >
            <div>
              <div>
                {m.displayName || m.email || m.identityId}
                {m.isOwner ? " · Owner" : ""}
              </div>
              <div className="text-xs text-white/40">
                {m.email} · {m.roleKey || "—"} · {m.status}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {m.status === "active" && !m.isOwner && (
                <>
                  <button
                    className="text-xs underline"
                    onClick={() => act(m.identityId, "suspend")}
                  >
                    Suspend
                  </button>
                  <button
                    className="text-xs underline"
                    onClick={() => act(m.identityId, "set_role", "viewer")}
                  >
                    Set viewer
                  </button>
                  <button
                    className="text-xs text-danger underline"
                    onClick={() => remove(m.identityId)}
                  >
                    Remove
                  </button>
                </>
              )}
              {m.status === "suspended" && (
                <button
                  className="text-xs underline"
                  onClick={() => act(m.identityId, "reactivate")}
                >
                  Reactivate
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
