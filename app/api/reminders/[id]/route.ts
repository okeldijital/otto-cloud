import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  reminderService,
  NotificationError,
} from "@/lib/platform/notifications";

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

/** PATCH /api/reminders/:id */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const body = await req.json();

    const reminder = await reminderService.update({
      organizationId: ctx.organizationId,
      reminderId: params.id,
      userId: ctx.userId,
      status: body.status,
      dueAt: body.dueAt,
      title: body.title,
      body: body.body,
    });

    return ok({ reminder }, "Reminder updated");
  } catch (error) {
    if (error instanceof NotificationError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[PATCH reminders/:id]", error);
    return fail("Unable to update reminder", 500, "INTERNAL_ERROR");
  }
}
