"use client";

import { useOrg } from "@/contexts/OrgContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentOrgId } = useOrg();

  return (
    <ProtectedRoute>
      {/*
       * Tenant-scoped dashboard pages contain client-side data loaders. A
       * Next.js router.refresh() does not remount those client components, so
       * their initial fetch can otherwise remain pinned to the previous org.
       * Keying the dashboard shell by the canonical org forces a clean mount
       * after an organization switch and therefore re-runs every page loader.
       */}
      <MainLayout key={currentOrgId || "no-organization"}>
        {children}
      </MainLayout>
    </ProtectedRoute>
  );
}
