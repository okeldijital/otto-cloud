"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function SecuritySettingsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mfaEnabled, setMfaEnabled] = useState(false);
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
        <a
          href="/settings/security/mfa"
          className="inline-block px-4 py-2 rounded-lg bg-accent font-medium"
        >
          Manage MFA
        </a>
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
