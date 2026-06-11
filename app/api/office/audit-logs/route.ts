import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgIdStr = (session.user as any).organization_id;

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const log = await prisma.audit_logs.findUnique({ where: { id } });
      if (!log) return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
      return NextResponse.json(log);
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
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || null : orgIdStr;
    if (orgId) where.organization_id = orgId;

    const logs = await prisma.audit_logs.findMany({
      where,
      take: limit,
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(logs);
  } catch (err: any) {
    console.error("[GET /api/office/audit-logs]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
