"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password, { rememberMe });
      if (result?.requiresEmailVerification) {
        router.push(
          `/auth/check-email?email=${encodeURIComponent(email)}`
        );
        return;
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-default">
      <div className="p-8 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/otto-logo.png" alt="OTTO" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Sign in to OTTO</h1>
          <p className="text-sm text-white/50 mt-2">
            Secure platform authentication
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-accent"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-white/20"
            />
            Remember me
          </label>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-white/40 mt-6">
          Legacy path still available at{" "}
          <Link href="/login" className="text-white/60 underline">
            /login
          </Link>{" "}
          during migration.
        </p>
      </div>
    </div>
  );
}
