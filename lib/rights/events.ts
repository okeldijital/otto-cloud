import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { publishPlatformEvent } from "@/lib/platform/publish";

export async function publishRightEvent(params: {
  organizationId: string;
  rightId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  userId?: number | null;
}): Promise<void> {
  try {
    await prisma.rightDomainEvent.create({
      data: {
        organizationId: params.organizationId,
        rightId: params.rightId ?? null,
        eventType: params.eventType,
        payload: params.payload as object,
      },
    });

    if (params.userId != null) {
      await recordAudit({
        action: params.eventType,
        entity_type: "right",
        entity_name: params.rightId ?? undefined,
        changes: params.payload,
        user_id: params.userId,
        organization_id: params.organizationId,
      });
    }

    await publishPlatformEvent({
      eventName: params.eventType,
      organizationId: params.organizationId,
      producer: "rights",
      actorUserId: params.userId ?? undefined,
      entityType: "right",
      entityId: params.rightId ?? undefined,
      payload: {
        rightId: params.rightId,
        ...params.payload,
      },
    });
  } catch (error) {
    logger.error("rights.event", "Failed to publish", {
      eventType: params.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function appendRightTimeline(params: {
  organizationId: string;
  rightId: string;
  entryType: string;
  title: string;
  description?: string;
  actorUserId?: number | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.rightTimelineEntry.create({
      data: {
        organizationId: params.organizationId,
        rightId: params.rightId,
        entryType: params.entryType,
        title: params.title,
        description: params.description ?? null,
        actorUserId: params.actorUserId ?? null,
        payload: (params.payload ?? {}) as object,
      },
    });
  } catch (error) {
    logger.error("rights.timeline", "Failed to append", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function appendRightHistory(params: {
  organizationId: string;
  rightId: string;
  action: string;
  actorUserId?: number | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.rightHistory.create({
      data: {
        organizationId: params.organizationId,
        rightId: params.rightId,
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        payload: (params.payload ?? {}) as object,
      },
    });
  } catch (error) {
    logger.error("rights.history", "Failed to append", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
