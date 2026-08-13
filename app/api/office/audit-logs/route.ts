import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireOrgAuth,
  requireAuditLogInOrg,
  requireLegacyIntOrgId,
  requirePositiveIntId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = requirePositiveIntId(idStr, "audit log ID");
      const log = await requireAuditLogInOrg(id, ctx);
      return NextResponse.json(log);
    }

    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const userId = searchParams.get("user_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = Math.min(requirePositiveIntId(searchParams.get("limit") || "100", "limit"), 500);

    const where: any = { organization_id: requireLegacyIntOrgId(ctx) };
    if (action) where.action = action;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = requirePositiveIntId(entityId, "entity_id");
    if (userId) where.user_id = requirePositiveIntId(userId, "user_id");
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const logs = await prisma.audit_logs.findMany({
      where,
      take: limit,
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(logs);
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 400 || mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/office/audit-logs]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
