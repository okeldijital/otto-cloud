import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  notificationService,
  NotificationError,
} from "@/lib/platform/notifications";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

function ok<T>(data: T) {
  return NextResponse.json({
    success: true,
    data,
    message: null,
    errors: null,
  });
}

/**
 * GET /api/notifications
 * Platform in-app notifications (M4.2).
 * ?scope=workspace — legacy workspace_notifications
 * ?scope=unread-count — badge count
 * Filters: status, type, limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id) || 0;
    const ctx = await requireOrganization();
    const sp = new URL(req.url).searchParams;
    const scope = sp.get("scope");

    // Legacy workspace notifications
    if (scope === "workspace") {
      const where: any = { organization_id: ctx.organizationId };
      if (userId) where.user_id = userId;
      const notifications = await prisma.workspace_notifications.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: 50,
      });
      const unreadCount = await prisma.workspace_notifications.count({
        where: { ...where, is_read: false },
      });
      return NextResponse.json({ notifications, unreadCount });
    }

    await bootstrapPlatformEvents();

    if (scope === "unread-count") {
      const result = await notificationService.list({
        organizationId: ctx.organizationId,
        userId,
        status: "unread",
        limit: 1,
      });
      // Include workspace unread for badge parity
      const workspaceUnread = await prisma.workspace_notifications.count({
        where: {
          is_read: false,
          organization_id: ctx.organizationId,
          user_id: userId || undefined,
        },
      });
      return ok({
        count: result.unreadCount + workspaceUnread,
        platform: result.unreadCount,
        workspace: workspaceUnread,
      });
    }

    const result = await notificationService.list({
      organizationId: ctx.organizationId,
      userId,
      status: sp.get("status") || undefined,
      type: sp.get("type") || undefined,
      limit: parseInt(sp.get("limit") || "50", 10),
      offset: parseInt(sp.get("offset") || "0", 10),
    });

    return ok({
      notifications: result.items,
      total: result.total,
      unreadCount: result.unreadCount,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    if (error instanceof NotificationError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.status }
      );
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET /api/notifications]", error);
    return NextResponse.json(
      { success: false, message: "Unable to load notifications" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications — legacy workspace actions + mark_all_read platform
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id) || 0;
    const ctx = await requireOrganization();
    const body = await req.json();
    const { action, notification_id, scope } = body;

    if (scope === "workspace" || action === "clear_all") {
      if (action === "mark_read" && notification_id) {
        await prisma.workspace_notifications.update({
          where: { id: notification_id },
          data: { is_read: true },
        });
        return NextResponse.json({ success: true });
      }
      if (action === "mark_all_read") {
        const where: any = { is_read: false, organization_id: ctx.organizationId };
        if (userId) where.user_id = userId;
        await prisma.workspace_notifications.updateMany({
          where,
          data: { is_read: true },
        });
        return NextResponse.json({ success: true });
      }
      if (action === "clear_all") {
        const where: any = { organization_id: ctx.organizationId };
        if (userId) where.user_id = userId;
        await prisma.workspace_notifications.deleteMany({ where });
        return NextResponse.json({ success: true });
      }
    }

    if (action === "mark_all_read") {
      await notificationService.markAllRead({
        organizationId: ctx.organizationId,
        userId,
      });
      return ok({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[PUT /api/notifications]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
