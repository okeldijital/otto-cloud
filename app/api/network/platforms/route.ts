import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { platformAuthorityFromSession } from "@/lib/auth/privilege-authorization";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parseInt(idStr);
      const platform = await prisma.platforms.findUnique({ where: { id } });
      if (!platform) return NextResponse.json({ error: "Platform not found" }, { status: 404 });
      return NextResponse.json(platform);
    }

    const platforms = await prisma.platforms.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(platforms);
  } catch (err: any) {
    console.error("[GET /api/network/platforms]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!platformAuthorityFromSession(session.user)) {
      return NextResponse.json(
        { error: "Platform authority required", code: "PLATFORM_AUTHORITY_REQUIRED" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const platform = await prisma.platforms.create({
      data: {
        name: body.name,
        platform_type: body.platform_type || "Other",
        portal_url: body.portal_url || null,
        account_reference: body.account_reference || null,
        territory_coverage: body.territory_coverage || null,
      },
    });
    return NextResponse.json(platform, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/network/platforms]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!platformAuthorityFromSession(session.user)) {
      return NextResponse.json(
        { error: "Platform authority required", code: "PLATFORM_AUTHORITY_REQUIRED" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.platforms.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Platform not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.platforms.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        platform_type: body.platform_type !== undefined ? body.platform_type : undefined,
        portal_url: body.portal_url !== undefined ? body.portal_url : undefined,
        account_reference: body.account_reference !== undefined ? body.account_reference : undefined,
        territory_coverage: body.territory_coverage !== undefined ? body.territory_coverage : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/network/platforms]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!platformAuthorityFromSession(session.user)) {
      return NextResponse.json(
        { error: "Platform authority required", code: "PLATFORM_AUTHORITY_REQUIRED" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.platforms.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Platform not found" }, { status: 404 });

    await prisma.platforms.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/network/platforms]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
