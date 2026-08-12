import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import {
  requireLegacyIntOrgId,
  requireActorUserId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    const ctx = await requireOrganization();
    const intOrg = requireLegacyIntOrgId(ctx);

    if (idStr) {
      const id = parseInt(idStr);
      const org = await prisma.organizations.findFirst({
        where: { id, organization_id: intOrg },
        include: {
          individual_organizations: {
            where: { individuals: { organization_id: intOrg } },
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
      where: { organization_id: intOrg },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(orgs);
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[GET /api/network/organizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const ctx = await requireOrganization();

    const orgIdStr = ctx.organizationId;
    const orgId = requireLegacyIntOrgId(ctx);

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
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[POST /api/network/organizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const id = parseInt(idStr);

    const ctx = await requireOrganization();
    const intOrg = requireLegacyIntOrgId(ctx);

    const existing = await prisma.organizations.findFirst({
      where: { id, organization_id: intOrg },
    });
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
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[PUT /api/network/organizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const id = parseInt(idStr);

    const ctx = await requireOrganization();
    const intOrg = requireLegacyIntOrgId(ctx);

    const existing = await prisma.organizations.findFirst({
      where: { id, organization_id: intOrg },
    });
    if (!existing) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    await prisma.individual_organizations.deleteMany({ where: { organization_id: id } });
    await prisma.organizations.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[DELETE /api/network/organizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
