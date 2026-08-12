import { NextResponse } from "next/server";
import { storeFile } from "@/lib/storage";
import {
  orgContextErrorResponse,
} from "@/lib/auth/organization-context";
import {
  requireOrgAuth,
  requirePositiveIntId,
  requireReleaseInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

/**
 * Release artwork upload — A.8 Step 5: release must belong to caller's org.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireOrgAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const releaseIdRaw = formData.get("release_id") as string | null;

    if (!file || !releaseIdRaw) {
      return NextResponse.json(
        { error: "File and release_id are required" },
        { status: 400 }
      );
    }

    const releaseId = requirePositiveIntId(releaseIdRaw, "release_id");
    await requireReleaseInOrg(releaseId, ctx);

    const stored = await storeFile(file, `release_${releaseId}`, {
      domain: "releases",
      entityId: String(releaseId),
      allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      maxSizeBytes: 10 * 1024 * 1024,
    });

    return NextResponse.json({
      url: stored.url,
      filename: stored.filename,
      checksum: stored.checksum,
    });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (
      mapped.status === 401 ||
      mapped.status === 403 ||
      mapped.status === 400 ||
      mapped.status === 404
    ) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[POST /api/releases/upload]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
