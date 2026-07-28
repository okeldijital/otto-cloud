import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Platform document events.
 * Storage / document lifecycle only — never mention business modules (Contracts, Releases, …).
 */

export type PlatformDocumentEvent =
  | "DocumentUploaded"
  | "DocumentDeleted"
  | "DocumentRestored";

const AUDIT_ACTION: Record<PlatformDocumentEvent, string> = {
  DocumentUploaded: "document.uploaded",
  DocumentDeleted: "document.deleted",
  DocumentRestored: "document.restored",
};

const ACTIVITY_ACTION: Record<PlatformDocumentEvent, string> = {
  DocumentUploaded: "Document Uploaded",
  DocumentDeleted: "Document Removed",
  DocumentRestored: "Document Restored",
};

export async function emitPlatformDocumentEvent(params: {
  event: PlatformDocumentEvent;
  organizationId: string;
  userId: number;
  documentId: string;
  entityName?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await recordAudit({
    action: AUDIT_ACTION[params.event],
    entity_type: "document",
    entity_id: undefined,
    entity_name: params.entityName ?? params.documentId,
    changes: {
      documentId: params.documentId,
      platformEvent: params.event,
      ...params.changes,
    },
    user_id: params.userId,
    organization_id: params.organizationId,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  });

  // activities.entity_id is Int — store 0 and identify via entity_name / audit changes.
  try {
    await prisma.activities.create({
      data: {
        user_id: params.userId,
        action: ACTIVITY_ACTION[params.event],
        entity_type: "document",
        entity_id: 0,
        entity_name: params.entityName ?? params.documentId,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error("documents.events", "Failed to record platform activity", {
      event: params.event,
      documentId: params.documentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
