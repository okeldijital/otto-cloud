"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SessionRow = {
  id: string;
  device: {
    name: string | null;
    browser: string | null;
    os: string | null;
    deviceType: string | null;
  };
  ipAddress: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  current: boolean;
  trusted: boolean;
  active: boolean;
  rememberMe: boolean;
  riskLevel: string;
};

export default function SessionsSecurityPage() {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const load = async () => {
    const res = await fetch("/api/auth/sessions", { credentials: "include" });
    if (!res.ok) {
      setError("Could not load sessions");
      return;
    }
    const data = await res.json();
    setSessions(data.sessions || []);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated) load();
  }, [isAuthenticated, authLoading, router]);

  const revoke = async (id: string, isCurrent: boolean) => {
    setError("");
    setMessage("");
    if (isCurrent && !window.confirm("Sign out this device?")) return;
    const res = await fetch(`/api/auth/sessions/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmCurrent: isCurrent }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Revoke failed");
      return;
    }
    if (data.revokedCurrent) {
      await logout();
      return;
    }
    setMessage("Session revoked");
    await load();
  };

  const logoutAll = async () => {
    if (!window.confirm("Sign out all other devices?")) return;
    setError("");
    const res = await fetch("/api/auth/logout-all", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceAll: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Logout all failed");
      return;
    }
    setMessage(`Signed out ${data.revoked} other session(s)`);
    await load();
  };

  const openDetail = async (id: string) => {
    setSelected(id);
    const res = await fetch(`/api/auth/sessions/${id}`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setDetail(data.session);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-white/70">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Link
          href="/settings/security"
          className="text-sm text-white/50 underline"
        >
          Security
        </Link>
      </div>

      {message && <p className="text-sm text-green-400">{message}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <button
          onClick={logoutAll}
          className="text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/5"
        >
          Sign out all other devices
        </button>
      </div>

      <ul className="space-y-2">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2"
          >
            <div className="flex justify-between gap-4">
              <div>
                <div className="font-medium">
                  {s.current ? "This device · " : ""}
                  {s.device?.name || "Unknown device"}
                </div>
                <div className="text-xs text-white/50">
                  {[s.device?.browser, s.device?.os, s.device?.deviceType]
                    .filter(Boolean)
                    .join(" · ")}
                  {s.rememberMe ? " · remembered" : ""}
                  {s.trusted ? " · trusted" : ""}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  IP {s.ipAddress || "—"} · last active{" "}
                  {new Date(s.lastActivityAt).toLocaleString()} · expires{" "}
                  {new Date(s.expiresAt).toLocaleString()}
                </div>
                <div className="text-xs text-white/30">
                  Risk: {s.riskLevel} · created{" "}
                  {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button
                  onClick={() => openDetail(s.id)}
                  className="text-xs text-white/60 underline"
                >
                  Details
                </button>
                {s.active && (
                  <button
                    onClick={() => revoke(s.id, s.current)}
                    className="text-xs text-danger underline"
                  >
                    {s.current ? "Sign out" : "Revoke"}
                  </button>
                )}
                {!s.active && (
                  <span className="text-xs text-white/30">Inactive</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {selected && detail && (
        <div className="p-4 rounded-xl border border-white/10 bg-black/40 text-xs space-y-2">
          <div className="flex justify-between">
            <h2 className="font-semibold text-sm">Session detail</h2>
            <button
              onClick={() => {
                setSelected(null);
                setDetail(null);
              }}
              className="text-white/50"
            >
              Close
            </button>
          </div>
          <pre className="overflow-auto max-h-80 text-white/60 whitespace-pre-wrap">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
