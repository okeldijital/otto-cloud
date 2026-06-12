import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "../helpers";

export async function GET(req: NextRequest) {
  return withApiAuth(req, "catalog:read", async (orgId) => {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") || "artists";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    switch (entity) {
      case "artists": {
        const where = { organization_id: orgId };
        const data = await prisma.artists.findMany({ where, take: limit, skip: offset, orderBy: { name: "asc" } });
        const total = await prisma.artists.count({ where });
        return NextResponse.json({ data, total, limit, offset });
      }
      case "releases": {
        const where = { organization_id: orgId };
        const data = await prisma.releases.findMany({ where, take: limit, skip: offset, orderBy: { title: "asc" } });
        const total = await prisma.releases.count({ where });
        return NextResponse.json({ data, total, limit, offset });
      }
      case "tracks": {
        const data = await prisma.tracks.findMany({ take: limit, skip: offset, orderBy: { title: "asc" } });
        const total = await prisma.tracks.count();
        return NextResponse.json({ data, total, limit, offset });
      }
      case "works": {
        const where = { organization_id: orgId };
        const data = await prisma.works.findMany({ where, take: limit, skip: offset, orderBy: { title: "asc" } });
        const total = await prisma.works.count({ where });
        return NextResponse.json({ data, total, limit, offset });
      }
      case "labels": {
        const data = await prisma.labels.findMany({ take: limit, skip: offset, orderBy: { name: "asc" } });
        const total = await prisma.labels.count();
        return NextResponse.json({ data, total, limit, offset });
      }
      default:
        return NextResponse.json({ error: "Unknown entity: " + entity }, { status: 400 });
    }
  });
}
