"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.details?.join?.(" ") || "Reset failed");
        return;
      }
      router.push("/auth/login?reset=1");
    } catch {
      setError("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-danger">
        Missing reset token.{" "}
        <Link href="/auth/forgot-password" className="underline ml-2">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-default">
      <div className="p-8 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 w-full max-w-md">
        <h1 className="text-xl font-bold text-white mb-6 text-center">
          Choose a new password
        </h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
            placeholder="New password"
            autoComplete="new-password"
            required
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
            placeholder="Confirm password"
            autoComplete="new-password"
            required
          />
          {error && <div className="text-sm text-danger">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/70">
          Loading…
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
