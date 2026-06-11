export function getOrgIds(session: any): { uuidOrgId: string; intOrgId: number } {
  const uuidOrgId = (session?.user as any)?.organization_id || "00000000-0000-0000-0000-000000000001";
  const intOrgId = 1;
  return { uuidOrgId, intOrgId };
}
