import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  activityOrgScopeWhere,
  requireActivityInOrg,
  requireOrgAuth,
  requirePositiveIntId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrgAuth();

    const { searchParams } = new URL(req.url);

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = requirePositiveIntId(idStr, "id");
      const activity = await requireActivityInOrg(id, ctx);
      return NextResponse.json(activity);
    }

    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const userId = searchParams.get("user_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Organization scope is server-derived via activities.user_id → users.organization_id.
    // User-supplied filters remain subordinate to the org predicate.
    const filters: Record<string, any> = {};
    if (action) filters.action = action;
    if (entityType) filters.entity_type = entityType;
    if (entityId) filters.entity_id = parseInt(entityId);
    if (userId) filters.user_id = parseInt(userId);
    if (dateFrom || dateTo) {
      filters.timestamp = {};
      if (dateFrom) filters.timestamp.gte = new Date(dateFrom);
      if (dateTo) filters.timestamp.lte = new Date(dateTo);
    }

    const activities = await prisma.activities.findMany({
      where: { AND: [activityOrgScopeWhere(ctx), filters] },
      take: limit,
      orderBy: { timestamp: "desc" },
    });
    return NextResponse.json(activities);
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/office/activities]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
