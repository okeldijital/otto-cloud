import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { publishPlatformEvent } from "@/lib/platform/publish";

export async function publishEntitlementEvent(params: {
  organizationId: string;
  entitlementId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  userId?: number | null;
}): Promise<void> {
  try {
    await prisma.royaltyEntitlementEvent.create({
      data: {
        organizationId: params.organizationId,
        entitlementId: params.entitlementId ?? null,
        eventType: params.eventType,
        payload: params.payload as object,
      },
    });

    if (params.userId != null) {
      await recordAudit({
        action: params.eventType,
        entity_type: "royalty_entitlement",
        entity_name: params.entitlementId ?? undefined,
        changes: params.payload,
        user_id: params.userId,
        organization_id: params.organizationId,
      });
    }

    await publishPlatformEvent({
      eventName: params.eventType,
      organizationId: params.organizationId,
      producer: "royalties",
      actorUserId: params.userId ?? undefined,
      entityType: "royalty_entitlement",
      entityId: params.entitlementId ?? undefined,
      payload: {
        entitlementId: params.entitlementId,
        ...params.payload,
      },
    });
  } catch (error) {
    logger.error("royalties.event", "Failed to publish", {
      eventType: params.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function appendEntitlementTimeline(params: {
  organizationId: string;
  entitlementId: string;
  entryType: string;
  title: string;
  description?: string;
  actorUserId?: number | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.entitlementTimelineEntry.create({
      data: {
        organizationId: params.organizationId,
        entitlementId: params.entitlementId,
        entryType: params.entryType,
        title: params.title,
        description: params.description ?? null,
        actorUserId: params.actorUserId ?? null,
        payload: (params.payload ?? {}) as object,
      },
    });
  } catch (error) {
    logger.error("royalties.timeline", "append failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function appendEntitlementHistory(params: {
  organizationId: string;
  entitlementId: string;
  action: string;
  actorUserId?: number | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.entitlementHistory.create({
      data: {
        organizationId: params.organizationId,
        entitlementId: params.entitlementId,
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        payload: (params.payload ?? {}) as object,
      },
    });
  } catch (error) {
    logger.error("royalties.history", "append failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
