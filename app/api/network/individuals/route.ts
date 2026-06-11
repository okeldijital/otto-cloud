import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parseInt(idStr);
      const individual = await prisma.individuals.findUnique({
        where: { id },
        include: {
          individual_organizations: {
            include: { organizations: true },
          },
        },
      });
      if (!individual) return NextResponse.json({ error: "Individual not found" }, { status: 404 });
      return NextResponse.json(individual);
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "200");
    const individuals = await prisma.individuals.findMany({
      skip,
      take: limit,
      orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
      include: {
        individual_organizations: {
          include: { organizations: true },
        },
      },
    });
    return NextResponse.json(individuals);
  } catch (err: any) {
    console.error("[GET /api/network/individuals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.first_name && !body.last_name) {
      return NextResponse.json({ error: "First or last name is required" }, { status: 400 });
    }

    const orgIdStr = (session.user as any).organization_id;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;

    const individual = await prisma.individuals.create({
      data: {
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        email: body.email || null,
        phone: body.phone || null,
        role: body.role || null,
        relationship_strength: body.relationship_strength || "Regular",
        image_url: body.image_url || null,
        organization_id: orgId,
      },
    });

    if (body.organization_ids?.length) {
      for (const orgId2 of body.organization_ids) {
        await prisma.individual_organizations.create({
          data: { individual_id: individual.id, organization_id: parseInt(orgId2) },
        });
      }
    }

    return NextResponse.json(individual, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/network/individuals]", err);
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

    const existing = await prisma.individuals.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Individual not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.individuals.update({
      where: { id },
      data: {
        first_name: body.first_name !== undefined ? body.first_name : undefined,
        last_name: body.last_name !== undefined ? body.last_name : undefined,
        email: body.email !== undefined ? body.email : undefined,
        phone: body.phone !== undefined ? body.phone : undefined,
        role: body.role !== undefined ? body.role : undefined,
        relationship_strength: body.relationship_strength !== undefined ? body.relationship_strength : undefined,
        image_url: body.image_url !== undefined ? body.image_url : undefined,
      },
    });

    if (body.organization_ids !== undefined) {
      await prisma.individual_organizations.deleteMany({ where: { individual_id: id } });
      for (const orgId2 of body.organization_ids) {
        await prisma.individual_organizations.create({
          data: { individual_id: id, organization_id: parseInt(orgId2) },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/network/individuals]", err);
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

    const existing = await prisma.individuals.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Individual not found" }, { status: 404 });

    await prisma.individual_organizations.deleteMany({ where: { individual_id: id } });
    await prisma.individuals.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/network/individuals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
