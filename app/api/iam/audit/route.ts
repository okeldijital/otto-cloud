import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/iam";

export async function GET(req: Request) {
  const { user, error } = await requirePermission("audit.view");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const orgId = (user as any).organization_id;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entity_type");
  const userId = searchParams.get("user_id") ? parseInt(searchParams.get("user_id")!) : undefined;

  const where: any = { organization_id: parseInt(orgId) || orgId };
  if (action) where.action = action;
  if (entityType) where.entity_type = entityType;
  if (userId) where.user_id = userId;

  const [items, total] = await Promise.all([
    prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
      include: { users: { select: { id: true, name: true, email: true } } },
    }),
    prisma.audit_logs.count({ where }),
  ]);

  return NextResponse.json({ items, total, limit, offset });
}
