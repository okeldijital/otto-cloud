import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { storeFile } from "@/lib/storage";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

function computeCompleteness(contract: any) {
  const reasons: string[] = [];
  const hasParties = (contract.contract_parties?.length ?? 0) > 0;
  const hasDocuments = (contract.contract_documents?.length ?? 0) > 0;
  const hasAssets = (contract.contract_assets?.length ?? 0) > 0;
  const hasTracks = (contract.contract_track_links?.length ?? 0) > 0;
  const hasDates = !!contract.start_date && !!contract.end_date;
  const hasNumber = !!contract.contract_number;
  const hasTitle = !!contract.title;
  const hasType = !!contract.type;
  const hasTerritory = !!contract.territory;

  if (!hasParties) reasons.push("missing_parties");
  if (!hasDocuments) reasons.push("missing_documents");
  if (!hasAssets) reasons.push("missing_assets");
  if (!hasTracks) reasons.push("missing_tracks");
  if (!hasDates) reasons.push("missing_dates");
  if (!hasNumber) reasons.push("missing_contract_number");
  if (!hasTitle) reasons.push("missing_title");
  if (!hasType) reasons.push("missing_type");
  if (!hasTerritory) reasons.push("missing_territory");

  const total = 9;
  const present = total - reasons.length;
  const score = Math.round((present / total) * 100);

  let status: "GREEN" | "AMBER" | "RED";
  if (score >= 80) status = "GREEN";
  else if (score >= 50) status = "AMBER";
  else status = "RED";

  if (contract.status_quo_override) {
    const override = contract.status_quo_override.toUpperCase();
    if (["GREEN", "AMBER", "RED"].includes(override)) status = override as any;
  }

  return { score, status, missing: reasons };
}

function computeCompletenessFromRelations(contract: any) {
  return computeCompleteness(contract);
}

