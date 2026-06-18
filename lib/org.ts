export function getOrgIds(session: any): {
  uuidOrgId: string;
  intOrgId: number;
  tenantId: string | null;
} {
  const user = session?.user as any;
  const uuidOrgId = user?.organization_id || "00000000-0000-0000-0000-000000000001";
  const intOrgId = 1;
  const tenantId = user?.tenant_id || null;
  return { uuidOrgId, intOrgId, tenantId };
}

export function getOrgFromSession(session: any): {
  tenantId: string | null;
  orgId: string;
  userId: number | null;
  isSuperuser: boolean;
} {
  const user = session?.user as any;
  return {
    tenantId: user?.tenant_id || null,
    orgId: user?.organization_id || "00000000-0000-0000-0000-000000000001",
    userId: user?.id ? parseInt(user.id) : null,
    isSuperuser: !!user?.is_superuser,
  };
}

export function canManageOrg(session: any, targetTenantId: string): boolean {
  const user = session?.user as any;
  if (user?.is_superuser) return true;
  return user?.tenant_id === targetTenantId;
}
