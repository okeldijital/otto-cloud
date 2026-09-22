import { NextResponse } from "next/server";
import { requireProductOrganization } from "@/lib/platform/productization";
import { assertCanManageRelationships } from "@/lib/contract-relationships/permissions";
import { prisma } from "@/lib/prisma";

function normalizeName(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export async function GET() {
  try {
    const ctx = await requireProductOrganization("contracts.core");
    const folders = await prisma.contractFolder.findMany({
      where: { organizationId: ctx.legacyIntOrgId },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { memberships: true } } },
    });

    return NextResponse.json({
      items: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        contractCount: folder._count.memberships,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error("[GET /api/contracts/folders]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireProductOrganization("contracts.core");
    assertCanManageRelationships(ctx);

    const body = await req.json();
    const name = normalizeName(body?.name);
    if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    if (name.length > 100) return NextResponse.json({ error: "Folder name must be 100 characters or fewer" }, { status: 400 });

    const existing = await prisma.contractFolder.findFirst({
      where: { organizationId: ctx.legacyIntOrgId, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });

    const folder = await prisma.contractFolder.create({
      data: {
        organizationId: ctx.legacyIntOrgId,
        name,
        createdBy: ctx.userId,
      },
    });

    return NextResponse.json({ item: folder }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("[POST /api/contracts/folders]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
