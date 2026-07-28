import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  notificationService,
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

/**
 * PATCH /api/notifications/:id
 * Body: { status: "read" | "unread" | "archived" | "dismissed" }
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const body = await req.json();
    const status = body.status as string;
    if (!status) return fail("status is required", 400, "STATUS_REQUIRED");

    const notification = await notificationService.updateStatus({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      notificationId: params.id,
      status,
    });

    return ok({ notification }, "Notification updated");
  } catch (error) {
    if (error instanceof NotificationError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[PATCH notifications/:id]", error);
    return fail("Unable to update notification", 500, "INTERNAL_ERROR");
  }
}
