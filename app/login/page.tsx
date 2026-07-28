"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /login → /auth/login */
export default function LegacyLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/login");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-white/70">
      Redirecting to sign in…
    </div>
  );
}
