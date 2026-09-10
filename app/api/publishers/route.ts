import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

const uuid = (value: string) => Prisma.sql`CAST(${value} AS uuid)`;
const PUBLISHER_COLUMNS = Prisma.raw(`id, publisher_id, name, address, contact_email, contact_phone, rights_type, artist_ids, created_at, updated_at, contact_person, organization_id`);

function cleanNullable(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function cleanBody(body: any) {
  return {
    name: typeof body?.name === "string" ? body.name.trim() : "",
    publisherId: cleanNullable(body?.publisher_id),
  };
}

async function getPublisher(id: number, organizationId: string) {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT ${PUBLISHER_COLUMNS}
    FROM public.publishers
    WHERE id = ${id} AND organization_id = ${uuid(organizationId)}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (idStr) {
      const id = Number.parseInt(idStr, 10);
      if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Invalid publisher ID" }, { status: 400 });
      const relation = searchParams.get("relation");
      const publisher = await getPublisher(id, ctx.organizationId);
      if (!publisher) return NextResponse.json({ error: "Publisher not found" }, { status: 404 });
      if (relation === "artists") {
        const artists = await prisma.artists.findMany({ where: { publisher_id: id, organization_id: ctx.organizationId, is_deleted: false }, orderBy: { name: "asc" } });
        return NextResponse.json(artists);
      }
      if (relation === "works") {
        const works = await prisma.works.findMany({ where: { publisher_id: id, organization_id: ctx.organizationId, is_deleted: false }, orderBy: { title: "asc" } });
        return NextResponse.json(works);
      }
      if (relation) return NextResponse.json({ error: "Unsupported relation" }, { status: 400 });
      return NextResponse.json(publisher);
    }

    const skip = Math.max(0, Number.parseInt(searchParams.get("skip") || "0", 10) || 0);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "100", 10) || 100));
    const org = uuid(ctx.organizationId);
    const [items, total] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT ${PUBLISHER_COLUMNS} FROM public.publishers WHERE organization_id = ${org} ORDER BY name ASC OFFSET ${skip} LIMIT ${limit}`),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM public.publishers WHERE organization_id = ${org}`),
    ]);
    return NextResponse.json({ total: Number(total[0]?.count ?? 0), items });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/publishers]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireOrganization();
    const body = cleanBody(await req.json());
    if (!body.name) return NextResponse.json({ error: "Publisher name is required" }, { status: 400 });
    const org = uuid(ctx.organizationId);
    const duplicate = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT id FROM public.publishers WHERE organization_id = ${org} AND LOWER(name) = LOWER(${body.name}) LIMIT 1`);
    if (duplicate.length) return NextResponse.json({ error: `A publisher with the name '${body.name}' already exists.` }, { status: 409 });
    const created = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.publishers (publisher_id, name, organization_id, created_at, updated_at)
      VALUES (${body.publisherId}, ${body.name}, ${org}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING ${PUBLISHER_COLUMNS}
    `);
    return NextResponse.json(created[0], { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/publishers]", err);
    if (err?.code === "23505") return NextResponse.json({ error: "A publisher with this name or ID already exists." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const id = Number.parseInt(searchParams.get("id") || "", 10);
    if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Missing publisher ID" }, { status: 400 });
    const existing = await getPublisher(id, ctx.organizationId);
    if (!existing) return NextResponse.json({ error: "Publisher not found" }, { status: 404 });
    const body = cleanBody(await req.json());
    const name = body.name || existing.name;
    if (!name) return NextResponse.json({ error: "Publisher name is required" }, { status: 400 });
    const org = uuid(ctx.organizationId);
    const duplicate = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT id FROM public.publishers WHERE organization_id = ${org} AND LOWER(name) = LOWER(${name}) AND id <> ${id} LIMIT 1`);
    if (duplicate.length) return NextResponse.json({ error: `A publisher with the name '${name}' already exists.` }, { status: 409 });
    const updated = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.publishers SET name = ${name}, publisher_id = ${body.publisherId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND organization_id = ${org}
      RETURNING ${PUBLISHER_COLUMNS}
    `);
    return NextResponse.json(updated[0]);
  } catch (err: any) {
    console.error("[PUT /api/publishers]", err);
    if (err?.code === "23505") return NextResponse.json({ error: "A publisher with this name or ID already exists." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const id = Number.parseInt(searchParams.get("id") || "", 10);
    if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Missing publisher ID" }, { status: 400 });
    const existing = await getPublisher(id, ctx.organizationId);
    if (!existing) return NextResponse.json({ error: "Publisher not found" }, { status: 404 });
    const org = uuid(ctx.organizationId);
    const [artistCount, workCount, linkedManyToMany] = await Promise.all([
      prisma.artists.count({ where: { publisher_id: id, organization_id: ctx.organizationId, is_deleted: false } }),
      prisma.works.count({ where: { publisher_id: id, organization_id: ctx.organizationId, is_deleted: false } }),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM public.work_publishers WHERE publisher_id = ${id} AND organization_id = ${org}`),
    ]);
    if (artistCount + workCount + Number(linkedManyToMany[0]?.count ?? 0) > 0) return NextResponse.json({ error: "Cannot delete publisher because it is associated with artists or works." }, { status: 409 });
    await prisma.$executeRaw(Prisma.sql`DELETE FROM public.publishers WHERE id = ${id} AND organization_id = ${org}`);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/publishers]", err);
    if (err?.code === "23503") return NextResponse.json({ error: "Cannot delete publisher because it is associated with artists or works." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
