import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getFileBuffer } from "@/lib/storage";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });

    const buffer = await getFileBuffer(path);
    if (!buffer) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const ext = path.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg", jpeg: "image/jpeg",
      png: "image/png", webp: "image/webp",
      gif: "image/gif", doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv", txt: "text/plain",
    };

    const mimeType = mimeMap[ext || ""] || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/files]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
