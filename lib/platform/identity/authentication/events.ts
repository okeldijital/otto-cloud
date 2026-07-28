import { publishPlatformEvent } from "@/lib/platform/publish";
import { prisma } from "@/lib/prisma";
import { IDENTITY_EVENTS } from "../events/catalog";

export async function emitIdentityEvent(params: {
  eventType: string;
  identityId?: string | null;
  organizationId?: string | null;
  payload?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.iamSecurityEvent.create({
      data: {
        identityId: params.identityId ?? null,
        eventType: params.eventType,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        payload: (params.payload ?? {}) as object,
      },
    });
  } catch {
    /* non-blocking */
  }

  // Platform bus requires registered org id for many consumers — use placeholder UUID when none
  const orgId =
    params.organizationId ||
    "00000000-0000-0000-0000-000000000000";

  await publishPlatformEvent({
    eventName: params.eventType,
    organizationId: orgId,
    producer: "identity",
    entityType: "identity",
    entityId: params.identityId ?? undefined,
    payload: {
      identityId: params.identityId,
      ...params.payload,
    },
  });
}

export { IDENTITY_EVENTS };
