import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  bootstrapPlatformEvents,
  listEvents,
  listEventDefinitionsWithSchemas,
  listDeadLetters,
  getInMemoryMetrics,
  PlatformEventError,
} from "@/lib/platform/events";
import { prisma } from "@/lib/prisma";

function ok<T>(data: T) {
  return NextResponse.json({
    success: true,
    data,
    message: null,
    errors: null,
  });
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, data: null, message, errors: [message], code },
    { status }
  );
}

/**
 * GET /api/platform/events
 * Query: eventName, status, correlationId, producer, from, to, limit, offset, view=registry|dead_letter|metrics
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const sp = new URL(req.url).searchParams;
    const view = sp.get("view");

    if (view === "registry") {
      return ok({ registry: listEventDefinitionsWithSchemas() });
    }

    if (view === "dead_letter") {
      const result = await listDeadLetters({
        organizationId: ctx.organizationId,
        status: sp.get("status") || undefined,
        limit: parseInt(sp.get("limit") || "50", 10),
        offset: parseInt(sp.get("offset") || "0", 10),
      });
      return ok(result);
    }

    if (view === "metrics") {
      const mem = getInMemoryMetrics();
      const [published, deadLetter, failedDeliveries, notifUnread, remindersDue] =
        await Promise.all([
          prisma.platformEvent.count({
            where: { organizationId: ctx.organizationId },
          }),
          prisma.platformDeadLetter.count({
            where: { organizationId: ctx.organizationId, status: "open" },
          }),
          prisma.platformEventDelivery.count({
            where: {
              status: { in: ["failed", "dead_letter"] },
              event: { organizationId: ctx.organizationId },
            },
          }),
          prisma.platformNotification.count({
            where: {
              organizationId: ctx.organizationId,
              status: "unread",
            },
          }),
          prisma.platformReminder.count({
            where: {
              organizationId: ctx.organizationId,
              status: "scheduled",
            },
          }),
        ]);

      return ok({
        process: mem,
        organization: {
          eventsPublished: published,
          deadLetterCount: deadLetter,
          subscriberFailures: failedDeliveries,
          notificationQueue: notifUnread,
          reminderQueue: remindersDue,
        },
      });
    }

    const from = sp.get("from") ? new Date(sp.get("from")!) : undefined;
    const to = sp.get("to") ? new Date(sp.get("to")!) : undefined;

    const result = await listEvents({
      organizationId: ctx.organizationId,
      eventName: sp.get("eventName") || undefined,
      status: sp.get("status") || undefined,
      correlationId: sp.get("correlationId") || undefined,
      producer: sp.get("producer") || undefined,
      from,
      to,
      limit: parseInt(sp.get("limit") || "50", 10),
      offset: parseInt(sp.get("offset") || "0", 10),
    });

    return ok(result);
  } catch (error) {
    if (error instanceof PlatformEventError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET platform/events]", error);
    return fail("Unable to list events", 500, "INTERNAL_ERROR");
  }
}
