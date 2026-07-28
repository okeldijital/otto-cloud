import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const royaltyIncludes = {
  artists: true,
  tracks: true,
  works: true,
};

function buildWhere(searchParams: URLSearchParams) {
  const where: Record<string, any> = {};

  const artist_id = searchParams.get("artist_id");
  if (artist_id) where.artist_id = parseInt(artist_id);

  const work_id = searchParams.get("work_id");
  if (work_id) where.work_id = parseInt(work_id);

  const track_id = searchParams.get("track_id");
  if (track_id) where.track_id = parseInt(track_id);

  const source = searchParams.get("source");
  if (source) where.source = source;

  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  if (date_from || date_to) {
    where.statement_date = {};
    if (date_from) where.statement_date.gte = new Date(date_from);
    if (date_to) where.statement_date.lte = new Date(date_to);
  }

  const q = searchParams.get("q");
  if (q) where.source = { contains: q, mode: "insensitive" };

  return where;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "summary") {
      const where = buildWhere(searchParams);

      const aggregation = await prisma.royalties.aggregate({
        _sum: { amount: true, fees: true, advances: true },
        where,
      });

      const bySource = await prisma.royalties.groupBy({
        by: ["source"],
        _count: true,
        _sum: { amount: true },
        where,
      });

      const byArtist = await prisma.royalties.groupBy({
        by: ["artist_id"],
        _count: true,
        _sum: { amount: true },
        where: { ...where, artist_id: { not: null } },
      });

      const artistIds = byArtist.map((r) => r.artist_id).filter(Boolean) as number[];
      const artists = artistIds.length > 0
        ? await prisma.artists.findMany({ where: { id: { in: artistIds } }, select: { id: true, name: true } })
        : [];
      const artistMap = new Map(artists.map((a) => [a.id, a.name]));

      const totalAmount = aggregation._sum.amount?.toNumber() ?? 0;
      const totalFees = aggregation._sum.fees?.toNumber() ?? 0;
      const totalAdvances = aggregation._sum.advances?.toNumber() ?? 0;

      const count = await prisma.royalties.count({ where });

      return NextResponse.json({
        total_amount: totalAmount,
        total_fees: totalFees,
        total_advances: totalAdvances,
        net_amount: totalAmount - totalFees - totalAdvances,
        by_source: bySource.map((s) => ({
          source: s.source,
          count: s._count,
          total: s._sum.amount?.toNumber() ?? 0,
        })),
        by_artist: byArtist.map((a) => ({
          artist_id: a.artist_id,
          artist_name: artistMap.get(a.artist_id!) ?? "Unknown",
          count: a._count,
          total: a._sum.amount?.toNumber() ?? 0,
        })),
        count,
      });
    }

    if (action === "validate-splits") {
      const contractIdStr = searchParams.get("contract_id");
      if (!contractIdStr) return NextResponse.json({ error: "Missing contract_id" }, { status: 400 });
      const contractId = parseInt(contractIdStr);

      const contract = await prisma.contracts.findFirst({
        where: { id: contractId },
        include: {
          contract_split_groups: {
            include: { contract_splits: true },
          },
          contract_track_links: { include: { tracks: true } },
          contract_assets: true,
          contract_parties: true,
        },
      });

      if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

      const artistIds: number[] = [];
      const workIds: number[] = [];
      const trackIds: number[] = [];

      for (const party of contract.contract_parties) {
        if (party.entity_type === "artist" && party.entity_id) artistIds.push(party.entity_id);
      }
      for (const link of contract.contract_track_links) {
        if (link.track_id) trackIds.push(link.track_id);
      }
      for (const asset of contract.contract_assets) {
        if (asset.asset_type === "work" && asset.asset_id) workIds.push(asset.asset_id);
        if (asset.asset_type === "track" && asset.asset_id) trackIds.push(asset.asset_id);
        if (asset.asset_type === "artist" && asset.asset_id) artistIds.push(asset.asset_id);
      }

      const royalties = await prisma.royalties.findMany({
        where: {
          OR: [
            artistIds.length > 0 ? { artist_id: { in: artistIds } } : {},
            workIds.length > 0 ? { work_id: { in: workIds } } : {},
            trackIds.length > 0 ? { track_id: { in: trackIds } } : {},
          ].filter((c) => Object.keys(c).length > 0),
        },
      });

      const totalRoyaltyAmount = royalties.reduce((sum, r) => sum + (r.amount?.toNumber() ?? 0), 0);

      const splits: { party: string; percent: number }[] = [];
      for (const group of contract.contract_split_groups) {
        for (const split of group.contract_splits) {
          splits.push({
            party: split.external_party_name ?? `Party #${split.party_id}`,
            percent: split.percent?.toNumber() ?? 0,
          });
        }
      }

      const totalSplitPercent = splits.reduce((sum, s) => sum + s.percent, 0);
      const discrepancies: { party: string; split_percent: number; expected_amount: number; actual_royalties: number; difference: number }[] = [];

      for (const split of splits) {
        const expectedAmount = totalRoyaltyAmount * (split.percent / 100);
        if (expectedAmount > 0.01) {
          discrepancies.push({
            party: split.party,
            split_percent: split.percent,
            expected_amount: expectedAmount,
            actual_royalties: totalRoyaltyAmount,
            difference: expectedAmount - totalRoyaltyAmount,
          });
        }
      }

      return NextResponse.json({
        contract_id: contractId,
        total_royalties: totalRoyaltyAmount,
        total_split_percent: totalSplitPercent,
        royalty_count: royalties.length,
        splits_count: splits.length,
        discrepancies,
        has_discrepancies: discrepancies.length > 0,
      });
    }

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const royalty = await prisma.royalties.findUnique({
        where: { id },
        include: royaltyIncludes,
      });
      if (!royalty) return NextResponse.json({ error: "Royalty not found" }, { status: 404 });
      return NextResponse.json(royalty);
    }

    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");
    const where = buildWhere(searchParams);

    const royalties = await prisma.royalties.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: royaltyIncludes,
    });

    return NextResponse.json(royalties);
  } catch (err: any) {
    console.error("[GET /api/royalties]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const royalty = await prisma.royalties.create({
      data: {
        royalty_id: body.royalty_id || `ROY-${Date.now()}`,
        artist_id: body.artist_id ? parseInt(body.artist_id) : null,
        work_id: body.work_id ? parseInt(body.work_id) : null,
        track_id: body.track_id ? parseInt(body.track_id) : null,
        source: body.source || null,
        amount: body.amount || 0,
        currency: body.currency || "USD",
        statement_date: body.statement_date ? new Date(body.statement_date) : null,
        fees: body.fees ?? 0,
        advances: body.advances ?? 0,
      },
      include: royaltyIncludes,
    });

    return NextResponse.json(royalty, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/royalties]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing royalty ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.royalties.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Royalty not found" }, { status: 404 });

    const body = await req.json();

    const updated = await prisma.royalties.update({
      where: { id },
      data: {
        royalty_id: body.royalty_id !== undefined ? body.royalty_id : undefined,
        artist_id: body.artist_id !== undefined ? (body.artist_id ? parseInt(body.artist_id) : null) : undefined,
        work_id: body.work_id !== undefined ? (body.work_id ? parseInt(body.work_id) : null) : undefined,
        track_id: body.track_id !== undefined ? (body.track_id ? parseInt(body.track_id) : null) : undefined,
        source: body.source !== undefined ? body.source : undefined,
        amount: body.amount !== undefined ? body.amount : undefined,
        currency: body.currency !== undefined ? body.currency : undefined,
        statement_date: body.statement_date !== undefined ? (body.statement_date ? new Date(body.statement_date) : null) : undefined,
        fees: body.fees !== undefined ? body.fees : undefined,
        advances: body.advances !== undefined ? body.advances : undefined,
      },
      include: royaltyIncludes,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/royalties]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing royalty ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.royalties.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Royalty not found" }, { status: 404 });

    await prisma.royalties.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/royalties]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
