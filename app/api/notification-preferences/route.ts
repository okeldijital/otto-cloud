import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  getPreferences,
  upsertPreferences,
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

/** GET /api/notification-preferences */
export async function GET() {
  try {
    const ctx = await requireOrganization();
    const preferences = await getPreferences({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    });
    return ok({ preferences });
  } catch (error) {
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET notification-preferences]", error);
    return fail("Unable to load preferences", 500, "INTERNAL_ERROR");
  }
}

/**
 * PATCH /api/notification-preferences
 * Body: { preferences: [{ notificationType, enabled?, frequency?, channels? }] }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    const body = await req.json();
    const preferences = body.preferences;
    if (!Array.isArray(preferences) || preferences.length === 0) {
      return fail("preferences array required", 400, "PREFERENCES_REQUIRED");
    }

    const updated = await upsertPreferences({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      preferences,
    });

    return ok({ preferences: updated }, "Preferences updated");
  } catch (error) {
    if (error instanceof NotificationError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[PATCH notification-preferences]", error);
    return fail("Unable to update preferences", 500, "INTERNAL_ERROR");
  }
}
