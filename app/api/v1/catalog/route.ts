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
        const trackWhere = {
          OR: [
            { tenant_id: orgId },
            { releases: { is: { organization_id: orgId } } },
            { works: { is: { organization_id: orgId } } },
          ],
        };
        const data = await prisma.tracks.findMany({ where: trackWhere, take: limit, skip: offset, orderBy: { title: "asc" } });
        const total = await prisma.tracks.count({ where: trackWhere });
        return NextResponse.json({ data, total, limit, offset });
      }
      case "works": {
        const where = { organization_id: orgId };
        const data = await prisma.works.findMany({ where, take: limit, skip: offset, orderBy: { title: "asc" } });
        const total = await prisma.works.count({ where });
        return NextResponse.json({ data, total, limit, offset });
      }
      case "labels": {
        // labels table has no organization_id — do not leak platform-global catalog via API keys
        return NextResponse.json({ data: [], total: 0, limit, offset, note: "labels are not tenant-scoped in schema" });
      }
      default:
        return NextResponse.json({ error: "Unknown entity: " + entity }, { status: 400 });
    }
  });
}
