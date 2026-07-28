"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function SecuritySettingsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const mRes = await fetch("/api/auth/mfa/status", {
      credentials: "include",
    });
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
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="text-sm text-white/60">
          Change password, view policy and expiration.
        </p>
        <a
          href="/settings/security/password"
          className="inline-block px-4 py-2 rounded-lg bg-accent font-medium"
        >
          Manage password
        </a>
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
        <h2 className="text-lg font-semibold">Sessions & devices</h2>
        <p className="text-sm text-white/60">
          View active sessions, devices, and sign out remotely.
        </p>
        <a
          href="/settings/security/sessions"
          className="inline-block px-4 py-2 rounded-lg bg-accent font-medium"
        >
          Manage sessions
        </a>
      </section>
    </div>
  );
}
