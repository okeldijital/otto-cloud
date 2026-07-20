import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await requireOrganization();

  const tenantId = ctx.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const org = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      logo_url: true,
      banner_url: true,
      brand_color: true,
      secondary_color: true,
      accent_color: true,
      email_signature: true,
      report_branding: true,
      pdf_branding: true,
      invoice_branding: true,
    },
  });

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json(org);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await requireOrganization();

  const tenantId = ctx.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  try {
    const body = await req.json();

    const allowedFields = [
      "logo_url", "banner_url",
      "brand_color", "secondary_color", "accent_color",
      "email_signature", "report_branding", "pdf_branding", "invoice_branding",
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
      where: { id: tenantId },
      data: updateData,
      select: {
        logo_url: true,
        banner_url: true,
        brand_color: true,
        secondary_color: true,
        accent_color: true,
        email_signature: true,
        report_branding: true,
        pdf_branding: true,
        invoice_branding: true,
      },
    });

    return NextResponse.json(org);
  } catch (error: any) {
    console.error("Error updating branding:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
