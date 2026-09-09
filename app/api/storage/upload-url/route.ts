import { NextRequest, NextResponse } from "next/server";
import { getSignedUploadUrl, generateStorageKey, validateUpload } from "@/lib/storage";
import { getMediaImageMaxBytes } from "@/lib/storage/image-policy";
import { DEFAULT_SIGNED_URL_EXPIRY } from "@/lib/storage/constants";
import { orgContextErrorResponse } from "@/lib/auth/organization-context";
import {
  requireOrgAuth,
  requireUploadEntityInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

/**
 * Authorize a browser-to-R2 upload without sending file bytes through Vercel.
 * The signed URL is scoped to an organization-owned entity and a generated key.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgAuth();
    const body = await req.json();
    const entityType = String(body?.entityType || "").trim().toLowerCase();
    const entityId = String(body?.entityId || "").trim();
    const fileName = String(body?.fileName || "").trim();
    const mimeType = String(body?.mimeType || "").trim();
    const fileSize = Number(body?.fileSize);
    const folder = String(body?.folder || entityType).trim();

    if (!entityType || !entityId || !fileName || !mimeType || !folder) {
      return NextResponse.json(
        { error: "entityType, entityId, fileName, mimeType and folder are required" },
        { status: 400 }
      );
    }

    const bound = await requireUploadEntityInOrg(entityType, entityId, ctx);
    const maxImageBytes = getMediaImageMaxBytes(entityType, mimeType);
    const validation = validateUpload({
      fileName,
      mimeType,
      fileSize,
      maxSizeBytes: maxImageBytes ?? undefined,
    });
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const key = generateStorageKey({
      organizationId: ctx.organizationId,
      folder,
      fileName: validation.sanitizedFileName,
    });

    const signed = await getSignedUploadUrl(
      { key },
      mimeType,
      DEFAULT_SIGNED_URL_EXPIRY
    );

    return NextResponse.json({
      uploadUrl: signed.url,
      key: signed.key,
      expiresIn: signed.expiresIn,
      entityType: bound.entityType,
      entityId: bound.entityId,
      fileName: validation.sanitizedFileName,
      mimeType,
      fileSize,
    });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if ([400, 401, 403, 404].includes(mapped.status)) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if ([401, 403].includes(orgMapped.status)) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[POST /api/storage/upload-url]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
