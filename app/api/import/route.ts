import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { importData, ImportEntity } from "@/lib/import";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

const VALID_ENTITIES: ImportEntity[] = [
  "artists", "releases", "tracks", "works",
  "labels", "publishers", "contracts",
  "individuals", "organizations",
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entity = formData.get("entity") as string | null;

    if (!file || !entity) {
      return NextResponse.json({ error: "File and entity are required" }, { status: 400 });
    }

    if (!VALID_ENTITIES.includes(entity as ImportEntity)) {
      return NextResponse.json({ error: `Invalid entity. Valid: ${VALID_ENTITIES.join(", ")}` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await importData(
      entity as ImportEntity,
      orgId,
      buffer,
      file.type,
      file.name
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[POST /api/import]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
