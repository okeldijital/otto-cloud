import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ playlist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    const playlistId = parseInt(resolvedParams.playlist_id);

    const playlist = await prisma.playlists.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    return NextResponse.json(playlist);
  } catch (error: any) {
    console.error("Error fetching playlist:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ playlist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    const playlistId = parseInt(resolvedParams.playlist_id);
    const body = await req.json();

    const playlist = await prisma.playlists.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const updatedPlaylist = await prisma.playlists.update({
      where: { id: playlistId },
      data: body
    });

    await prisma.activities.create({
      data: {
        user_id: parseInt((session.user as any).id),
        action: "updated",
        entity_type: "playlist",
        entity_id: playlistId,
        entity_name: updatedPlaylist.name,
        timestamp: new Date(),
      }
    });

    return NextResponse.json(updatedPlaylist);
  } catch (error: any) {
    console.error("Error updating playlist:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ playlist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    const playlistId = parseInt(resolvedParams.playlist_id);

    const playlist = await prisma.playlists.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    await prisma.playlists.delete({
      where: { id: playlistId }
    });

    await prisma.activities.create({
      data: {
        user_id: parseInt((session.user as any).id),
        action: "deleted",
        entity_type: "playlist",
        entity_id: playlistId,
        entity_name: playlist.name,
        timestamp: new Date(),
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error deleting playlist:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
