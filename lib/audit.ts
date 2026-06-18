import { prisma } from "@/lib/prisma";

export interface AuditEntry {
  action: string;
  entity_type: string;
  entity_id?: number;
  entity_name?: string;
  changes?: Record<string, any>;
  user_id: number;
  organization_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.audit_logs.create({
      data: {
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id ?? null,
        entity_name: entry.entity_name ?? null,
        changes: entry.changes ?? {},
        user_id: entry.user_id,
        organization_id: entry.organization_id ? parseInt(entry.organization_id) || null : null,
        ip_address: entry.ip_address ?? null,
        user_agent: entry.user_agent ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit entry:", error);
  }
}

export async function getAuditLogs(params: {
  organization_id?: string;
  user_id?: number;
  action?: string;
  entity_type?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (params.organization_id) where.organization_id = parseInt(params.organization_id) || params.organization_id;
  if (params.user_id) where.user_id = params.user_id;
  if (params.action) where.action = params.action;
  if (params.entity_type) where.entity_type = params.entity_type;

  const [items, total] = await Promise.all([
    prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { users: { select: { id: true, name: true, email: true } } },
    }),
    prisma.audit_logs.count({ where }),
  ]);

  return { items, total };
}
