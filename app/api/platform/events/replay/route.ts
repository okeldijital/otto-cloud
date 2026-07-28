import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  bootstrapPlatformEvents,
  eventDispatcher,
  PlatformEventError,
} from "@/lib/platform/events";
import { assertCanReplay } from "@/lib/platform/events/permissions";

function ok<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message ?? null,
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
 * POST /api/platform/events/replay
 * Body: { eventId?, deadLetterId?, correlationId?, from?, to? }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    assertCanReplay(ctx);
    await bootstrapPlatformEvents();

    const body = await req.json();
    const result = await eventDispatcher.replay({
      organizationId: ctx.organizationId,
      eventId: body.eventId,
      deadLetterId: body.deadLetterId,
      correlationId: body.correlationId,
      from: body.from ? new Date(body.from) : undefined,
      to: body.to ? new Date(body.to) : undefined,
      actorUserId: ctx.userId,
    });

    return ok(result, `Replayed ${result.replayed} event(s)`);
  } catch (error) {
    if (error instanceof PlatformEventError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST platform/events/replay]", error);
    return fail("Unable to replay events", 500, "INTERNAL_ERROR");
  }
}
