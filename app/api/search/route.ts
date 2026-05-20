import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.length < 1) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });

    if (!user || !user.organization_id) {
      return NextResponse.json({ error: "User organization not found" }, { status: 400 });
    }

    const orgId = user.organization_id;
    const searchFilter = { contains: q, mode: "insensitive" as const };

    const [
      artists,
      releases,
      tracks,
      works,
      contracts,
      labels,
      publishers,
      pros,
      documents,
      notes,
      playlists,
      networkOrgs,
      individuals
    ] = await Promise.all([
      prisma.artists.findMany({
        where: {
          organization_id: orgId,
          OR: [
            { name: searchFilter },
            { aka: searchFilter },
            { artist_id: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.releases.findMany({
        where: {
          organization_id: orgId,
          OR: [
            { title: searchFilter },
            { upc_code: searchFilter },
            { catalog_number: searchFilter },
            { release_id: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.tracks.findMany({
        where: {
          OR: [
            { title: searchFilter },
            { isrc_code: searchFilter },
            { track_id: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.works.findMany({
        where: {
          organization_id: orgId,
          OR: [
            { title: searchFilter },
            { iswc_code: searchFilter },
            { work_id: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.contracts.findMany({
        where: {
          organization_id: parseInt(orgId) || 0, // In db contracts might use Int, handle safely
          OR: [
            { title: searchFilter },
            { contract_number: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.labels.findMany({
        where: {
          OR: [
            { name: searchFilter },
            { contact_person: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.publishers.findMany({
        where: {
          name: searchFilter
        },
        take: 5
      }).catch(() => []),

      prisma.pros.findMany({
        where: {
          name: searchFilter
        },
        take: 5
      }).catch(() => []),

      prisma.documents.findMany({
        where: {
          organization_id: orgId,
          OR: [
            { title: searchFilter },
            { description: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.notes.findMany({
        where: {
          organization_id: orgId,
          OR: [
            { title: searchFilter },
            { content: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.playlists.findMany({
        where: {
          OR: [
            { name: searchFilter },
            { description: searchFilter }
          ]
        },
        take: 5
      }).catch(() => []),

      prisma.organizations.findMany({
        where: {
          name: searchFilter
        },
        take: 5
      }).catch(() => []),

      prisma.individuals.findMany({
        where: {
          OR: [
            { first_name: searchFilter },
            { last_name: searchFilter }
          ]
        },
        take: 5
      }).catch(() => [])
    ]);

    const results = {
      artists: artists.map(a => ({ id: a.id, name: a.name, type: "artist" })),
      releases: releases.map(r => ({ id: r.id, title: r.title, type: "release" })),
      tracks: tracks.map(t => ({ id: t.id, title: t.title, type: "track", release_id: t.release_id })),
      works: works.map(w => ({ id: w.id, title: w.title, type: "work" })),
      contracts: contracts.map(c => ({ id: c.id, title: c.title, type: "contract" })),
      labels: labels.map(l => ({ id: l.id, name: l.name, type: "label" })),
      publishers: publishers.map(p => ({ id: p.id, name: p.name, type: "publisher" })),
      pros: pros.map(p => ({ id: p.id, name: p.name, type: "pro" })),
      documents: documents.map(d => ({ id: d.id, title: d.title, type: "document" })),
      notes: notes.map(n => ({ id: n.id, title: n.title, type: "note" })),
      playlists: playlists.map(p => ({ id: p.id, title: p.name, type: "playlist" })),
      network: [
        ...networkOrgs.map(o => ({ id: o.id, name: o.name, type: "organization", entity_type: "Network" })),
        ...individuals.map(i => ({ id: i.id, name: `${i.first_name} ${i.last_name}`, type: "individual", entity_type: "Network" }))
      ]
    };

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error global search:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
