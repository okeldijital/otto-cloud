"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentOrgId = session?.user?.tenant_id || null;

  const refreshOrgs = useCallback(async () => {
    try {
      const res = await api.get("/organizations");
      const orgs = Array.isArray(res.data) ? res.data : [];
      setOrganizations(orgs);
      const active = orgs.find(o => o.id === currentOrgId) || orgs[0] || null;
      setCurrentOrg(active);
    } catch {
      setOrganizations([]);
      setCurrentOrg(null);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    if (session?.user) {
      refreshOrgs();
    } else {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
    }
  }, [session, currentOrgId, refreshOrgs]);

  const switchOrg = async (orgId) => {
    try {
      await api.post("/organizations/switch", { tenant_id: orgId });
      const org = organizations.find(o => o.id === orgId) || null;
      setCurrentOrg(org);
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
      switchOrg,
      refreshOrgs,
      currentOrgId,
    }}>
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
