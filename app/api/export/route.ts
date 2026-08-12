import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { exportData, ExportEntity, ExportFormat } from "@/lib/export";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  requireLegacyIntOrgId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

const VALID_ENTITIES: ExportEntity[] = [
  "artists",
  "releases",
  "tracks",
  "works",
  "labels",
  "publishers",
  "pros",
  "contracts",
  "royalties",
  "individuals",
  "organizations",
];

const VALID_FORMATS: ExportFormat[] = ["csv", "xlsx", "json"];

/** Entities that store organization_id as INT (legacy tables). */
const INT_ORG_ENTITIES = new Set<ExportEntity>([
  "contracts",
  "individuals",
  "organizations",
]);

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") as ExportEntity | null;
    const format = (searchParams.get("format") || "csv") as ExportFormat;
    const q = searchParams.get("q") || undefined;
    const idsParam = searchParams.get("ids") || undefined;

    if (!entity || !VALID_ENTITIES.includes(entity)) {
      return NextResponse.json(
        { error: `Invalid entity. Valid: ${VALID_ENTITIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Valid: ${VALID_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    const ids = idsParam
      ? idsParam
          .split(",")
          .map((s) => s.trim())
          .filter((s) => /^\d+$/.test(s))
          .map((s) => Number(s))
          .filter((n) => n > 0)
      : undefined;

    // Fail-closed org scope: never parseInt(uuid)||1
    let orgId: string | number;
    if (INT_ORG_ENTITIES.has(entity)) {
      orgId = requireLegacyIntOrgId(ctx);
    } else if (
      entity === "labels" ||
      entity === "publishers" ||
      entity === "pros"
    ) {
      // Global reference entities — export lists are platform-shared; no org filter
      // (mutations are platform-gated elsewhere). Still require authentication + org session.
      orgId = ctx.organizationId;
    } else {
      // UUID-scoped catalog
      if (!ctx.organizationId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 }
        );
      }
      orgId = ctx.organizationId;
    }

    const result = await exportData(entity, format, {
      orgId,
      query: q,
      ids,
    });

    if (format === "json") {
      return NextResponse.json(result.data);
    }

    return new NextResponse(result.data as BodyInit, {
      headers: {
        "Content-Type": result.mime,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[GET /api/export]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
