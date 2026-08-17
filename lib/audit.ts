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
    // R6: audit_logs.organization_id is INT. When a UUID org id is supplied
    // (non-numeric) the write falls back to null rather than a coerced integer;
    // this is non-auth-critical (the write-side org stamp is best-effort) and
    // fail-closed (a null org id never grants access, it only loses attribution).
    const orgIntValue = entry.organization_id
      ? (() => {
          const n = Number(entry.organization_id);
          return Number.isInteger(n) && n > 0 ? n : null;
        })()
      : null;
    await prisma.audit_logs.create({
      data: {
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id ?? null,
        entity_name: entry.entity_name ?? null,
        changes: entry.changes ?? {},
        user_id: entry.user_id,
        organization_id: orgIntValue,
        ip_address: entry.ip_address ?? null,
        user_agent: entry.user_agent ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit entry:", error);
  }
}
