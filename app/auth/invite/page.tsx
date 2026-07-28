"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function InviteInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/invitations/accept", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Accept failed");
        return;
      }
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-danger">
        Missing invitation token
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-default">
      <form
        onSubmit={accept}
        className="p-8 bg-black/50 rounded-xl border border-white/10 w-full max-w-md space-y-4"
      >
        <h1 className="text-xl font-bold text-white text-center">
          Accept invitation
        </h1>
        <p className="text-sm text-white/50 text-center">
          Create a password if you are new to OTTO, or leave blank if already
          signed in.
        </p>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name (optional)"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (if new account)"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-accent text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "Accepting…" : "Accept invitation"}
        </button>
        <p className="text-center text-xs text-white/40">
          <Link href="/auth/login" className="underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/70">
          Loading…
        </div>
      }
    >
      <InviteInner />
    </Suspense>
  );
}
