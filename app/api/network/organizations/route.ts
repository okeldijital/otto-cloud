import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parseInt(idStr);
      const org = await prisma.organizations.findUnique({
        where: { id },
        include: {
          individual_organizations: {
            include: { individuals: true },
          },
          _count: { select: { releases: true } },
        },
      });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      return NextResponse.json(org);
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "200");
    const orgs = await prisma.organizations.findMany({
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(orgs);
  } catch (err: any) {
    console.error("[GET /api/network/organizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const ctx = await requireOrganization();

    const orgIdStr = ctx.organizationId;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;

    const org = await prisma.organizations.create({
      data: {
        name: body.name,
        org_type: body.org_type || "Other",
        website: body.website || null,
        address: body.address || null,
        organization_id: orgId,
      },
    });
    return NextResponse.json(org, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/network/organizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.organizations.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.organizations.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        org_type: body.org_type !== undefined ? body.org_type : undefined,
        website: body.website !== undefined ? body.website : undefined,
        address: body.address !== undefined ? body.address : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/network/organizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.organizations.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    await prisma.individual_organizations.deleteMany({ where: { organization_id: id } });
    await prisma.organizations.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/network/organizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
