"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Role = {
  key: string;
  name: string;
  isSystem: boolean;
  permissionCount: number;
  memberCount: number;
  permissions: string[];
};

export default function OrgRolesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated) {
      fetch("/api/auth/organizations/roles", { credentials: "include" })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) setError(data.error || "Failed to load roles");
          else setRoles(data.roles || []);
        })
        .catch(() => setError("Failed to load roles"));
    }
  }, [isAuthenticated, authLoading, router]);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 text-white">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Roles & permissions</h1>
        <Link href="/settings/organization" className="text-sm text-white/50 underline">
          Organization
        </Link>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="space-y-3">
        {roles.map((r) => (
          <li
            key={r.key}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="font-medium">
              {r.name}{" "}
              <span className="text-xs text-white/40">({r.key})</span>
              {r.isSystem ? " · system" : ""}
            </div>
            <div className="text-xs text-white/50 mt-1">
              {r.memberCount} members · {r.permissionCount} permissions
            </div>
            <div className="text-xs text-white/30 mt-2 font-mono break-all">
              {r.permissions.slice(0, 12).join(", ")}
              {r.permissions.length > 12 ? "…" : ""}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
