import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import {
  requireOrgAuth,
  requireWorkInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

type WorkContributorInput = {
  partyType: string;
  partyEntityId?: string | null;
  name: string;
  role: string;
  sharePercent?: number | null;
  controlledSharePercent?: number | null;
};

type WorkPublisherInput = {
  publisherId: number;
  sharePercent?: number | null;
  controlledSharePercent?: number | null;
  isAdministrator?: boolean;
  administrationNotes?: string | null;
};

type WorkProRegistrationInput = {
  proId: number;
  proWorkNumber?: string | null;
  registrationStatus?: string;
  registrationDate?: string | null;
  registrationReference?: string | null;
  notes?: string | null;
};

type WorkAggregateInput = {
  workId?: string | null;
  title: string;
  iswcCode?: string | null;
  workType?: string | null;
  status?: string | null;
  originalWorkTitle?: string | null;
  firstReleaseDate?: string | null;
  notes?: string | null;
  contributors?: WorkContributorInput[];
  publishers?: WorkPublisherInput[];
  proRegistrations?: WorkProRegistrationInput[];
  trackIds?: number[];
};

const json = (value: unknown) => JSON.stringify(value);

function validateAggregate(body: WorkAggregateInput) {
  if (!body.title?.trim()) return "Title is required.";

  for (const contributor of body.contributors ?? []) {
    if (!contributor.partyType || !contributor.name?.trim() || !contributor.role?.trim()) {
      return "Every contributor requires party type, name, and role.";
    }
    if (contributor.sharePercent != null && (contributor.sharePercent < 0 || contributor.sharePercent > 100)) {
      return "Contributor share must be between 0 and 100.";
    }
    if (
      contributor.controlledSharePercent != null &&
      (contributor.controlledSharePercent < 0 || contributor.controlledSharePercent > 100)
    ) {
      return "Contributor controlled share must be between 0 and 100.";
    }
  }

  for (const publisher of body.publishers ?? []) {
    if (!Number.isInteger(publisher.publisherId)) return "Every publisher requires a valid publisher ID.";
    if (publisher.sharePercent != null && (publisher.sharePercent < 0 || publisher.sharePercent > 100)) {
      return "Publisher share must be between 0 and 100.";
    }
    if (
      publisher.controlledSharePercent != null &&
      (publisher.controlledSharePercent < 0 || publisher.controlledSharePercent > 100)
    ) {
      return "Publisher controlled share must be between 0 and 100.";
    }
  }

  for (const registration of body.proRegistrations ?? []) {
    if (!Number.isInteger(registration.proId)) return "Every PRO registration requires a valid PRO ID.";
  }

  if (body.trackIds?.some((id) => !Number.isInteger(id))) return "Linked track IDs must be integers.";
  return null;
}

async function getWorkAggregate(workId: number, organizationId: string) {
  const workRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.works
    WHERE id = ${workId} AND organization_id = ${organizationId} AND is_deleted = false
    LIMIT 1
  `);
  if (!workRows[0]) return null;

  const [contributors, publishers, proRegistrations, recordings] = await Promise.all([
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.work_contributors
      WHERE work_id = ${workId} AND organization_id = ${organizationId}
      ORDER BY created_at ASC
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT wp.*, p.name AS publisher_name, p.publisher_id AS publisher_external_id
      FROM public.work_publishers wp
      JOIN public.publishers p ON p.id = wp.publisher_id
      WHERE wp.work_id = ${workId} AND wp.organization_id = ${organizationId}
      ORDER BY wp.created_at ASC
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT wr.*, p.name AS pro_name, p.pro_id AS pro_external_id
      FROM public.work_pro_registrations wr
      JOIN public.pros p ON p.id = wr.pro_id
      WHERE wr.work_id = ${workId} AND wr.organization_id = ${organizationId}
      ORDER BY wr.created_at ASC
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT t.* FROM public.tracks t
      WHERE t.work_id = ${workId} AND (t.tenant_id = ${organizationId} OR t.tenant_id IS NULL)
      ORDER BY t.created_at ASC
    `),
  ]);

  return {
    ...workRows[0],
    contributors,
    publishers,
    proRegistrations,
    recordings,
  };
}

