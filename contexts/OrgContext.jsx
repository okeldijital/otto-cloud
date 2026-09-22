"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const OrgContext = createContext({
  organizations: [],
  currentOrg: null,
  loading: true,
  error: null,
  switchOrg: async () => false,
  refreshOrgs: async () => {},
  currentOrgId: null,
});

export function OrgProvider({ children }) {
  const { isAuthenticated, refreshUser } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshOrgs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/organizations", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data?.error || data?.message || `Unable to load organizations (${res.status})`;
        throw new Error(`${res.status}: ${message}`);
      }

      const orgs = (data.organizations || []).map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        status: o.status,
        role: o.role,
        isDefault: o.isDefault,
        isOwner: o.isOwner,
        membershipStatus: o.membershipStatus,
      }));
      const nextActiveId = data.activeOrganizationId || activeOrgId || orgs.find((o) => o.isDefault)?.id || orgs[0]?.id || null;

      setOrganizations(orgs);
      setActiveOrgId(nextActiveId);
      setCurrentOrg(orgs.find((o) => o.id === nextActiveId) || null);
    } catch (err) {
      setOrganizations([]);
      setCurrentOrg(null);
      setActiveOrgId(null);
      setError(err instanceof Error ? err.message : "Unable to load organizations");
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    if (isAuthenticated) refreshOrgs();
    else {
      setOrganizations([]);
      setCurrentOrg(null);
      setActiveOrgId(null);
      setError(null);
      setLoading(false);
    }
  }, [isAuthenticated, refreshOrgs]);

  const switchOrg = async (orgId) => {
    if (!orgId || !organizations.some((o) => o.id === orgId)) return false;
    try {
      const res = await fetch("/api/auth/organizations/switch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      if (!res.ok) return false;
      setActiveOrgId(orgId);
      setCurrentOrg(organizations.find((o) => o.id === orgId) || null);
      await refreshUser?.();
      await refreshOrgs();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <OrgContext.Provider value={{
      organizations,
      currentOrg,
      loading,
      error,
      switchOrg,
      refreshOrgs,
      currentOrgId: activeOrgId,
    }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
