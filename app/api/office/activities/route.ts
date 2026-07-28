import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const activity = await prisma.activities.findUnique({ where: { id } });
      if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
      return NextResponse.json(activity);
    }

    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const userId = searchParams.get("user_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = parseInt(entityId);
    if (userId) where.user_id = parseInt(userId);
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(dateFrom);
      if (dateTo) where.timestamp.lte = new Date(dateTo);
    }

    const activities = await prisma.activities.findMany({
      where,
      take: limit,
      orderBy: { timestamp: "desc" },
    });
    return NextResponse.json(activities);
  } catch (err: any) {
    console.error("[GET /api/office/activities]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
