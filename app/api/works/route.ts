import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import { requireOrgAuth, requireWorkInOrg, resourceAuthErrorResponse } from "@/lib/auth/resource-authorization";

type WorkContributorInput = { partyType: string; partyEntityId?: string | null; name: string; role: string; sharePercent?: number | null; controlledSharePercent?: number | null; contactEmail?: string | null; contactPhone?: string | null; ipiNumber?: string | null; proId?: number | null; publisherId?: number | null };
type WorkPublisherInput = { publisherId: number; sharePercent?: number | null; controlledSharePercent?: number | null; isAdministrator?: boolean; administrationNotes?: string | null };
type WorkProRegistrationInput = { proId: number; proWorkNumber?: string | null; registrationStatus?: string; registrationDate?: string | null; registrationReference?: string | null; notes?: string | null };
type WorkAggregateInput = { workId?: string | null; title: string; iswcCode?: string | null; workType?: string | null; status?: string | null; originalWorkTitle?: string | null; firstReleaseDate?: string | null; notes?: string | null; contributors?: WorkContributorInput[]; publishers?: WorkPublisherInput[]; proRegistrations?: WorkProRegistrationInput[]; trackIds?: number[] };
const uuid = (value: string) => Prisma.sql`CAST(${value} AS uuid)`;

function validateAggregate(body: WorkAggregateInput) {
  if (!body.title?.trim()) return "Title is required.";
  for (const c of body.contributors ?? []) {
    if (!c.partyType || !c.name?.trim() || !c.role?.trim()) return "Every contributor requires party type, name, and role.";
    if (c.sharePercent != null && (c.sharePercent < 0 || c.sharePercent > 100)) return "Contributor share must be between 0 and 100.";
    if (c.controlledSharePercent != null && (c.controlledSharePercent < 0 || c.controlledSharePercent > 100)) return "Contributor controlled share must be between 0 and 100.";
    if (c.proId != null && !Number.isInteger(c.proId)) return "Contributor PRO must be a valid PRO ID.";
    if (c.publisherId != null && !Number.isInteger(c.publisherId)) return "Contributor publisher must be a valid publisher ID.";
  }
  for (const p of body.publishers ?? []) {
    if (!Number.isInteger(p.publisherId)) return "Every publisher requires a valid publisher ID.";
    if (p.sharePercent != null && (p.sharePercent < 0 || p.sharePercent > 100)) return "Publisher share must be between 0 and 100.";
    if (p.controlledSharePercent != null && (p.controlledSharePercent < 0 || p.controlledSharePercent > 100)) return "Publisher controlled share must be between 0 and 100.";
  }
  for (const p of body.proRegistrations ?? []) if (!Number.isInteger(p.proId)) return "Every PRO registration requires a valid PRO ID.";
  if (body.trackIds?.some((id) => !Number.isInteger(id))) return "Linked track IDs must be integers.";
  return null;
}

