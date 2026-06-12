import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { exportData, ExportEntity, ExportFormat } from "@/lib/export";

const VALID_ENTITIES: ExportEntity[] = [
  "artists", "releases", "tracks", "works",
  "labels", "publishers", "pros", "contracts",
  "royalties", "individuals", "organizations",
];

const VALID_FORMATS: ExportFormat[] = ["csv", "xlsx", "json"];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") as ExportEntity | null;
    const format = (searchParams.get("format") || "csv") as ExportFormat;
    const q = searchParams.get("q") || undefined;
    const idsParam = searchParams.get("ids") || undefined;

    if (!entity || !VALID_ENTITIES.includes(entity)) {
      return NextResponse.json({ error: `Invalid entity. Valid: ${VALID_ENTITIES.join(", ")}` }, { status: 400 });
    }

    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json({ error: `Invalid format. Valid: ${VALID_FORMATS.join(", ")}` }, { status: 400 });
    }

    const ids = idsParam ? idsParam.split(",").map(Number).filter((n) => !isNaN(n)) : undefined;

    const result = await exportData(entity, format, {
      orgId: typeof orgId === "string" ? parseInt(orgId) || 1 : orgId,
      query: q,
      ids,
    });

    if (format === "json") {
      return NextResponse.json(result.data);
    }

    return new NextResponse(result.data as any, {
      headers: {
        "Content-Type": result.mime,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/export]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
