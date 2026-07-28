import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { publishPlatformEvent } from "@/lib/platform/publish";

export async function publishLifecycleEvent(params: {
  organizationId: string;
  contractId: number;
  eventType: string;
  payload: Record<string, unknown>;
  userId?: number;
}): Promise<void> {
  try {
    await prisma.contractLifecycleEvent.create({
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
        entity_type: "contract_lifecycle",
        entity_id: params.contractId,
        changes: params.payload,
        user_id: params.userId,
        organization_id: params.organizationId,
      });
    }
    logger.info("contract-lifecycle.event", params.eventType, {
      contractId: params.contractId,
    });

    // Platform Event Bus (M4.2) — Contract Center is first producer
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
    logger.error("contract-lifecycle.event", "Failed to publish", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function appendTimeline(params: {
  organizationId: string;
  contractId: number;
  entryType: string;
  title: string;
  description?: string;
  actorUserId?: number | null;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
}): Promise<void> {
  try {
    await prisma.contractTimelineEntry.create({
      data: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        entryType: params.entryType,
        title: params.title,
        description: params.description ?? null,
        actorUserId: params.actorUserId ?? null,
        payload: (params.payload ?? {}) as object,
        occurredAt: params.occurredAt ?? new Date(),
      },
    });
  } catch (error) {
    logger.error("contract-lifecycle.timeline", "Failed to append", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
