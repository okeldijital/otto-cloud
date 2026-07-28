"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

const OrgContext = createContext({
  organizations: [],
  currentOrg: null,
  loading: true,
  switchOrg: async () => {},
  refreshOrgs: async () => {},
  currentOrgId: null,
});

export function OrgProvider({ children }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentOrgId =
    user?.organization?.id || user?.organization_id || null;

  const refreshOrgs = useCallback(async () => {
    try {
      // Prefer IAM org list
      const iamRes = await fetch("/api/auth/organizations", {
        credentials: "include",
      });
      if (iamRes.ok) {
        const data = await iamRes.json();
        const orgs = (data.organizations || []).map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          role: o.role,
          isDefault: o.isDefault,
        }));
        setOrganizations(orgs);
        const activeId = data.activeOrganizationId || currentOrgId;
        const active =
          orgs.find((o) => o.id === activeId) || orgs[0] || null;
        setCurrentOrg(active);
        return;
      }

      // Fallback legacy organizations API
      const res = await api.get("/organizations");
      const orgs = Array.isArray(res.data) ? res.data : [];
      setOrganizations(orgs);
      const active = orgs.find((o) => o.id === currentOrgId) || orgs[0] || null;
      setCurrentOrg(active);
    } catch {
      setOrganizations([]);
      setCurrentOrg(null);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshOrgs();
    } else {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
    }
  }, [isAuthenticated, currentOrgId, refreshOrgs]);

  const switchOrg = async (orgId) => {
    try {
      const res = await fetch("/api/auth/organizations/switch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      if (!res.ok) {
        // Legacy fallback
        await api.post("/organizations/switch", { tenant_id: orgId });
      }
      const org = organizations.find((o) => o.id === orgId) || null;
      setCurrentOrg(org);
      await refreshUser?.();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        loading,
        switchOrg,
        refreshOrgs,
        currentOrgId: currentOrg?.id || currentOrgId,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    return {
      organizations: [],
      currentOrg: null,
      loading: false,
      switchOrg: async () => false,
      refreshOrgs: async () => {},
      currentOrgId: null,
    };
  }
  return ctx;
}
