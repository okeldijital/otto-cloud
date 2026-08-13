import { NextResponse } from "next/server";
import { requireOrgAuth, resourceAuthErrorResponse, requirePositiveIntId } from "@/lib/auth/resource-authorization";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = requirePositiveIntId(idStr, "activity ID");
      const activity = await prisma.activities.findFirst({
        where: { id, users: { organization_id: ctx.organizationId } },
      });
      if (!activity) return NextResponse.json({ error: "Activity not found", code: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json(activity);
    }

    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const userId = searchParams.get("user_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = Math.min(requirePositiveIntId(searchParams.get("limit") || "100", "limit"), 500);

    const where: any = { users: { organization_id: ctx.organizationId } };
    if (action) where.action = action;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = requirePositiveIntId(entityId, "entity_id");
    if (userId) {
      const actorId = requirePositiveIntId(userId, "user_id");
      where.user_id = actorId;
    }
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
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 400 || mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/office/activities]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
