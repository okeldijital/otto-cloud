import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  reminderService,
  NotificationError,
} from "@/lib/platform/notifications";

function ok<T>(data: T, status = 200, message?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message ?? null,
      errors: null,
    },
    { status }
  );
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, data: null, message, errors: [message], code },
    { status }
  );
}

/** GET /api/reminders */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    const sp = new URL(req.url).searchParams;
    const result = await reminderService.list({
      organizationId: ctx.organizationId,
      status: sp.get("status") || undefined,
      entityType: sp.get("entityType") || undefined,
      entityId: sp.get("entityId") || undefined,
      limit: parseInt(sp.get("limit") || "50", 10),
      offset: parseInt(sp.get("offset") || "0", 10),
    });
    return ok(result);
  } catch (error) {
    if (error instanceof NotificationError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET reminders]", error);
    return fail("Unable to load reminders", 500, "INTERNAL_ERROR");
  }
}

/** POST /api/reminders */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    const body = await req.json();
    if (!body.type || !body.title || !body.dueAt) {
      return fail("type, title, and dueAt are required", 400, "INVALID_BODY");
    }

    const reminder = await reminderService.create({
      organizationId: ctx.organizationId,
      userId: body.userId ?? ctx.userId,
      entityType: body.entityType,
      entityId: body.entityId,
      type: body.type,
      title: body.title,
      body: body.body,
      dueAt: body.dueAt,
      payload: body.payload,
      createdBy: ctx.userId,
    });

    return ok({ reminder }, 201, "Reminder created");
  } catch (error) {
    if (error instanceof NotificationError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST reminders]", error);
    return fail("Unable to create reminder", 500, "INTERNAL_ERROR");
  }
}
