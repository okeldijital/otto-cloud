import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { requireOrgAuth, requireArtistInOrg, requireWorkInOrg, resourceAuthErrorResponse } from "@/lib/auth/resource-authorization";

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const publisherId = Number(body.publisherId);
    if (!Number.isInteger(publisherId)) return NextResponse.json({ error: "Invalid publisher ID" }, { status: 400 });
    const publisher = await prisma.publishers.findUnique({ where: { id: publisherId } });
    if (!publisher) return NextResponse.json({ error: "Publisher not found" }, { status: 404 });

    if (body.relation === "artist") {
      const artistId = Number(body.artistId);
      if (!Number.isInteger(artistId)) return NextResponse.json({ error: "Invalid artist ID" }, { status: 400 });
      await requireArtistInOrg(artistId, ctx);
      const updated = await prisma.artists.update({ where: { id: artistId }, data: { publisher_id: publisherId } });
      return NextResponse.json(updated);
    }

    if (body.relation === "work") {
      const workId = Number(body.workId);
      if (!Number.isInteger(workId)) return NextResponse.json({ error: "Invalid work ID" }, { status: 400 });
      await requireWorkInOrg(workId, ctx);
      const existing = await prisma.work_publishers.findFirst({ where: { work_id: workId, publisher_id: publisherId, organization_id: ctx.legacyIntOrgId } });
      if (existing) return NextResponse.json(existing);
      const created = await prisma.work_publishers.create({
        data: {
          work_id: workId,
          publisher_id: publisherId,
          organization_id: ctx.legacyIntOrgId,
          tenant_id: ctx.tenantId,
          share_percent: body.sharePercent == null ? null : Number(body.sharePercent),
          controlled_share_percent: body.controlledSharePercent == null ? null : Number(body.controlledSharePercent),
          is_administrator: Boolean(body.isAdministrator),
          administration_notes: body.administrationNotes ?? null,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported relation" }, { status: 400 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[PUT /api/publishers/relations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const relation = searchParams.get("relation");
    const publisherId = Number(searchParams.get("publisherId"));
    const entityId = Number(searchParams.get("entityId"));
    if (!Number.isInteger(publisherId) || !Number.isInteger(entityId)) return NextResponse.json({ error: "Invalid relationship IDs" }, { status: 400 });

    if (relation === "artist") {
      await requireArtistInOrg(entityId, ctx);
      await prisma.artists.update({ where: { id: entityId }, data: { publisher_id: null } });
      return new NextResponse(null, { status: 204 });
    }
    if (relation === "work") {
      await requireWorkInOrg(entityId, ctx);
      await prisma.work_publishers.deleteMany({ where: { work_id: entityId, publisher_id: publisherId, organization_id: ctx.legacyIntOrgId } });
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json({ error: "Unsupported relation" }, { status: 400 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[DELETE /api/publishers/relations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
