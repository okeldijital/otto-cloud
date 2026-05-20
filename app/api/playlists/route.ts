import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const playlists = await prisma.playlists.findMany({
      skip,
      take: limit,
      // Assuming playlists are scoped to the user's organization in the future,
      // but legacy code just did offset/limit on all playlists
    });

    return NextResponse.json(playlists);
  } catch (error: any) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const newPlaylist = await prisma.playlists.create({
      data: {
        ...body,
        created_by: parseInt((session.user as any).id),
      },
    });

    await prisma.activities.create({
      data: {
        user_id: parseInt((session.user as any).id),
        action: "created",
        entity_type: "playlist",
        entity_id: newPlaylist.id,
        entity_name: newPlaylist.name,
        timestamp: new Date(),
      }
    });

    return NextResponse.json(newPlaylist, { status: 201 });
  } catch (error: any) {
    console.error("Error creating playlist:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
