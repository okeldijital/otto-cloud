import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireActorUserId,
  requireArtistInOrg,
  requireOrgAuth,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

const RECORD_TYPES = new Set(["advance", "payment", "expense", "other"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOrgAuth();
    const artistId = Number((await params).id);
    await requireArtistInOrg(artistId, ctx);

    const records = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, record_type, amount, currency, transaction_date, description,
             reference, notes, created_at, updated_at
      FROM "artist_financial_records"
      WHERE organization_id = ${Prisma.raw(`'${ctx.organizationId}'::uuid`)}
        AND artist_id = ${artistId}
      ORDER BY transaction_date DESC, id DESC
    `);

    const totalsByCurrency: Record<string, { advances: number; payments: number; expenses: number; other: number }> = {};
    for (const record of records) {
      const currency = String(record.currency || "ZAR").toUpperCase();
      const bucket = totalsByCurrency[currency] || { advances: 0, payments: 0, expenses: 0, other: 0 };
      const amount = Number(record.amount || 0);
      if (record.record_type === "advance") bucket.advances += amount;
      else if (record.record_type === "payment") bucket.payments += amount;
      else if (record.record_type === "expense") bucket.expenses += amount;
      else bucket.other += amount;
      totalsByCurrency[currency] = bucket;
    }

    return NextResponse.json({ items: records, totalsByCurrency });
  } catch (err) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status !== 500) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/artists/[id]/financials]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOrgAuth();
    const artistId = Number((await params).id);
    await requireArtistInOrg(artistId, ctx);
    const userId = requireActorUserId(ctx);
    const body = await req.json();

    const recordType = String(body?.record_type || "advance").trim().toLowerCase();
    const amount = Number(body?.amount);
    const currency = String(body?.currency || "ZAR").trim().toUpperCase();
    const transactionDate = String(body?.transaction_date || "").trim();
    const description = String(body?.description || "").trim();

    if (!RECORD_TYPES.has(recordType)) {
      return NextResponse.json({ error: "Invalid financial record type" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "Currency must be a 3-letter code" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
      return NextResponse.json({ error: "Transaction date is required" }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO "artist_financial_records"
        (organization_id, artist_id, record_type, amount, currency, transaction_date,
         description, reference, notes, created_by)
      VALUES
        (${Prisma.raw(`'${ctx.organizationId}'::uuid`)}, ${artistId}, ${recordType},
         ${amount}, ${currency}, ${transactionDate}::date, ${description},
         ${String(body?.reference || "").trim() || null},
         ${String(body?.notes || "").trim() || null}, ${String(userId)})
      RETURNING id, record_type, amount, currency, transaction_date, description,
                reference, notes, created_at, updated_at
    `);

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status !== 500) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[POST /api/artists/[id]/financials]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOrgAuth();
    const artistId = Number((await params).id);
    await requireArtistInOrg(artistId, ctx);
    const recordId = Number(new URL(req.url).searchParams.get("recordId"));
    if (!Number.isSafeInteger(recordId) || recordId <= 0) {
      return NextResponse.json({ error: "Invalid financial record id" }, { status: 400 });
    }

    const result = await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "artist_financial_records"
      WHERE id = ${recordId}
        AND organization_id = ${Prisma.raw(`'${ctx.organizationId}'::uuid`)}
        AND artist_id = ${artistId}
    `);
    if (result === 0) return NextResponse.json({ error: "Financial record not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status !== 500) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[DELETE /api/artists/[id]/financials]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
