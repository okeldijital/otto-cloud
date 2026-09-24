import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireOrganization } from "@/lib/auth/organization-context";
import { requireReleaseInOrg } from "@/lib/auth/resource-authorization";
import { prisma } from "@/lib/prisma";

const roles = ["Main Artist", "Featured Artist", "Remixer", "Composer", "Other"] as const;
const financialTypes = ["Income", "Expense", "Advance", "Royalty", "Other"] as const;

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? Number(item) : item
  ));
}

function idFrom(req: Request) {
  const value = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(value) || value <= 0) throw new Error("Invalid release ID");
  return value;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const releaseId = idFrom(req);
    await requireReleaseInOrg(releaseId, ctx);
    const [documents, financials, media, artistRoles, contract] = await Promise.all([
      prisma.$queryRaw<any[]>`SELECT rd.id, rd.file_name, rd.original_name, rd.mime_type, rd.file_size, rd.category, rd.description, rd.created_at, a.id AS attachment_id FROM release_documents rd LEFT JOIN attachments a ON a."organizationId" = rd.organization_id::text AND a."entityType" = 'release' AND a."entityId" = CAST(rd.release_id AS TEXT) AND a."storageKey" = rd.storage_key AND a.purpose = 'attachment' WHERE rd.organization_id = ${ctx.organizationId}::uuid AND rd.release_id = ${releaseId} ORDER BY rd.created_at DESC`,
      prisma.$queryRaw<any[]>`SELECT id, entry_type, description, amount, currency, entry_date, notes, created_at FROM release_financial_entries WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId} ORDER BY entry_date DESC NULLS LAST, created_at DESC`,
      prisma.$queryRaw<any[]>`SELECT provider, label, url, updated_at FROM release_media_links WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId} LIMIT 1`,
      prisma.$queryRaw<any[]>`SELECT artist_id, role FROM release_artist_roles WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId} ORDER BY artist_id`,
      prisma.$queryRaw<any[]>`SELECT contract_id, signed_at FROM release_contract_links WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId} LIMIT 1`,
    ]);
    return NextResponse.json(jsonSafe({ documents, financials, media: media[0] || null, artistRoles, contract: contract[0] || null }));
  } catch (err: any) {
    const status = err?.status === 404 ? 404 : err?.status === 403 ? 403 : err?.message === "Invalid release ID" ? 400 : 500;
    console.error("[GET /api/releases/core]", err);
    return NextResponse.json({ error: status === 500 ? "Internal server error" : err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const releaseId = idFrom(req);
    await requireReleaseInOrg(releaseId, ctx);
    const body = await req.json();
    const action = body?.action;
    const userId = String((session.user as any).id || "");

    if (action === "media") {
      const url = String(body.url || "").trim();
      if (!url) return NextResponse.json({ error: "Media URL is required." }, { status: 400 });
      new URL(url);
      const provider = String(body.provider || "Other").trim().slice(0, 80) || "Other";
      const label = body.label ? String(body.label).trim().slice(0, 120) : null;
      await prisma.$executeRaw`INSERT INTO release_media_links (organization_id, release_id, provider, label, url, updated_by, updated_at) VALUES (${ctx.organizationId}::uuid, ${releaseId}, ${provider}, ${label}, ${url}, ${userId}, NOW()) ON CONFLICT (release_id) DO UPDATE SET provider = EXCLUDED.provider, label = EXCLUDED.label, url = EXCLUDED.url, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
    } else if (action === "document") {
      if (!body.storage_key || !body.original_name) return NextResponse.json({ error: "Document storage key and name are required." }, { status: 400 });
      const category = String(body.category || "Other").trim().slice(0, 100) || "Other";
      const description = body.description ? String(body.description).trim().slice(0, 120) : null;
      if (category === "Other" && !description) return NextResponse.json({ error: "A short description is required for Other documents." }, { status: 400 });
      await prisma.$executeRaw`INSERT INTO release_documents (organization_id, release_id, storage_key, file_name, original_name, mime_type, file_size, category, description, created_by) VALUES (${ctx.organizationId}::uuid, ${releaseId}, ${String(body.storage_key)}, ${String(body.file_name || body.original_name)}, ${String(body.original_name)}, ${body.mime_type ? String(body.mime_type) : null}, ${body.file_size ? Number(body.file_size) : null}, ${category}, ${description}, ${userId})`;
    } else if (action === "financial") {
      const type = String(body.entry_type || "Expense");
      if (!financialTypes.includes(type as any)) return NextResponse.json({ error: "Invalid financial entry type." }, { status: 400 });
      const description = String(body.description || "").trim();
      const amount = Number(body.amount);
      if (!description || !Number.isFinite(amount)) return NextResponse.json({ error: "Description and a valid amount are required." }, { status: 400 });
      await prisma.$executeRaw`INSERT INTO release_financial_entries (organization_id, release_id, entry_type, description, amount, currency, entry_date, notes, created_by) VALUES (${ctx.organizationId}::uuid, ${releaseId}, ${type}, ${description}, ${amount}, ${String(body.currency || "ZAR").slice(0, 12)}, ${body.entry_date || null}, ${body.notes ? String(body.notes).trim() : null}, ${userId})`;
    } else if (action === "artist-role") {
      const artistId = Number(body.artist_id);
      const role = String(body.role || "Main Artist");
      if (!Number.isInteger(artistId) || artistId <= 0 || !roles.includes(role as any)) return NextResponse.json({ error: "Invalid artist role." }, { status: 400 });
      await prisma.$executeRaw`INSERT INTO release_artist_roles (organization_id, release_id, artist_id, role, updated_at) VALUES (${ctx.organizationId}::uuid, ${releaseId}, ${artistId}, ${role}, NOW()) ON CONFLICT (organization_id, release_id, artist_id) DO UPDATE SET role = EXCLUDED.role, updated_at = EXCLUDED.updated_at`;
    } else if (action === "contract") {
      const contractId = Number(body.contract_id);
      if (!Number.isInteger(contractId) || contractId <= 0) return NextResponse.json({ error: "A contract is required." }, { status: 400 });
      await prisma.$executeRaw`INSERT INTO release_contract_links (organization_id, release_id, contract_id, signed_at, updated_by, updated_at) VALUES (${ctx.organizationId}::uuid, ${releaseId}, ${contractId}, ${body.signed_at || null}, ${userId}, NOW()) ON CONFLICT (release_id) DO UPDATE SET contract_id = EXCLUDED.contract_id, signed_at = EXCLUDED.signed_at, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at`;
    } else {
      return NextResponse.json({ error: "Unsupported release core action." }, { status: 400 });
    }
    return GET(req);
  } catch (err: any) {
    console.error("[POST /api/releases/core]", err);
    const status = err?.status === 404 ? 404 : err?.status === 403 ? 403 : err?.status === 401 ? 401 : err?.message === "Invalid release ID" ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? "Internal server error" : err.message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrganization();
    const releaseId = idFrom(req);
    await requireReleaseInOrg(releaseId, ctx);
    const body = await req.json();
    const id = Number(body.id);
    switch (body.action) {
      case "document": await prisma.$executeRaw`DELETE FROM release_documents WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId} AND id = ${id}`; break;
      case "financial": await prisma.$executeRaw`DELETE FROM release_financial_entries WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId} AND id = ${id}`; break;
      case "artist-role": await prisma.$executeRaw`DELETE FROM release_artist_roles WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId} AND artist_id = ${id}`; break;
      case "media": await prisma.$executeRaw`DELETE FROM release_media_links WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId}`; break;
      case "contract": await prisma.$executeRaw`DELETE FROM release_contract_links WHERE organization_id = ${ctx.organizationId}::uuid AND release_id = ${releaseId}`; break;
      default: return NextResponse.json({ error: "Unsupported release core action." }, { status: 400 });
    }
    return GET(req);
  } catch (err: any) {
    console.error("[DELETE /api/releases/core]", err);
    return NextResponse.json({ error: "Unable to update release data." }, { status: 500 });
  }
}
