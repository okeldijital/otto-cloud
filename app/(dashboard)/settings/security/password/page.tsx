"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PasswordStatus = {
  hasPassword: boolean;
  lastChangedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  mustChangePassword: boolean;
  mustChangePasswordReason: string | null;
  sessionVersion: number;
  policy: {
    minimumLength: number;
    maximumLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    historyDepth: number;
    maximumAgeDays: number;
  };
};

export default function PasswordSecurityPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<PasswordStatus | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch("/api/auth/password/status", {
      credentials: "include",
    });
    if (res.ok) setStatus(await res.json());
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated) load();
  }, [isAuthenticated, authLoading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error ||
            (Array.isArray(data.details) ? data.details.join(" ") : "Failed")
        );
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setMessage("Password updated. Other sessions were signed out.");
      await load();
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !status) {
    return <div className="p-8 text-white/70">Loading…</div>;
  }

  const p = status.policy;

  return (
    <div className="p-8 max-w-xl mx-auto space-y-8 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Password</h1>
        <Link
          href="/settings/security"
          className="text-sm text-white/50 underline"
        >
          Security overview
        </Link>
      </div>

      {status.mustChangePassword && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm">
          You must change your password
          {status.mustChangePasswordReason
            ? ` (${status.mustChangePasswordReason})`
            : ""}
          before continuing.
        </div>
      )}

      <section className="space-y-2 text-sm text-white/70">
        <h2 className="text-lg font-semibold text-white">Status</h2>
        <p>
          Last changed:{" "}
          {status.lastChangedAt
            ? new Date(status.lastChangedAt).toLocaleString()
            : "—"}
        </p>
        <p>
          Expiration:{" "}
          {status.expiresAt
            ? `${new Date(status.expiresAt).toLocaleDateString()}${
                status.expired ? " (expired)" : ""
              }`
            : "Not enabled"}
        </p>
        <p>Session version: {status.sessionVersion}</p>
      </section>

      <section className="space-y-2 text-sm text-white/70">
        <h2 className="text-lg font-semibold text-white">Policy</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Length: {p.minimumLength}–{p.maximumLength} characters
          </li>
          {p.requireUppercase && <li>Uppercase letter required</li>}
          {p.requireLowercase && <li>Lowercase letter required</li>}
          {p.requireNumbers && <li>Number required</li>}
          {p.requireSymbols && <li>Symbol required</li>}
          <li>Cannot reuse last {p.historyDepth} passwords</li>
          {p.maximumAgeDays > 0 && (
            <li>Expires every {p.maximumAgeDays} days</li>
          )}
        </ul>
      </section>

      <form onSubmit={submit} className="space-y-3">
        <h2 className="text-lg font-semibold">Change password</h2>
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          autoComplete="current-password"
          required
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          autoComplete="new-password"
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          autoComplete="new-password"
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {message && <p className="text-sm text-green-400">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-accent font-medium disabled:opacity-50"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
