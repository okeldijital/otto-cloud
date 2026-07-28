import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { publishPlatformEvent } from "@/lib/platform/publish";

/**
 * Contract-domain events for document relationships.
 * Platform storage events live in lib/documents/events.
 */

export type ContractDocumentDomainEvent =
  | "ContractDocumentLinked"
  | "ContractDocumentUnlinked";

const AUDIT_ACTION: Record<ContractDocumentDomainEvent, string> = {
  ContractDocumentLinked: "document.linked",
  ContractDocumentUnlinked: "document.unlinked",
};

export async function emitContractDocumentEvent(params: {
  event: ContractDocumentDomainEvent;
  organizationId: string;
  userId: number;
  contractId: number;
  documentId: string;
  relationshipId?: string;
  entityName?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await recordAudit({
    action: AUDIT_ACTION[params.event],
    entity_type: "document",
    entity_id: params.contractId,
    entity_name: params.entityName ?? params.documentId,
    changes: {
      documentId: params.documentId,
      relationshipId: params.relationshipId,
      contractId: params.contractId,
      contractEvent: params.event,
      ...params.changes,
    },
    user_id: params.userId,
    organization_id: params.organizationId,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  });

  const activityAction =
    params.event === "ContractDocumentLinked"
      ? "Document Uploaded"
      : "Document Removed";

  try {
    await prisma.activities.create({
      data: {
        user_id: params.userId,
        action: activityAction,
        entity_type: "contract",
        entity_id: params.contractId,
        entity_name: params.entityName ?? null,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error("contract-center.events", "Failed to record contract activity", {
      event: params.event,
      contractId: params.contractId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const platformName =
    params.event === "ContractDocumentLinked"
      ? "contracts.document.uploaded"
      : "contracts.document.deleted";

  await publishPlatformEvent({
    eventName: platformName,
    organizationId: params.organizationId,
    producer: "contract-center",
    actorUserId: params.userId,
    entityType: "contract",
    entityId: params.contractId,
    payload: {
      contractId: params.contractId,
      documentId: params.documentId,
      relationshipId: params.relationshipId,
      fileName: params.entityName,
      ...params.changes,
    },
  });
}
