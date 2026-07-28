"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDevUrl(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Request failed");
        return;
      }
      setStatus("sent");
      setMessage(
        "If an account exists for that email, a reset link has been sent."
      );
      if (data.resetUrl) setDevUrl(data.resetUrl);
    } catch {
      setStatus("error");
      setMessage("Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-default">
      <div className="p-8 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 w-full max-w-md">
        <h1 className="text-xl font-bold text-white mb-2 text-center">
          Reset password
        </h1>
        <p className="text-sm text-white/60 mb-6 text-center">
          Enter your email and we will send a reset link.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
            placeholder="you@example.com"
            required
          />
          {status === "error" && (
            <div className="text-sm text-danger">{message}</div>
          )}
          {status === "sent" && (
            <div className="text-sm text-green-400">{message}</div>
          )}
          {devUrl && (
            <a href={devUrl} className="block text-xs text-accent break-all">
              {devUrl}
            </a>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
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
