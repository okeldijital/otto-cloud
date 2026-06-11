import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const releaseId = formData.get("release_id") as string | null;

    if (!file || !releaseId) {
      return NextResponse.json({ error: "File and release_id are required" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `release_${releaseId}_${Date.now()}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "releases", "artwork");
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(filePath, buffer);

    const url = `/uploads/releases/artwork/${fileName}`;

    return NextResponse.json({ url, filename: fileName });
  } catch (err: any) {
    console.error("[POST /api/releases/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
