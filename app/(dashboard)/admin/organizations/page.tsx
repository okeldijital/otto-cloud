"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Org = {
  id: string;
  name: string;
  slug: string;
  status: string;
  mfaPolicy: string;
};

export default function AdminOrganizationsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/organizations", {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed (requires organizations.manage)");
      return;
    }
    setOrgs(data.organizations || []);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/auth/login");
    if (isAuthenticated) load();
  }, [isAuthenticated, authLoading, router]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/organizations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName("");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Create failed");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 text-white">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Admin · Organizations</h1>
        <Link href="/admin" className="text-sm text-white/50 underline">
          Admin
        </Link>
      </div>
      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New organization name"
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          required
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-accent">
          Create
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      <table className="w-full text-sm">
        <thead className="text-white/50 border-b border-white/10">
          <tr>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Slug</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2">MFA</th>
            <th className="text-left py-2" />
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id} className="border-b border-white/5">
              <td className="py-2">{o.name}</td>
              <td className="py-2 text-white/50">{o.slug}</td>
              <td className="py-2">{o.status}</td>
              <td className="py-2">{o.mfaPolicy}</td>
              <td className="py-2">
                <Link
                  href={`/admin/organizations/${o.id}`}
                  className="text-accent text-xs underline"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
