"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CheckEmailInner() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setDevUrl(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Could not resend verification.");
        return;
      }
      setStatus("sent");
      setMessage(
        "If an account exists for that email, a verification link has been sent."
      );
      if (data.verifyUrl) setDevUrl(data.verifyUrl);
    } catch {
      setStatus("error");
      setMessage("Could not resend verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-default">
      <div className="p-8 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/otto-logo.png" alt="OTTO" className="h-12 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Check your email</h1>
          <p className="text-sm text-white/60 mt-2">
            We need to verify your email address before you can use all
            features. Open the link we sent, or request a new one below.
          </p>
        </div>

        <form onSubmit={resend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-accent"
              placeholder="you@example.com"
              required
            />
          </div>

          {status === "error" && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
              {message}
            </div>
          )}
          {status === "sent" && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400">
              {message}
            </div>
          )}
          {devUrl && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/60 break-all">
              Dev link:{" "}
              <a href={devUrl} className="text-accent underline">
                {devUrl}
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Resend verification email"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          <Link href="/auth/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/70">
          Loading…
        </div>
      }
    >
      <CheckEmailInner />
    </Suspense>
  );
}
