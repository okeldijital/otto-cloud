import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { publishPlatformEvent } from "@/lib/platform/publish";

export const RELATIONSHIP_EVENTS = {
  Suggested: "RelationshipSuggested",
  Created: "RelationshipCreated",
  Updated: "RelationshipUpdated",
  Removed: "RelationshipRemoved",
  Rejected: "RelationshipRejected",
} as const;

export type RelationshipEventType =
  (typeof RELATIONSHIP_EVENTS)[keyof typeof RELATIONSHIP_EVENTS];

export async function publishRelationshipEvent(params: {
  organizationId: string;
  contractId: number;
  eventType: RelationshipEventType;
  payload: Record<string, unknown>;
  userId?: number;
}): Promise<void> {
  try {
    await prisma.contractRelationshipEvent.create({
      data: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        eventType: params.eventType,
        payload: params.payload as object,
      },
    });

    if (params.userId != null) {
      await recordAudit({
        action: params.eventType,
        entity_type: "contract_relationship",
        entity_id: params.contractId,
        entity_name: String(params.payload.relationshipId || params.payload.suggestionId || ""),
        changes: params.payload,
        user_id: params.userId,
        organization_id: params.organizationId,
      });
    }

    logger.info("contract-relationship.event", params.eventType, {
      contractId: params.contractId,
    });

    await publishPlatformEvent({
      eventName: params.eventType,
      organizationId: params.organizationId,
      producer: "contract-center",
      actorUserId: params.userId,
      entityType: "contract",
      entityId: params.contractId,
      payload: {
        contractId: params.contractId,
        legacyEventType: params.eventType,
        ...params.payload,
      },
    });
  } catch (error) {
    logger.error("contract-relationship.event", "Failed to publish", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordRelationshipHistory(params: {
  organizationId: string;
  contractId: number;
  action: string;
  actorUserId?: number | null;
  relationshipId?: string | null;
  suggestionId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.relationshipHistory.create({
      data: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        relationshipId: params.relationshipId ?? null,
        suggestionId: params.suggestionId ?? null,
        payload: (params.payload ?? {}) as object,
      },
    });
  } catch (error) {
    logger.error("contract-relationship.history", "Failed to write history", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function emitRelationshipActivity(params: {
  action: string;
  userId: number;
  contractId: number;
  entityName?: string;
}): Promise<void> {
  try {
    await prisma.activities.create({
      data: {
        user_id: params.userId,
        action: params.action,
        entity_type: "contract",
        entity_id: params.contractId,
        entity_name: params.entityName ?? null,
        timestamp: new Date(),
      },
    });
  } catch {
    /* non-blocking */
  }
}
