import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";

export async function GET() {
  try {
    const ctx = await requireOrganization();
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const org = await prisma.tenants.findUnique({
      where: { id: ctx.tenantId },
      include: {
        _count: { select: { tenant_users: true } },
        subscriptions: { include: { plans: true } },
      },
    });

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    return NextResponse.json({
      ...org,
      organizationId: ctx.organizationId,
      dataScopeSource: ctx.dataScopeSource,
    });
  } catch (err) {
    const { body, status } = orgContextErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrganization();
    if (!ctx.tenantId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();

    const allowedFields = [
      "name", "display_name", "legal_name", "org_type",
      "website", "email", "phone", "physical_address",
      "country", "province_state", "city",
      "currency", "timezone", "tax_number", "registration_number",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const org = await prisma.tenants.update({
      where: { id: ctx.tenantId },
      data: updateData,
    });

    return NextResponse.json(org);
  } catch (err) {
    const { body, status } = orgContextErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
