import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export type VerificationAuditAction =
  | "field.accepted"
  | "field.edited"
  | "field.rejected"
  | "field.reset"
  | "verification.completed"
  | "verification.reopened"
  | "verification.bulk";

export type VerificationActivityAction =
  | "Verification Started"
  | "Verification Completed"
  | "Verification Updated";

export async function emitVerificationAudit(params: {
  action: VerificationAuditAction;
  organizationId: string;
  userId: number;
  documentId: string;
  contractId?: number | null;
  extractionId?: string;
  sessionId?: string;
  fieldKey?: string;
  entityName?: string;
  changes?: Record<string, unknown>;
}): Promise<void> {
  await recordAudit({
    action: params.action,
    entity_type: "verification",
    entity_id: params.contractId ?? undefined,
    entity_name: params.entityName ?? params.fieldKey ?? params.documentId,
    changes: {
      documentId: params.documentId,
      extractionId: params.extractionId,
      sessionId: params.sessionId,
      fieldKey: params.fieldKey,
      ...params.changes,
    },
    user_id: params.userId,
    organization_id: params.organizationId,
  });
}

export async function emitVerificationActivity(params: {
  action: VerificationActivityAction;
  userId: number;
  contractId?: number | null;
  entityName?: string;
}): Promise<void> {
  try {
    await prisma.activities.create({
      data: {
        user_id: params.userId,
        action: params.action,
        entity_type: params.contractId != null ? "contract" : "document",
        entity_id: params.contractId ?? 0,
        entity_name: params.entityName ?? null,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error("verification.activity", "Failed to record activity", {
      action: params.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
