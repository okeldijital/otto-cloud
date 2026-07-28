import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { storeFile } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const releaseId = formData.get("release_id") as string | null;

    if (!file || !releaseId) {
      return NextResponse.json({ error: "File and release_id are required" }, { status: 400 });
    }

    const stored = await storeFile(file, `release_${releaseId}`, {
      domain: "releases",
      entityId: releaseId,
      allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      maxSizeBytes: 10 * 1024 * 1024,
    });

    return NextResponse.json({ url: stored.url, filename: stored.filename, checksum: stored.checksum });
  } catch (err: any) {
    console.error("[POST /api/releases/upload]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
