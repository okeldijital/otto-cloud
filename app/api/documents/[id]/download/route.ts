import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth/organization-context";
import { documentService } from "@/lib/documents";
import { DocumentServiceError } from "@/lib/documents";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const { id } = await Promise.resolve(context.params);
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

    const format = new URL(req.url).searchParams.get("format") || "json";
    const document = await documentService.getActiveDocument(id, ctx.organizationId);
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const url = await documentService.getSignedDownloadUrl(id, ctx.organizationId);

    if (format === "stream" || format === "inline") {
      const remote = await fetch(url);
      if (!remote.ok) {
        return NextResponse.json({ error: "Document unavailable" }, { status: 502 });
      }
      const headers = new Headers();
      headers.set("Content-Type", document.mimeType || "application/octet-stream");
      headers.set("Content-Disposition", `inline; filename="${document.originalFilename.replace(/"/g, "")}"`);
      headers.set("Cache-Control", "private, no-store");
      headers.set("X-Content-Type-Options", "nosniff");
      return new NextResponse(remote.body, { status: 200, headers });
    }

    return NextResponse.json({
      url,
      filename: document.originalFilename,
      mimeType: document.mimeType,
    });
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const mapped = await import("@/lib/auth/organization-context").then(({ orgContextErrorResponse }) => orgContextErrorResponse(error));
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/documents/:id/download]", error);
    return NextResponse.json({ error: "Unable to download document" }, { status: 500 });
  }
}
