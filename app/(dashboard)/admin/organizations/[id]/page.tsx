"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function AdminOrgDetailPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [org, setOrg] = useState<Record<string, unknown> | null>(null);
  const [members, setMembers] = useState<unknown[]>([]);
  const [invitations, setInvitations] = useState<unknown[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/auth/login");
    if (!isAuthenticated || !id) return;
    (async () => {
      const [o, m, i] = await Promise.all([
        fetch(`/api/admin/organizations/${id}`, { credentials: "include" }),
        fetch(`/api/admin/organizations/${id}/members`, {
          credentials: "include",
        }),
        fetch(`/api/admin/organizations/${id}/invitations`, {
          credentials: "include",
        }),
      ]);
      if (o.ok) {
        const d = await o.json();
        setOrg(d.organization);
      } else {
        const d = await o.json().catch(() => ({}));
        setError(d.error || "Failed to load");
      }
      if (m.ok) setMembers((await m.json()).members || []);
      if (i.ok) setInvitations((await i.json()).invitations || []);
    })();
  }, [isAuthenticated, authLoading, id, router]);

  if (!org && !error) {
    return <div className="p-8 text-white/70">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 text-white">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">
          {(org as { name?: string })?.name || "Organization"}
        </h1>
        <Link
          href="/admin/organizations"
          className="text-sm text-white/50 underline"
        >
          All orgs
        </Link>
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      {org && (
        <pre className="text-xs text-white/50 bg-white/5 p-4 rounded-xl overflow-auto">
          {JSON.stringify(org, null, 2)}
        </pre>
      )}
      <section>
        <h2 className="font-semibold mb-2">Members ({members.length})</h2>
        <pre className="text-xs text-white/40 bg-white/5 p-3 rounded-lg max-h-60 overflow-auto">
          {JSON.stringify(members, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="font-semibold mb-2">
          Invitations ({invitations.length})
        </h2>
        <pre className="text-xs text-white/40 bg-white/5 p-3 rounded-lg max-h-40 overflow-auto">
          {JSON.stringify(invitations, null, 2)}
        </pre>
      </section>
    </div>
  );
}
