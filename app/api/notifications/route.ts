import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt((session.user as any).id) || undefined;
    const orgId = (session.user as any).organization_id;
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    if (scope === "unread-count") {
      const where: any = { is_read: false, organization_id: orgId };
      if (userId) where.user_id = userId;
      const count = await prisma.workspace_notifications.count({ where });
      return NextResponse.json({ count });
    }

    const where: any = { organization_id: orgId };
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
  } catch (err: any) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt((session.user as any).id) || undefined;
    const orgId = (session.user as any).organization_id;
    const body = await req.json();
    const { action, notification_id } = body;

    if (action === "mark_read") {
      if (notification_id) {
        await prisma.workspace_notifications.update({
          where: { id: notification_id },
          data: { is_read: true },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "mark_all_read") {
      const where: any = { is_read: false, organization_id: orgId };
      if (userId) where.user_id = userId;
      await prisma.workspace_notifications.updateMany({
        where,
        data: { is_read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "clear_all") {
      const where: any = { organization_id: orgId };
      if (userId) where.user_id = userId;
      await prisma.workspace_notifications.deleteMany({ where });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[PUT /api/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
