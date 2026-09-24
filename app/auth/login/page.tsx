"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthLoginPage() {
  const router = useRouter();
  const { login, completeMfa, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      if (
        (result?.nextStep === "mfa_required" || result?.requiresMfa) &&
        result.mfaToken
      ) {
        setMfaToken(result.mfaToken);
        return;
      }
      if (
        result?.nextStep === "password_reset_required" ||
        result?.requiresPasswordChange
      ) {
        router.push("/settings/security/password");
        return;
      }
      if (
        result?.nextStep === "email_verification_required" ||
        result?.requiresEmailVerification
      ) {
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
    <main className="auth-page">
      <div className="auth-background" aria-hidden="true">
        <img src="/assets/otto-hero-abstract.webp" alt="" />
      </div>
      <div className="auth-overlay" aria-hidden="true" />
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <img src="/otto-logo.svg" alt="OTTO" />
          </div>
          <h1 className="auth-title">
            {mfaToken ? "Two-factor authentication" : "Sign in"}
          </h1>

        <form onSubmit={handleSubmit} className="auth-form space-y-4">
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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-accent"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-white/50 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
            className="auth-submit"
          >
            {loading
              ? "Please wait…"
              : mfaToken
                ? "Verify"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-links flex items-center justify-center gap-3 text-sm text-white/50 mt-6">
          <Link href="/auth/forgot-password" className="underline">
            Forgot password?
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/auth/register" className="underline text-white/70">
            Create account
          </Link>
        </div>
      </div>
    </div>
    </main>
  );
}
