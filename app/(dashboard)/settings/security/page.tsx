"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

type SessionRow = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActivityAt: string;
  expiresAt: string;
  current: boolean;
  active: boolean;
  rememberMe: boolean;
};

export default function SecuritySettingsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const load = async () => {
    const [sRes, mRes] = await Promise.all([
      fetch("/api/auth/sessions", { credentials: "include" }),
      fetch("/api/auth/mfa/status", { credentials: "include" }),
    ]);
    if (sRes.ok) {
      const data = await sRes.json();
      setSessions(data.sessions || []);
    }
    if (mRes.ok) {
      const data = await mRes.json();
      setMfaEnabled(!!data.enabled);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated) load();
  }, [isAuthenticated, authLoading, router]);

  const revoke = async (id: string) => {
    await fetch(`/api/auth/sessions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  };

  const revokeOthers = async () => {
    await fetch("/api/auth/sessions", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: false }),
    });
    await load();
  };

  const beginMfa = async () => {
    setError("");
    const res = await fetch("/api/auth/mfa/enroll", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not start MFA enrollment");
      return;
    }
    setOtpauthUrl(data.otpauthUrl);
    setSecret(data.secret);
  };

  const confirmMfa = async () => {
    setError("");
    const res = await fetch("/api/auth/mfa/enroll/confirm", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: mfaCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Invalid code");
      return;
    }
    setRecoveryCodes(data.recoveryCodes || []);
    setOtpauthUrl(null);
    setSecret(null);
    setMfaCode("");
    setMfaEnabled(true);
    setMessage("MFA enabled. Store recovery codes securely.");
  };

  const disableMfa = async () => {
    setError("");
    const res = await fetch("/api/auth/mfa/disable", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: mfaCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not disable MFA");
      return;
    }
    setMfaEnabled(false);
    setMfaCode("");
    setMessage("MFA disabled");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/auth/password/change", {
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
    setMessage("Password updated. Other sessions were signed out.");
  };

  if (authLoading) {
    return (
      <div className="p-8 text-white/70">Loading…</div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10 text-white">
      <h1 className="text-2xl font-bold">Security</h1>
      {message && <p className="text-green-400 text-sm">{message}</p>}
      {error && <p className="text-danger text-sm">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="space-y-3 max-w-md">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-accent font-medium"
          >
            Update password
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Two-factor authentication</h2>
        <p className="text-sm text-white/60">
          Status: {mfaEnabled ? "Enabled" : "Disabled"}
        </p>
        {!mfaEnabled && !otpauthUrl && (
          <button
            onClick={beginMfa}
            className="px-4 py-2 rounded-lg bg-accent font-medium"
          >
            Enable authenticator
          </button>
        )}
        {otpauthUrl && (
          <div className="space-y-2 text-sm">
            <p className="text-white/70 break-all">Add to app: {otpauthUrl}</p>
            <p className="text-white/50">Secret: {secret}</p>
            <input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="6-digit code"
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            />
            <button
              onClick={confirmMfa}
              className="ml-2 px-4 py-2 rounded-lg bg-accent"
            >
              Confirm
            </button>
          </div>
        )}
        {mfaEnabled && (
          <div className="flex gap-2 items-center">
            <input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="Code to disable"
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            />
            <button
              onClick={disableMfa}
              className="px-4 py-2 rounded-lg border border-white/20"
            >
              Disable MFA
            </button>
          </div>
        )}
        {recoveryCodes && (
          <div className="p-3 bg-white/5 rounded-lg text-xs font-mono">
            {recoveryCodes.join(" · ")}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active sessions</h2>
          <button
            onClick={revokeOthers}
            className="text-sm text-white/60 underline"
          >
            Sign out other sessions
          </button>
        </div>
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 text-sm"
            >
              <div>
                <div>
                  {s.current ? "This device" : s.userAgent || "Unknown device"}
                  {s.rememberMe ? " · remembered" : ""}
                </div>
                <div className="text-white/40 text-xs">
                  {s.ipAddress || "—"} · last active{" "}
                  {new Date(s.lastActivityAt).toLocaleString()}
                </div>
              </div>
              {!s.current && s.active && (
                <button
                  onClick={() => revoke(s.id)}
                  className="text-danger text-xs underline"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
