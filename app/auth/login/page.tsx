"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthLoginPage() {
  const router = useRouter();
  const { login, completeMfa, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);

  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mfaToken) {
        const result = await completeMfa(mfaToken, mfaCode, {
          rememberMe,
          trustDevice,
        });
        if (result?.requiresPasswordChange) {
          router.push("/settings/security/password");
          return;
        }
        if (result?.requiresEmailVerification) {
          router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
          return;
        }
        router.push("/dashboard");
        return;
      }

      const result = await login(email, password, { rememberMe });
      if (result?.requiresMfa && result.mfaToken) {
        setMfaToken(result.mfaToken);
        return;
      }
      if (result?.requiresPasswordChange) {
        router.push("/settings/security/password");
        return;
      }
      if (result?.requiresEmailVerification) {
        router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
        return;
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
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
          <h1 className="text-2xl font-bold text-white">
            {mfaToken ? "Two-factor authentication" : "Sign in to OTTO"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!mfaToken ? (
            <>
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
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Authenticator code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white tracking-widest"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="rounded border-white/20"
                />
                Trust this device
              </label>
            </>
          )}

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
            {loading
              ? "Please wait…"
              : mfaToken
                ? "Verify"
                : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          <Link href="/auth/forgot-password" className="underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
