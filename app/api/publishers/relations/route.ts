import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { requireOrgAuth, requireArtistInOrg, requireWorkInOrg, resourceAuthErrorResponse } from "@/lib/auth/resource-authorization";
import { requireOrganization } from "@/lib/auth/organization-context";

const uuid = (value: string) => Prisma.sql`CAST(${value} AS uuid)`;

function percent(value: unknown, field: string) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`${field} must be between 0 and 100.`);
  return n;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const publisherId = Number(searchParams.get("publisherId"));
    if (!Number.isInteger(publisherId)) return NextResponse.json({ error: "Invalid publisher ID" }, { status: 400 });

    const publisher = await prisma.publishers.findUnique({ where: { id: publisherId } });
    if (!publisher) return NextResponse.json({ error: "Publisher not found" }, { status: 404 });

    const org = uuid(ctx.organizationId);
    const tenant = ctx.tenantId ? uuid(ctx.tenantId) : Prisma.sql`NULL`;
    const relations = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT wp.*, w.title AS work_title, w.work_id AS work_external_id
      FROM public.work_publishers wp
      JOIN public.works w ON w.id = wp.work_id
      WHERE wp.publisher_id = ${publisherId}
        AND wp.organization_id = ${org}
        AND (wp.tenant_id = ${tenant} OR wp.tenant_id IS NULL)
        AND w.organization_id = ${org}
        AND w.is_deleted = false
      ORDER BY wp.created_at ASC
    `);
    return NextResponse.json(relations.map((relation) => ({
      ...relation,
      works: { id: relation.work_id, title: relation.work_title, work_id: relation.work_external_id },
    })));
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/publishers/relations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
      const sharePercent = percent(body.sharePercent, "Publisher share");
      const controlledSharePercent = percent(body.controlledSharePercent, "Publisher controlled share");
      const org = uuid(ctx.organizationId);
      const tenant = ctx.tenantId ? uuid(ctx.tenantId) : Prisma.sql`NULL`;
      const existing = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.work_publishers
        WHERE work_id = ${workId} AND publisher_id = ${publisherId} AND organization_id = ${org}
          AND (tenant_id = ${tenant} OR tenant_id IS NULL)
        LIMIT 1
      `);
      if (existing[0]) return NextResponse.json(existing[0]);
      const created = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.work_publishers
          (work_id, publisher_id, organization_id, tenant_id, share_percent, controlled_share_percent, is_administrator, administration_notes)
        VALUES
          (${workId}, ${publisherId}, ${org}, ${tenant}, ${sharePercent}, ${controlledSharePercent}, ${Boolean(body.isAdministrator)}, ${body.administrationNotes ?? null})
        RETURNING *
      `);
      return NextResponse.json(created[0], { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported relation" }, { status: 400 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    if (err instanceof Error && /must be between 0 and 100/.test(err.message)) return NextResponse.json({ error: err.message }, { status: 400 });
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
      const org = uuid(ctx.organizationId);
      const tenant = ctx.tenantId ? uuid(ctx.tenantId) : Prisma.sql`NULL`;
      await prisma.$executeRaw(Prisma.sql`
        DELETE FROM public.work_publishers
        WHERE work_id = ${entityId} AND publisher_id = ${publisherId} AND organization_id = ${org}
          AND (tenant_id = ${tenant} OR tenant_id IS NULL)
      `);
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
