"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MfaStatus = {
  enabled: boolean;
  enrolledAt: string | null;
  lastUsedAt: string | null;
  recoveryCodesRemaining: number;
  trustedDeviceCount: number;
  policy: {
    orgMode: string;
    required: boolean;
    recoveryCodeCount: number;
    trustedDeviceDays: number;
  };
};

type TrustedDevice = {
  id: string;
  label: string | null;
  trustedUntil: string | null;
  lastUsedAt: string | null;
  expiresAt: string;
  userAgent: string | null;
};

export default function MfaSettingsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"idle" | "enroll" | "confirm">("idle");

  const load = async () => {
    const [s, d] = await Promise.all([
      fetch("/api/auth/mfa/status", { credentials: "include" }),
      fetch("/api/auth/mfa/trusted-devices", { credentials: "include" }),
    ]);
    if (s.ok) setStatus(await s.json());
    if (d.ok) {
      const data = await d.json();
      setDevices(data.devices || []);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated) load();
  }, [isAuthenticated, authLoading, router]);

  const startEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/mfa/enroll", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Enrollment failed");
      return;
    }
    setOtpauthUrl(data.otpauthUrl);
    setSecret(data.secret);
    setStep("confirm");
    setPassword("");
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Invalid code");
      return;
    }
    setRecoveryCodes(data.recoveryCodes || []);
    setOtpauthUrl(null);
    setSecret(null);
    setCode("");
    setStep("idle");
    setMessage("MFA enabled. Save your recovery codes now.");
    await load();
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/mfa/disable", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: password, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Disable failed");
      return;
    }
    setPassword("");
    setCode("");
    setMessage("MFA disabled");
    await load();
  };

  const regenCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/mfa/recovery/regenerate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: password, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Regenerate failed");
      return;
    }
    setRecoveryCodes(data.recoveryCodes || []);
    setPassword("");
    setCode("");
    setMessage("Recovery codes regenerated");
    await load();
  };

  const revokeDevice = async (id: string) => {
    await fetch(`/api/auth/mfa/trusted-devices/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  };

  if (authLoading || !status) {
    return <div className="p-8 text-white/70">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Two-factor authentication</h1>
        <Link href="/settings/security" className="text-sm text-white/50 underline">
          Security
        </Link>
      </div>

      {message && <p className="text-sm text-green-400">{message}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="text-sm text-white/70 space-y-1">
        <p>
          Status:{" "}
          <span className="text-white">
            {status.enabled ? "Enabled" : "Disabled"}
          </span>
        </p>
        <p>Enrolled: {status.enrolledAt ? new Date(status.enrolledAt).toLocaleString() : "—"}</p>
        <p>Last used: {status.lastUsedAt ? new Date(status.lastUsedAt).toLocaleString() : "—"}</p>
        <p>Recovery codes remaining: {status.recoveryCodesRemaining}</p>
        <p>
          Org policy: {status.policy.orgMode}
          {status.policy.required ? " (required)" : ""}
        </p>
      </section>

      {recoveryCodes && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
          <p className="text-amber-200 text-sm font-medium">
            Save these codes now — they will not be shown again.
          </p>
          <ul className="font-mono text-xs space-y-1">
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <button
            type="button"
            className="text-xs underline"
            onClick={() =>
              navigator.clipboard.writeText(recoveryCodes.join("\n"))
            }
          >
            Copy all
          </button>
        </div>
      )}

      {!status.enabled && step === "idle" && (
        <form onSubmit={startEnroll} className="space-y-3">
          <h2 className="font-semibold">Enable authenticator</h2>
          <input
            type="password"
            placeholder="Current password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            required
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-accent">
            Start enrollment
          </button>
        </form>
      )}

      {step === "confirm" && otpauthUrl && (
        <form onSubmit={confirmEnroll} className="space-y-3">
          <h2 className="font-semibold">Scan and confirm</h2>
          <p className="text-xs text-white/50 break-all">otpauth: {otpauthUrl}</p>
          <p className="text-xs text-white/40">Secret: {secret}</p>
          <p className="text-sm text-white/60">
            Scan with Google Authenticator, Authy, 1Password, Bitwarden, etc.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            required
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-accent">
            Confirm & enable
          </button>
        </form>
      )}

      {status.enabled && (
        <>
          <form onSubmit={disable} className="space-y-3">
            <h2 className="font-semibold">Disable MFA</h2>
            <input
              type="password"
              placeholder="Current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
              required
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="TOTP or recovery code"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-white/20"
            >
              Disable MFA
            </button>
          </form>

          <form onSubmit={regenCodes} className="space-y-3">
            <h2 className="font-semibold">Regenerate recovery codes</h2>
            <p className="text-xs text-white/50">
              Requires password + current TOTP. Old codes are invalidated.
            </p>
            <button type="submit" className="px-4 py-2 rounded-lg bg-accent">
              Regenerate (uses password & code fields above)
            </button>
          </form>
        </>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Trusted devices ({devices.length})</h2>
        <ul className="space-y-2 text-sm">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex justify-between p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div>
                <div>{d.label || d.userAgent || "Device"}</div>
                <div className="text-xs text-white/40">
                  Until {new Date(d.trustedUntil || d.expiresAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => revokeDevice(d.id)}
                className="text-xs text-danger underline"
              >
                Remove
              </button>
            </li>
          ))}
          {!devices.length && (
            <li className="text-white/40 text-sm">No trusted devices</li>
          )}
        </ul>
      </section>
    </div>
  );
}
