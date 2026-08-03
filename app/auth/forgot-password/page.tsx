"use client";

import { useState } from "react";
import Link from "next/link";

type Delivery = "resend" | "log" | "none" | string;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDevUrl(null);
    setDelivery(null);
    setEmailConfigured(null);
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
      setDelivery(typeof data.delivery === "string" ? data.delivery : null);
      setEmailConfigured(
        typeof data.emailConfigured === "boolean" ? data.emailConfigured : null
      );

      if (data.emailConfigured) {
        setMessage(
          "If an account exists for that email, a reset link has been sent. Check your inbox and spam folder."
        );
      } else {
        setMessage(
          "If an account exists, a reset token was created. Outbound email is not configured on this deployment, so no message was emailed. An administrator can retrieve the link from server logs or use the password reset utility."
        );
      }

      // Dev / IAM_EXPOSE_AUTH_LINKS only
      if (typeof data.resetUrl === "string" && data.resetUrl) {
        setDevUrl(data.resetUrl);
      }
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
          Enter the email on your OTTO account (IAM identity). We will send a
          reset link when email delivery is configured.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          {status === "error" && (
            <div className="text-sm text-danger">{message}</div>
          )}
          {status === "sent" && (
            <div className="space-y-2">
              <div
                className={`text-sm ${
                  emailConfigured === false ? "text-amber-300" : "text-green-400"
                }`}
              >
                {message}
              </div>
              {emailConfigured === false && (
                <div className="text-xs text-white/50 leading-relaxed border border-white/10 rounded-lg p-3">
                  <p className="font-medium text-white/70 mb-1">
                    Why no email?
                  </p>
                  <p>
                    Set <code className="text-white/80">RESEND_API_KEY</code> and{" "}
                    <code className="text-white/80">EMAIL_FROM</code> in Vercel,
                    and set <code className="text-white/80">NEXTAUTH_URL</code>{" "}
                    to your public site URL. Until then, use:
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap text-[11px] text-white/60">
                    {`npx tsx scripts/reset-iam-password.ts \\
  --email you@example.com \\
  --password 'YourNew-Strong-Pass1!'`}
                  </pre>
                </div>
              )}
              {delivery === "log" && emailConfigured !== false && (
                <p className="text-xs text-white/40">
                  Delivery channel: application logs (ops).
                </p>
              )}
            </div>
          )}
          {devUrl && (
            <div className="space-y-1">
              <p className="text-xs text-white/50">
                Reset link (exposed only in development / when
                IAM_EXPOSE_AUTH_LINKS is enabled):
              </p>
              <a href={devUrl} className="block text-xs text-accent break-all">
                {devUrl}
              </a>
            </div>
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
