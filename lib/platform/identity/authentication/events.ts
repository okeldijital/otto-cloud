import { publishPlatformEvent } from "@/lib/platform/publish";
import { prisma } from "@/lib/prisma";
import { IDENTITY_EVENTS } from "../events/catalog";
import { PLATFORM_SYSTEM_ORGANIZATION_ID } from "../bootstrap/constants";

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

  // Platform bus requires a valid UUID organizationId on the envelope.
  // Use PLATFORM_SYSTEM_ORGANIZATION_ID (RFC-valid v4) — NOT the nil UUID,
  // which fails event schema validation (version nibble must be 1–5).
  const orgId =
    params.organizationId || PLATFORM_SYSTEM_ORGANIZATION_ID;

  const payload: Record<string, unknown> = {
    ...params.payload,
  };
  // Only include identityId when present — avoid undefined-key noise in validation
  if (params.identityId) {
    payload.identityId = params.identityId;
  }
  if (params.organizationId) {
    payload.organizationId = params.organizationId;
  }

  await publishPlatformEvent({
    eventName: params.eventType,
    organizationId: orgId,
    producer: "identity",
    entityType: "identity",
    entityId: params.identityId ?? undefined,
    payload,
  });
}

export { IDENTITY_EVENTS };
export { PLATFORM_SYSTEM_ORGANIZATION_ID };