async function getWorkAggregate(workId: number, organizationId: string, tenantId: string | null) {
  const org = uuid(organizationId);
  const tenant = tenantId ? uuid(tenantId) : Prisma.sql`NULL`;
  const workRows = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.works WHERE id = ${workId} AND organization_id = ${org} AND is_deleted = false LIMIT 1`);
  if (!workRows[0]) return null;
  const [contributors, publishers, proRegistrations, recordings] = await Promise.all([
    prisma.$queryRaw<any[]>(Prisma.sql`SELECT wc.*, p.name AS pro_name, p.pro_id AS pro_external_id, pub.name AS publisher_name, pub.publisher_id AS publisher_external_id FROM public.work_contributors wc LEFT JOIN public.pros p ON p.id = wc.pro_id LEFT JOIN public.publishers pub ON pub.id = wc.publisher_id WHERE wc.work_id = ${workId} AND wc.organization_id = ${org} AND (wc.tenant_id = ${tenant} OR wc.tenant_id IS NULL) ORDER BY wc.created_at ASC`),
    prisma.$queryRaw<any[]>(Prisma.sql`SELECT wp.*, p.name AS publisher_name, p.publisher_id AS publisher_external_id FROM public.work_publishers wp JOIN public.publishers p ON p.id = wp.publisher_id WHERE wp.work_id = ${workId} AND wp.organization_id = ${org} AND (wp.tenant_id = ${tenant} OR wp.tenant_id IS NULL) ORDER BY wp.created_at ASC`),
    prisma.$queryRaw<any[]>(Prisma.sql`SELECT wr.*, p.name AS pro_name, p.pro_id AS pro_external_id FROM public.work_pro_registrations wr JOIN public.pros p ON p.id = wr.pro_id WHERE wr.work_id = ${workId} AND wr.organization_id = ${org} AND (wr.tenant_id = ${tenant} OR wr.tenant_id IS NULL) ORDER BY wr.created_at ASC`),
    prisma.$queryRaw<any[]>(Prisma.sql`SELECT t.* FROM public.tracks t WHERE t.work_id = ${workId} AND (t.tenant_id = ${tenant} OR t.tenant_id IS NULL) ORDER BY t.created_at ASC`),
  ]);
  return { ...workRows[0], contributors, publishers, proRegistrations, recordings };
}

async function replaceAggregateRelations(tx: Prisma.TransactionClient, workId: number, organizationId: string, tenantId: string | null, body: WorkAggregateInput) {
  const org = uuid(organizationId);
  const tenant = tenantId ? uuid(tenantId) : Prisma.sql`NULL`;
  await tx.$executeRaw(Prisma.sql`DELETE FROM public.work_contributors WHERE work_id = ${workId} AND organization_id = ${org}`);
  await tx.$executeRaw(Prisma.sql`DELETE FROM public.work_publishers WHERE work_id = ${workId} AND organization_id = ${org}`);
  await tx.$executeRaw(Prisma.sql`DELETE FROM public.work_pro_registrations WHERE work_id = ${workId} AND organization_id = ${org}`);
  for (const c of body.contributors ?? []) await tx.$executeRaw(Prisma.sql`INSERT INTO public.work_contributors (work_id, organization_id, tenant_id, party_type, party_entity_id, name, role, share_percent, controlled_share_percent, contact_email, contact_phone, ipi_number, pro_id, publisher_id) VALUES (${workId}, ${org}, ${tenant}, ${c.partyType}, ${c.partyEntityId ?? null}, ${c.name.trim()}, ${c.role.trim()}, ${c.sharePercent ?? null}, ${c.controlledSharePercent ?? null}, ${c.contactEmail ?? null}, ${c.contactPhone ?? null}, ${c.ipiNumber ?? null}, ${c.proId ?? null}, ${c.publisherId ?? null})`);
  for (const p of body.publishers ?? []) await tx.$executeRaw(Prisma.sql`INSERT INTO public.work_publishers (work_id, publisher_id, organization_id, tenant_id, share_percent, controlled_share_percent, is_administrator, administration_notes) VALUES (${workId}, ${p.publisherId}, ${org}, ${tenant}, ${p.sharePercent ?? null}, ${p.controlledSharePercent ?? null}, ${p.isAdministrator ?? false}, ${p.administrationNotes ?? null})`);
  for (const p of body.proRegistrations ?? []) await tx.$executeRaw(Prisma.sql`INSERT INTO public.work_pro_registrations (work_id, pro_id, organization_id, tenant_id, pro_work_number, registration_status, registration_date, registration_reference, notes) VALUES (${workId}, ${p.proId}, ${org}, ${tenant}, ${p.proWorkNumber ?? null}, ${p.registrationStatus ?? "pending"}, ${p.registrationDate ?? null}, ${p.registrationReference ?? null}, ${p.notes ?? null})`);
  if (body.trackIds) {
    await tx.$executeRaw(Prisma.sql`UPDATE public.tracks SET work_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE work_id = ${workId} AND (tenant_id = ${tenant} OR tenant_id IS NULL)`);
    for (const trackId of body.trackIds) await tx.$executeRaw(Prisma.sql`UPDATE public.tracks SET work_id = ${workId}, updated_at = CURRENT_TIMESTAMP WHERE id = ${trackId} AND (tenant_id = ${tenant} OR tenant_id IS NULL)`);
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const org = uuid(ctx.organizationId);
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (idStr) {
      const id = Number.parseInt(idStr, 10);
      if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid work ID" }, { status: 400 });
      const work = await getWorkAggregate(id, ctx.organizationId, ctx.tenantId);
      if (!work) return NextResponse.json({ error: "Work not found" }, { status: 404 });
      return NextResponse.json(work);
    }
    const skip = Math.max(0, Number.parseInt(searchParams.get("skip") || "0", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "100", 10)));
    const tenant = ctx.tenantId ? uuid(ctx.tenantId) : Prisma.sql`NULL`;
    const works = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT w.*, COUNT(t.id)::int AS recording_count FROM public.works w LEFT JOIN public.tracks t ON t.work_id = w.id AND (t.tenant_id = ${tenant} OR t.tenant_id IS NULL) WHERE w.organization_id = ${org} AND w.is_deleted = false GROUP BY w.id ORDER BY w.created_at DESC OFFSET ${skip} LIMIT ${limit}`);
    const totalRows = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT COUNT(*)::int AS total FROM public.works WHERE organization_id = ${org} AND is_deleted = false`);
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
    const org = uuid(ctx.organizationId);
    const existing = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.works WHERE organization_id = ${org} AND is_deleted = false AND title = ${body.title.trim()} LIMIT 1`);
    if (existing[0]) return NextResponse.json({ error: `A musical work with the title '${body.title}' already exists.` }, { status: 409 });
    const work = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<any[]>(Prisma.sql`INSERT INTO public.works (work_id, title, iswc_code, organization_id, tenant_id, is_deleted, work_type, status, original_work_title, first_release_date, notes) VALUES (${body.workId ?? null}, ${body.title.trim()}, ${body.iswcCode ?? null}, ${org}, ${ctx.tenantId ? uuid(ctx.tenantId) : Prisma.sql`NULL`}, false, ${body.workType ?? null}, ${body.status ?? "draft"}, ${body.originalWorkTitle ?? null}, ${body.firstReleaseDate ?? null}, ${body.notes ?? null}) RETURNING id`);
      const workId = Number(inserted[0].id);
      await replaceAggregateRelations(tx, workId, ctx.organizationId, ctx.tenantId, body);
      return workId;
    });
    return NextResponse.json(await getWorkAggregate(work, ctx.organizationId, ctx.tenantId), { status: 201 });
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
    const org = uuid(ctx.organizationId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`UPDATE public.works SET work_id = ${body.workId ?? null}, title = ${body.title.trim()}, iswc_code = ${body.iswcCode ?? null}, work_type = ${body.workType ?? null}, status = ${body.status ?? "draft"}, original_work_title = ${body.originalWorkTitle ?? null}, first_release_date = ${body.firstReleaseDate ?? null}, notes = ${body.notes ?? null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} AND organization_id = ${org} AND is_deleted = false`);
      await replaceAggregateRelations(tx, id, ctx.organizationId, ctx.tenantId, body);
    });
    return NextResponse.json(await getWorkAggregate(id, ctx.organizationId, ctx.tenantId));
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
    const org = uuid(ctx.organizationId);
    const tenant = ctx.tenantId ? uuid(ctx.tenantId) : Prisma.sql`NULL`;
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`UPDATE public.tracks SET work_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE work_id = ${id} AND (tenant_id = ${tenant} OR tenant_id IS NULL)`);
      await tx.$executeRaw(Prisma.sql`UPDATE public.works SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} AND organization_id = ${org}`);
    });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[DELETE /api/works]", err);
    return NextResponse.json({ error: "Cannot delete work due to server error" }, { status: 409 });
  }
}