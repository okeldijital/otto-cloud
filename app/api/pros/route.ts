import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { platformAuthorityFromSession } from "@/lib/auth/privilege-authorization";
import { prisma } from "@/lib/prisma";
import { requireOrganization, orgContextErrorResponse } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid PRO ID" }, { status: 400 });
      const relation = searchParams.get("relation");
      if (relation === "artists" || relation === "works") {
        const ctx = await requireOrganization();
        if (relation === "artists") {
          const artists = await prisma.artists.findMany({ where: { pro_id: id, organization_id: ctx.organizationId, is_deleted: false }, orderBy: { name: "asc" } });
          return NextResponse.json(artists);
        }
        const works = await prisma.works.findMany({ where: { pro_id: id, organization_id: ctx.organizationId, is_deleted: false }, orderBy: { title: "asc" } });
        return NextResponse.json(works);
      }
      const pro = await prisma.pros.findUnique({ where: { id } });
      if (!pro) return NextResponse.json({ error: "PRO not found" }, { status: 404 });
      return NextResponse.json(pro);
    }
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const [items, total] = await Promise.all([
      prisma.pros.findMany({ skip, take: limit, orderBy: { name: "asc" } }),
      prisma.pros.count(),
    ]);
    return NextResponse.json({ total, items });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status !== 500) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/pros]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!platformAuthorityFromSession(session.user)) return NextResponse.json({ error: "Platform authority required", code: "PLATFORM_AUTHORITY_REQUIRED" }, { status: 403 });
    const body = await req.json();
    const existing = await prisma.pros.findFirst({ where: { name: body.name } });
    if (existing) return NextResponse.json({ error: `A PRO with the name '${body.name}' already exists.` }, { status: 409 });
    const newItem = await prisma.pros.create({ data: { name: body.name, pro_id: body.pro_id || null } });
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/pros]", err);
    if (err.code === "P2002") return NextResponse.json({ error: "A database integrity error occurred. This PRO name or ID might already exist." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!platformAuthorityFromSession(session.user)) return NextResponse.json({ error: "Platform authority required", code: "PLATFORM_AUTHORITY_REQUIRED" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing PRO ID" }, { status: 400 });
    const id = parseInt(idStr);
    const body = await req.json();
    const existing = await prisma.pros.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "PRO not found" }, { status: 404 });
    if (body.name && body.name !== existing.name) {
      const dup = await prisma.pros.findFirst({ where: { name: body.name } });
      if (dup) return NextResponse.json({ error: `A PRO with the name '${body.name}' already exists.` }, { status: 409 });
    }
    const allowed = { name: body.name, pro_id: body.pro_id === undefined ? existing.pro_id : (body.pro_id || null), address: body.address ?? existing.address, contact_email: body.contact_email ?? existing.contact_email, contact_phone: body.contact_phone ?? existing.contact_phone, website: body.website ?? existing.website, territory: body.territory ?? existing.territory };
    const updated = await prisma.pros.update({ where: { id }, data: allowed });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/pros]", err);
    if (err.code === "P2002") return NextResponse.json({ error: "A database integrity error occurred. This PRO name or ID might already be in use." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!platformAuthorityFromSession(session.user)) return NextResponse.json({ error: "Platform authority required", code: "PLATFORM_AUTHORITY_REQUIRED" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing PRO ID" }, { status: 400 });
    const id = parseInt(idStr);
    const existing = await prisma.pros.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "PRO not found" }, { status: 404 });
    await prisma.pros.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/pros]", err);
    if (err.code === "P2003" || err.code === "P2014") return NextResponse.json({ error: "Cannot delete PRO because it is associated with artists or works." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
