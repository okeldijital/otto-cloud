"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

/**
 * Client route guard — IAM AuthContext only (A.4.5).
 * adminOnly checks permissions, not legacy role strings alone.
 */
export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  const isAdmin =
    user?.is_superuser ||
    user?.isSuperAdmin ||
    (Array.isArray(user?.permissions) &&
      (user.permissions.includes("security.manage") ||
        user.permissions.includes("users.manage") ||
        user.permissions.includes("organizations.manage") ||
        user.permissions.includes("platform.admin"))) ||
    user?.role === "org_admin" ||
    user?.role === "platform_admin" ||
    user?.role === "admin";

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-app-default gap-6 font-sans">
        <div className="w-[120px] h-auto" />
        <div className="flex flex-col items-center gap-2">
          <div className="text-base text-[#1e293b] font-semibold animate-pulse">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (adminOnly && !isAdmin) {
    router.push("/dashboard");
    return null;
  }

  return children;
};
