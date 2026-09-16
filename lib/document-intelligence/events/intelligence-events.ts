import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export type IntelligenceAuditAction =
  | "extraction.started"
  | "extraction.completed"
  | "extraction.failed"
  | "verification.begun";

export type IntelligenceActivityAction =
  | "Document Extracted"
  | "Extraction Failed"
  | "Verification Pending";

export async function emitIntelligenceAudit(params: {
  action: IntelligenceAuditAction;
  organizationId: string;
  userId: number;
  documentId: string;
  contractId?: number | null;
  jobId?: string;
  extractionId?: string;
  entityName?: string;
  changes?: Record<string, unknown>;
}): Promise<void> {
  await recordAudit({
    action: params.action,
    entity_type: "document_extraction",
    entity_id: params.contractId ?? undefined,
    entity_name: params.entityName ?? params.documentId,
    changes: {
      documentId: params.documentId,
      jobId: params.jobId,
      extractionId: params.extractionId,
      ...params.changes,
    },
    user_id: params.userId,
    organization_id: params.organizationId,
  });
}

export async function emitIntelligenceActivity(params: {
  action: IntelligenceActivityAction;
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
    logger.error("document-intelligence.activity", "Failed to record activity", {
      action: params.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