async function replaceAggregateRelations(
  tx: Prisma.TransactionClient,
  workId: number,
  organizationId: string,
  body: WorkAggregateInput,
) {
  await tx.$executeRaw(Prisma.sql`DELETE FROM public.work_contributors WHERE work_id = ${workId} AND organization_id = ${organizationId}`);
  await tx.$executeRaw(Prisma.sql`DELETE FROM public.work_publishers WHERE work_id = ${workId} AND organization_id = ${organizationId}`);
  await tx.$executeRaw(Prisma.sql`DELETE FROM public.work_pro_registrations WHERE work_id = ${workId} AND organization_id = ${organizationId}`);

  for (const contributor of body.contributors ?? []) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.work_contributors
        (work_id, organization_id, tenant_id, party_type, party_entity_id, name, role, share_percent, controlled_share_percent)
      VALUES
        (${workId}, ${organizationId}, ${organizationId}, ${contributor.partyType}, ${contributor.partyEntityId ?? null}, ${contributor.name.trim()}, ${contributor.role.trim()}, ${contributor.sharePercent ?? null}, ${contributor.controlledSharePercent ?? null})
    `);
  }

  for (const publisher of body.publishers ?? []) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.work_publishers
        (work_id, publisher_id, organization_id, tenant_id, share_percent, controlled_share_percent, is_administrator, administration_notes)
      VALUES
        (${workId}, ${publisher.publisherId}, ${organizationId}, ${organizationId}, ${publisher.sharePercent ?? null}, ${publisher.controlledSharePercent ?? null}, ${publisher.isAdministrator ?? false}, ${publisher.administrationNotes ?? null})
    `);
  }

  for (const registration of body.proRegistrations ?? []) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.work_pro_registrations
        (work_id, pro_id, organization_id, tenant_id, pro_work_number, registration_status, registration_date, registration_reference, notes)
      VALUES
        (${workId}, ${registration.proId}, ${organizationId}, ${organizationId}, ${registration.proWorkNumber ?? null}, ${registration.registrationStatus ?? "pending"}, ${registration.registrationDate ?? null}, ${registration.registrationReference ?? null}, ${registration.notes ?? null})
    `);
  }

  if (body.trackIds) {
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.tracks
      SET work_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE work_id = ${workId} AND (tenant_id = ${organizationId} OR tenant_id IS NULL)
    `);

    for (const trackId of body.trackIds) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.tracks
        SET work_id = ${workId}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${trackId} AND (tenant_id = ${organizationId} OR tenant_id IS NULL)
      `);
    }
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = Number.parseInt(idStr, 10);
      if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid work ID" }, { status: 400 });
      const work = await getWorkAggregate(id, orgId);
      if (!work) return NextResponse.json({ error: "Work not found" }, { status: 404 });
      return NextResponse.json(work);
    }

    const skip = Math.max(0, Number.parseInt(searchParams.get("skip") || "0", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "100", 10)));
    const works = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT w.*, COUNT(t.id)::int AS recording_count
      FROM public.works w
      LEFT JOIN public.tracks t ON t.work_id = w.id
      WHERE w.organization_id = ${orgId} AND w.is_deleted = false
      GROUP BY w.id
      ORDER BY w.created_at DESC
      OFFSET ${skip} LIMIT ${limit}
    `);
    const totalRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*)::int AS total FROM public.works
      WHERE organization_id = ${orgId} AND is_deleted = false
    `);
    return NextResponse.json({ total: totalRows[0]?.total ?? 0, items: works });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrgAuth();
    const body = (await req.json()) as WorkAggregateInput;
    const validationError = validateAggregate(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const existing = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM public.works
      WHERE organization_id = ${ctx.organizationId}
        AND is_deleted = false
        AND title = ${body.title.trim()}
      LIMIT 1
    `);
    if (existing[0]) return NextResponse.json({ error: `A musical work with the title '${body.title}' already exists.` }, { status: 409 });

    const work = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.works
          (work_id, title, iswc_code, organization_id, tenant_id, is_deleted, work_type, status, original_work_title, first_release_date, notes)
        VALUES
          (${body.workId ?? null}, ${body.title.trim()}, ${body.iswcCode ?? null}, ${ctx.organizationId}, ${ctx.organizationId}, false, ${body.workType ?? null}, ${body.status ?? "draft"}, ${body.originalWorkTitle ?? null}, ${body.firstReleaseDate ?? null}, ${body.notes ?? null})
        RETURNING id
      `);
      const workId = Number(inserted[0].id);
      await replaceAggregateRelations(tx, workId, ctx.organizationId, body);
      return workId;
    });

    return NextResponse.json(await getWorkAggregate(work, ctx.organizationId), { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/works]", err);
    if (err.code === "P2002" || err.code === "23505") return NextResponse.json({ error: "A musical work with this identity already exists." }, { status: 409 });
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing work ID" }, { status: 400 });
    const id = Number.parseInt(idStr, 10);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid work ID" }, { status: 400 });

    const body = (await req.json()) as WorkAggregateInput;
    const validationError = validateAggregate(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    await requireWorkInOrg(id, ctx);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.works
        SET work_id = ${body.workId ?? null},
            title = ${body.title.trim()},
            iswc_code = ${body.iswcCode ?? null},
            work_type = ${body.workType ?? null},
            status = ${body.status ?? "draft"},
            original_work_title = ${body.originalWorkTitle ?? null},
            first_release_date = ${body.firstReleaseDate ?? null},
            notes = ${body.notes ?? null},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND organization_id = ${ctx.organizationId} AND is_deleted = false
      `);
      await replaceAggregateRelations(tx, id, ctx.organizationId, body);
    });

    return NextResponse.json(await getWorkAggregate(id, ctx.organizationId));
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[PUT /api/works]", err);
    if (err.code === "P2002" || err.code === "23505") return NextResponse.json({ error: "A database integrity error occurred." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing work ID" }, { status: 400 });
    const id = Number.parseInt(idStr, 10);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid work ID" }, { status: 400 });

    await requireWorkInOrg(id, ctx);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.tracks
        SET work_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE work_id = ${id} AND (tenant_id = ${ctx.organizationId} OR tenant_id IS NULL)
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.works SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND organization_id = ${ctx.organizationId}
      `);
    });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[DELETE /api/works]", err);
    return NextResponse.json({ error: "Cannot delete work due to server error" }, { status: 409 });
  }
}
