import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  bootstrapPlatformEvents,
  getEventById,
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

/** GET /api/platform/events/:id */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const params = await Promise.resolve(context.params);
    const event = await getEventById(params.id, ctx.organizationId);
    if (!event) return fail("Event not found", 404, "EVENT_NOT_FOUND");

    const deliveries = await prisma.platformEventDelivery.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "asc" },
    });

    const deadLetters = await prisma.platformDeadLetter.findMany({
      where: { eventId: event.id, organizationId: ctx.organizationId },
    });

    return ok({ event, deliveries, deadLetters });
  } catch (error) {
    if (error instanceof PlatformEventError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET platform/events/:id]", error);
    return fail("Unable to load event", 500, "INTERNAL_ERROR");
  }
}
