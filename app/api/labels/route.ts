import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { parsePositiveIntId } from "@/lib/catalog/label-scope";

/**
 * Labels are organization-owned catalogue entities.
 * All reads and mutations are scoped to the active organization.
 * The SQL bridge is intentional until Prisma schema/client reconciliation
 * includes labels.organization_id.
 */

const LABEL_COLUMNS = `
  id,
  label_id,
  name,
  address,
  contact_email,
  contact_phone,
  website,
  artist_ids,
  created_at,
  updated_at,
  logo_url,
  contact_person,
  organization_id
`;

function cleanNullable(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function cleanBody(body: any) {
  return {
    name: typeof body?.name === "string" ? body.name.trim() : "",
    labelId: cleanNullable(body?.label_id),
    contactPerson: cleanNullable(body?.contact_person),
    contactEmail: cleanNullable(body?.contact_email),
    contactPhone: cleanNullable(body?.contact_phone),
    website: cleanNullable(body?.website),
    address: cleanNullable(body?.address),
    logoUrl: cleanNullable(body?.logo_url),
  };
}

async function getLabel(id: number, organizationId: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT ${prisma.$queryRawUnsafe(LABEL_COLUMNS)}
    FROM labels
    WHERE id = ${id}
      AND organization_id = CAST(${organizationId} AS uuid)
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parsePositiveIntId(idStr);
      if (!id) return NextResponse.json({ error: "Invalid label ID" }, { status: 400 });
      const relation = searchParams.get("relation");

      if (relation === "releases") {
        const releases = await prisma.releases.findMany({
          where: { label_id: id, organization_id: ctx.organizationId, is_deleted: false },
          orderBy: { title: "asc" },
        });
        return NextResponse.json(releases);
      }

      if (relation === "artists") {
        const artists = await prisma.artists.findMany({
          where: { label_id: id, organization_id: ctx.organizationId, is_deleted: false },
          orderBy: { name: "asc" },
        });
        return NextResponse.json(artists);
      }

      if (relation) {
        return NextResponse.json({ error: "Unsupported relation" }, { status: 400 });
      }

      const label = await getLabel(id, ctx.organizationId);
      if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });
      return NextResponse.json(label);
    }

    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100", 10) || 100));

    const [labels, total] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT ${prisma.$queryRawUnsafe(LABEL_COLUMNS)}
        FROM labels
        WHERE organization_id = CAST(${ctx.organizationId} AS uuid)
        ORDER BY name ASC
        OFFSET ${skip}
        LIMIT ${limit}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM labels
        WHERE organization_id = CAST(${ctx.organizationId} AS uuid)
      `,
    ]);

    return NextResponse.json({ total: Number(total[0]?.count ?? 0), items: labels });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/labels]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireOrganization();
    const body = cleanBody(await req.json());

    if (!body.name) {
      return NextResponse.json({ error: "Label name is required" }, { status: 400 });
    }

    const duplicate = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM labels
      WHERE organization_id = CAST(${ctx.organizationId} AS uuid)
        AND LOWER(name) = LOWER(${body.name})
      LIMIT 1
    `;
    if (duplicate.length) {
      return NextResponse.json(
        { error: `A label with the name '${body.name}' already exists.` },
        { status: 409 },
      );
    }

    const created = await prisma.$queryRaw<any[]>`
      INSERT INTO labels (
        label_id,
        name,
        address,
        contact_email,
        contact_phone,
        website,
        logo_url,
        contact_person,
        organization_id,
        created_at,
        updated_at
      )
      VALUES (
        ${body.labelId},
        ${body.name},
        ${body.address},
        ${body.contactEmail},
        ${body.contactPhone},
        ${body.website},
        ${body.logoUrl},
        ${body.contactPerson},
        CAST(${ctx.organizationId} AS uuid),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING ${prisma.$queryRawUnsafe(LABEL_COLUMNS)}
    `;

    return NextResponse.json(created[0], { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/labels]", err);
    if (err?.code === "P2002" || err?.code === "23505") {
      return NextResponse.json({ error: "A label with this name or ID already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const id = parsePositiveIntId(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing label ID" }, { status: 400 });

    const existing = await getLabel(id, ctx.organizationId);
    if (!existing) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    const body = cleanBody(await req.json());
    if (!body.name) return NextResponse.json({ error: "Label name is required" }, { status: 400 });

    const duplicate = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM labels
      WHERE organization_id = CAST(${ctx.organizationId} AS uuid)
        AND LOWER(name) = LOWER(${body.name})
        AND id <> ${id}
      LIMIT 1
    `;
    if (duplicate.length) {
      return NextResponse.json(
        { error: `A label with the name '${body.name}' already exists.` },
        { status: 409 },
      );
    }

    const updated = await prisma.$queryRaw<any[]>`
      UPDATE labels
      SET
        label_id = ${body.labelId},
        name = ${body.name},
        address = ${body.address},
        contact_email = ${body.contactEmail},
        contact_phone = ${body.contactPhone},
        website = ${body.website},
        logo_url = ${body.logoUrl},
        contact_person = ${body.contactPerson},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND organization_id = CAST(${ctx.organizationId} AS uuid)
      RETURNING ${prisma.$queryRawUnsafe(LABEL_COLUMNS)}
    `;

    return NextResponse.json(updated[0]);
  } catch (err: any) {
    console.error("[PUT /api/labels]", err);
    if (err?.code === "P2002" || err?.code === "23505") {
      return NextResponse.json({ error: "A label with this name or ID already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const id = parsePositiveIntId(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing label ID" }, { status: 400 });

    const existing = await getLabel(id, ctx.organizationId);
    if (!existing) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    const linked = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM artists
      WHERE label_id = ${id}
        AND organization_id = CAST(${ctx.organizationId} AS uuid)
        AND is_deleted = false
    `;
    const linkedReleases = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM releases
      WHERE label_id = ${id}
        AND organization_id = CAST(${ctx.organizationId} AS uuid)
        AND is_deleted = false
    `;
    if (Number(linked[0]?.count ?? 0) + Number(linkedReleases[0]?.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete label because it is associated with artists or releases." },
        { status: 409 },
      );
    }

    await prisma.$executeRaw`
      DELETE FROM labels
      WHERE id = ${id}
        AND organization_id = CAST(${ctx.organizationId} AS uuid)
    `;
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/labels]", err);
    if (err?.code === "P2003" || err?.code === "P2014" || err?.code === "23503") {
      return NextResponse.json(
        { error: "Cannot delete label because it is associated with artists or releases." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
