import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgIdStr = (session.user as any).organization_id;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const contract = await prisma.contracts.findFirst({
        where: { id, organization_id: orgId },
        include: {
          contract_parties: true,
          contract_assets: true,
          contract_split_groups: {
            include: { contract_splits: true },
          },
          contract_documents: true,
        },
      });
      if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      return NextResponse.json(contract);
    }

    const action = searchParams.get("action");
    if (action === "party_lookup") {
      const q = searchParams.get("q") || "";
      const limit = parseInt(searchParams.get("limit") || "10");

      const artists = await prisma.artists.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: limit,
      });

      const labels = await prisma.labels.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: limit,
      });

      return NextResponse.json({
        artists: artists.map((a) => ({ id: a.id, name: a.name, type: "artist" })),
        labels: labels.map((l) => ({ id: l.id, name: l.name, type: "label" })),
      });
    }

    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const contracts = await prisma.contracts.findMany({
      where: { organization_id: orgId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        contract_parties: true,
        contract_documents: true,
      },
    });

    return NextResponse.json(contracts);
  } catch (err: any) {
    console.error("[GET /api/contracts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const orgIdStr = (session.user as any).organization_id;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;
    const userId = parseInt((session.user as any).id) || 1;

    const body = await req.json();

    if (action === "add_party") {
      const { id } = body; // Contract ID
      const party = await prisma.contract_parties.create({
        data: {
          contract_id: parseInt(id),
          organization_id: orgId,
          entity_type: body.entity_type,
          entity_id: body.entity_id ? parseInt(body.entity_id) : null,
          external_name: body.external_name || null,
          role: body.role || "Licensor",
          split_percent: body.split_percent || 0.0,
          notes: body.notes || "",
        },
      });
      return NextResponse.json(party, { status: 201 });
    }

    if (action === "add_asset") {
      const { id } = body;
      const asset = await prisma.contract_assets.create({
        data: {
          contract_id: parseInt(id),
          organization_id: orgId,
          asset_type: body.asset_type,
          asset_id: parseInt(body.asset_id),
          scope_type: body.scope_type || null,
          notes: body.notes || "",
        },
      });
      return NextResponse.json(asset, { status: 201 });
    }

    if (action === "add_split_group") {
      const { id } = body;
      const group = await prisma.contract_split_groups.create({
        data: {
          contract_id: parseInt(id),
          organization_id: orgId,
          group_name: body.group_name || "Primary Splits",
          group_type: body.group_type || "Mechanical",
          notes: body.notes || "",
        },
      });
      return NextResponse.json(group, { status: 201 });
    }

    if (action === "add_split") {
      const { id, group_id } = body;
      const split = await prisma.contract_splits.create({
        data: {
          group_id: parseInt(group_id),
          organization_id: orgId,
          party_id: body.party_id ? parseInt(body.party_id) : null,
          external_party_name: body.external_party_name || null,
          percent: body.percent || 0.0,
          notes: body.notes || "",
        },
      });
      return NextResponse.json(split, { status: 201 });
    }

    if (action === "create_artist_inline") {
      const artist = await prisma.artists.create({
        data: {
          name: body.name,
          organization_id: (session.user as any).organization_id,
        },
      });
      return NextResponse.json(artist, { status: 201 });
    }

    // Default: create a new contract
    const contract = await prisma.contracts.create({
      data: {
        contract_number: body.contract_number || `CON-${Date.now()}`,
        organization_id: orgId,
        title: body.title,
        status: body.status || "Draft",
        type: body.type || "ArtistAgreement",
        start_date: body.start_date ? new Date(body.start_date) : null,
        end_date: body.end_date ? new Date(body.end_date) : null,
        territory: body.territory || "Worldwide",
        exclusivity: body.exclusivity ?? true,
        royalty_description: body.royalty_description || "",
        advances_amount: body.advances_amount || 0.0,
        advances_currency: body.advances_currency || "USD",
        recoupment_notes: body.recoupment_notes || "",
        created_by: userId,
        signed_date: body.signed_date ? new Date(body.signed_date) : null,
        notes: body.notes || "",
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/contracts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing contract ID" }, { status: 400 });
    const id = parseInt(idStr);

    const body = await req.json();

    const existing = await prisma.contracts.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

    const updated = await prisma.contracts.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        status: body.status !== undefined ? body.status : undefined,
        type: body.type !== undefined ? body.type : undefined,
        start_date: body.start_date !== undefined ? (body.start_date ? new Date(body.start_date) : null) : undefined,
        end_date: body.end_date !== undefined ? (body.end_date ? new Date(body.end_date) : null) : undefined,
        territory: body.territory !== undefined ? body.territory : undefined,
        exclusivity: body.exclusivity !== undefined ? body.exclusivity : undefined,
        royalty_description: body.royalty_description !== undefined ? body.royalty_description : undefined,
        advances_amount: body.advances_amount !== undefined ? body.advances_amount : undefined,
        advances_currency: body.advances_currency !== undefined ? body.advances_currency : undefined,
        recoupment_notes: body.recoupment_notes !== undefined ? body.recoupment_notes : undefined,
        signed_date: body.signed_date !== undefined ? (body.signed_date ? new Date(body.signed_date) : null) : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/contracts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing contract ID" }, { status: 400 });
    const id = parseInt(idStr);

    const partyIdStr = searchParams.get("partyId");
    if (partyIdStr) {
      const partyId = parseInt(partyIdStr);
      await prisma.contract_parties.deleteMany({
        where: { contract_id: id, id: partyId },
      });
      return new NextResponse(null, { status: 204 });
    }

    const assetIdStr = searchParams.get("assetId");
    if (assetIdStr) {
      const assetId = parseInt(assetIdStr);
      await prisma.contract_assets.deleteMany({
        where: { contract_id: id, id: assetId },
      });
      return new NextResponse(null, { status: 204 });
    }

    const splitGroupIdStr = searchParams.get("splitGroupId");
    const splitIdStr = searchParams.get("splitId");
    if (splitGroupIdStr) {
      const groupId = parseInt(splitGroupIdStr);
      if (splitIdStr) {
        const splitId = parseInt(splitIdStr);
        await prisma.contract_splits.deleteMany({
          where: { group_id: groupId, id: splitId },
        });
      } else {
        await prisma.contract_split_groups.deleteMany({
          where: { contract_id: id, id: groupId },
        });
      }
      return new NextResponse(null, { status: 204 });
    }

    const docIdStr = searchParams.get("docId");
    if (docIdStr) {
      const docId = parseInt(docIdStr);
      await prisma.contract_documents.deleteMany({
        where: { contract_id: id, id: docId },
      });
      return new NextResponse(null, { status: 204 });
    }

    const existing = await prisma.contracts.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

    // Cascading clean up
    await prisma.contract_parties.deleteMany({ where: { contract_id: id } });
    await prisma.contract_assets.deleteMany({ where: { contract_id: id } });
    const splitGroups = await prisma.contract_split_groups.findMany({ where: { contract_id: id } });
    const groupIds = splitGroups.map((g) => g.id);
    await prisma.contract_splits.deleteMany({ where: { group_id: { in: groupIds } } });
    await prisma.contract_split_groups.deleteMany({ where: { contract_id: id } });
    await prisma.contract_documents.deleteMany({ where: { contract_id: id } });

    await prisma.contracts.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/contracts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