const contractIncludes = {
  contract_parties: true,
  contract_assets: true,
  contract_split_groups: {
    include: { contract_splits: true },
  },
  contract_documents: true,
  contract_track_links: {
    include: { tracks: true },
  },
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ctx = await requireOrganization();
    const orgId = ctx.legacyIntOrgId;
    const orgUuid = ctx.organizationId;

    const action = searchParams.get("action");

    if (action === "completeness") {
      const idStr = searchParams.get("id");
      if (!idStr) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const id = parseInt(idStr);
      const contract = await prisma.contracts.findFirst({
        where: { id, organization_id: orgId },
        include: {
          contract_parties: true,
          contract_documents: true,
          contract_assets: true,
          contract_track_links: true,
        },
      });
      if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      return NextResponse.json(computeCompletenessFromRelations(contract));
    }

    if (action === "party_lookup") {
      const q = searchParams.get("q") || "";
      const limit = parseInt(searchParams.get("limit") || "10");

      const [artists, labels, publishers, pros] = await Promise.all([
        prisma.artists.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: limit }),
        prisma.labels.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: limit }),
        prisma.publishers.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: limit }),
        prisma.pros.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: limit }),
      ]);

      return NextResponse.json({
        artists: artists.map((a) => ({ id: a.id, name: a.name, entity_type: "artist" })),
        labels: labels.map((l) => ({ id: l.id, name: l.name, entity_type: "label" })),
        publishers: publishers.map((p) => ({ id: p.id, name: p.name, entity_type: "publisher" })),
        pros: pros.map((p) => ({ id: p.id, name: p.name, entity_type: "pro" })),
      });
    }

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const contract = await prisma.contracts.findFirst({
        where: { id, organization_id: orgId },
        include: contractIncludes,
      });
      if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      return NextResponse.json({
        ...contract,
        completeness: computeCompletenessFromRelations(contract),
      });
    }

    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const [contracts, total] = await Promise.all([
      prisma.contracts.findMany({
        where: { organization_id: orgId },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          contract_parties: true,
          contract_documents: true,
        },
      }),
      prisma.contracts.count({ where: { organization_id: orgId } }),
    ]);

    const withCounts = contracts.map((c) => ({
      ...c,
      _count: {
        parties: c.contract_parties?.length ?? 0,
        documents: c.contract_documents?.length ?? 0,
      },
      completeness: computeCompleteness({
        ...c,
        contract_assets: [],
        contract_track_links: [],
      }),
    }));

    return NextResponse.json({ total, items: withCounts });
  } catch (err: any) {
    console.error("[GET /api/contracts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgId = ctx.legacyIntOrgId;
    const orgUuid = ctx.organizationId;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "link_track") {
      const body = await req.json();
      const { id, track_id } = body;
      const existing = await prisma.contract_track_links.findFirst({
        where: { contract_id: parseInt(id), track_id: parseInt(track_id), organization_id: String(orgId) },
      });
      if (existing) return NextResponse.json({ error: "Track already linked" }, { status: 409 });
      const link = await prisma.contract_track_links.create({
        data: {
          contract_id: parseInt(id),
          track_id: parseInt(track_id),
          organization_id: String(orgId),
        },
        include: { tracks: true },
      });
      return NextResponse.json(link, { status: 201 });
    }

    if (action === "add_party") {
      const body = await req.json();
      const { id } = body;
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

    if (action === "update_party") {
      const body = await req.json();
      const { id, party_id } = body;
      const updated = await prisma.contract_parties.updateMany({
        where: { contract_id: parseInt(id), id: parseInt(party_id) },
        data: {
          role: body.role !== undefined ? body.role : undefined,
          split_percent: body.split_percent !== undefined ? body.split_percent : undefined,
          notes: body.notes !== undefined ? body.notes : undefined,
          external_name: body.external_name !== undefined ? body.external_name : undefined,
          entity_type: body.entity_type !== undefined ? body.entity_type : undefined,
          entity_id: body.entity_id !== undefined ? (body.entity_id ? parseInt(body.entity_id) : null) : undefined,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "add_asset") {
      const body = await req.json();
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
      const body = await req.json();
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
      const body = await req.json();
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
      const body = await req.json();
      const artist = await prisma.artists.create({
        data: {
          name: body.name,
          organization_id: orgUuid,
        },
      });
      return NextResponse.json(artist, { status: 201 });
    }

    if (action === "upload_document") {
      const formData = await req.formData();
      const id = parseInt(searchParams.get("id") || "0");
      if (!id) return NextResponse.json({ error: "Missing contract id" }, { status: 400 });

      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      const existingDocs = await prisma.contract_documents.findMany({
        where: { contract_id: id },
        orderBy: { version: "desc" },
        take: 1,
      });
      const nextVersion = (existingDocs[0]?.version ?? 0) + 1;

      const stored = await storeFile(file, `v${nextVersion}`, {
        domain: "contracts",
        entityId: id,
        allowedMime: ["application/pdf"],
        maxSizeBytes: 50 * 1024 * 1024,
      });

      const doc = await prisma.contract_documents.create({
        data: {
          contract_id: id,
          organization_id: orgId,
          file_path: stored.url,
          file_name: file.name,
          version: nextVersion,
          uploaded_by: userId,
          checksum: stored.checksum,
          mime_type: stored.mime_type,
          size_bytes: stored.size_bytes,
        },
      });

      return NextResponse.json(doc, { status: 201 });
    }

    const body = await req.json();
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
    const session = await getServerSession();
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
        status_quo_override: body.status_quo_override !== undefined ? body.status_quo_override : undefined,
        contract_number: body.contract_number !== undefined ? body.contract_number : undefined,
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
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing contract ID" }, { status: 400 });
    const id = parseInt(idStr);

    const trackIdStr = searchParams.get("trackId");
    if (trackIdStr) {
      const trackId = parseInt(trackIdStr);
      await prisma.contract_track_links.deleteMany({
        where: { contract_id: id, track_id: trackId },
      });
      return new NextResponse(null, { status: 204 });
    }

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

    await prisma.contract_track_links.deleteMany({ where: { contract_id: id } });
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
