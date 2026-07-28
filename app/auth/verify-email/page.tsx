"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [message, setMessage] = useState(
    token ? "Verifying your email…" : "Missing verification token."
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
          return;
        }
        setStatus("success");
        setMessage("Email verified successfully. You can sign in.");
        setTimeout(() => router.push("/auth/login"), 2500);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Verification failed. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-default">
      <div className="p-8 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 w-full max-w-md text-center">
        <img src="/otto-logo.png" alt="OTTO" className="h-12 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Email verification</h1>
        <p
          className={
            status === "error"
              ? "text-danger text-sm"
              : status === "success"
                ? "text-green-400 text-sm"
                : "text-white/70 text-sm"
          }
        >
          {message}
        </p>
        {status === "error" && (
          <div className="mt-6 space-y-2">
            <Link
              href="/auth/check-email"
              className="block text-sm text-accent underline"
            >
              Resend verification
            </Link>
            <Link
              href="/auth/login"
              className="block text-sm text-white/50 underline"
            >
              Back to sign in
            </Link>
          </div>
        )}
        {status === "success" && (
          <Link
            href="/auth/login"
            className="inline-block mt-6 text-sm text-accent underline"
          >
            Continue to sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/70">
          Loading…
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
