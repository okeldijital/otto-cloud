import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuditLogInOrg,
  requireLegacyIntOrgId,
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
      const log = await requireAuditLogInOrg(id, ctx);
      return NextResponse.json(log);
    }

    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const userId = searchParams.get("user_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Server-derived organization scope. Never parse a UUID organization_id
    // with parseInt — malformed identifiers must fail closed, never become a
    // global query.
    const intOrg = requireLegacyIntOrgId(ctx);
    const orgPredicate = {
      OR: [
        { organization_id: intOrg },
        ...(ctx.organizationId ? [{ tenant_id: ctx.organizationId }] : []),
      ],
    };

    const filters: Record<string, any> = {};
    if (action) filters.action = action;
    if (entityType) filters.entity_type = entityType;
    if (entityId) filters.entity_id = parseInt(entityId);
    if (userId) filters.user_id = parseInt(userId);
    if (dateFrom || dateTo) {
      filters.created_at = {};
      if (dateFrom) filters.created_at.gte = new Date(dateFrom);
      if (dateTo) filters.created_at.lte = new Date(dateTo);
    }

    const logs = await prisma.audit_logs.findMany({
      where: { AND: [orgPredicate, filters] },
      take: limit,
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(logs);
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/office/audit-logs]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}