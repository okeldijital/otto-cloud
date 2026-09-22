import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import { requireActorUserId } from "@/lib/auth/resource-authorization";
import { deleteFile, uploadFile, validateUpload } from "@/lib/storage";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    if (action === "team") {
      const members = await prisma.user.findMany({
        where: { organization_id: orgId },
        select: { id: true, email: true, name: true, is_active: true, role: true, createdAt: true, last_login: true },
        orderBy: { id: "asc" },
      });
      return NextResponse.json(members);
    }

    const adminList = searchParams.get("all");
    if (adminList === "true" && currentUser.is_superuser) {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, is_active: true, is_superuser: true, role: true, createdAt: true, last_login: true, organization_id: true },
        orderBy: { id: "asc" },
      });
      return NextResponse.json(users);
    }

    const { hashed_password, ...userWithoutPassword } = currentUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "invite") {
      // A8-015: require users.invite or users.manage; never trust client role elevation
      const { hasPermission } = await import("@/lib/permissions");
      const { normalizeLegacyInviteRole } = await import(
        "@/lib/auth/privilege-authorization"
      );

      const actor = session.user as any;
      if (
        !hasPermission(actor, "users.invite") &&
        !hasPermission(actor, "users.manage") &&
        !actor.is_superuser
      ) {
        return NextResponse.json(
          { error: "Forbidden: users.invite required", code: "PERMISSION_DENIED" },
          { status: 403 }
        );
      }

      const { email, password, name, role } = await req.json();
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password required" },
          { status: 400 }
        );
      }
      if (String(password).length < 12) {
        return NextResponse.json(
          { error: "Password must be at least 12 characters" },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }

      const orgCtx = await requireOrganization();
      const orgId = orgCtx.organizationId;

      let safeRole = "member";
      try {
        safeRole = normalizeLegacyInviteRole(role, {
          identityId: actor.identityId || actor.id,
          organizationId: orgId,
          isSuperAdmin: !!actor.is_superuser,
          permissions: actor.permissions || [],
          roles: actor.role ? [actor.role] : orgCtx.role ? [orgCtx.role] : [],
        } as any);
      } catch (e: any) {
        return NextResponse.json(
          {
            error: e.message || "Invalid role",
            code: e.code || "ROLE_GRANT_DENIED",
          },
          { status: e.status || 403 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          email,
          hashed_password: hashedPassword,
          name: name || email.split("@")[0],
          organization_id: orgId,
          role: safeRole,
          is_active: true,
          is_superuser: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          is_active: true,
        },
      });

      return NextResponse.json(newUser, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in users POST:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const ctx = await requireOrganization();
      const actorUserId = requireActorUserId(ctx);
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email as string },
      });

      if (!currentUser || currentUser.id !== actorUserId) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const formData = await req.formData();
      const file = formData.get("avatar") as File | null;
      const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      const maxAvatarBytes = 750 * 1024;

      if (!file) {
        return NextResponse.json({ error: "Avatar image is required" }, { status: 400 });
      }
      if (!allowedAvatarTypes.has(file.type)) {
        return NextResponse.json(
          { error: "Avatar must be a JPEG, PNG, or WebP image" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = validateUpload({
        fileName: file.name,
        mimeType: file.type,
        fileSize: buffer.byteLength,
        maxSizeBytes: maxAvatarBytes,
      });
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Avatar validation failed", details: validation.errors },
          { status: 400 }
        );
      }

      const existing = await prisma.attachment.findMany({
        where: {
          organizationId: ctx.organizationId,
          entityType: "user",
          entityId: String(currentUser.id),
          purpose: "avatar",
        },
        orderBy: { createdAt: "desc" },
      });
      const primary = existing[0] ?? null;
      const storageKey = `organizations/${ctx.organizationId}/avatars/users/${currentUser.id}/profile`;
      const result = await uploadFile({
        body: buffer,
        organizationId: ctx.organizationId,
        folder: "avatars",
        fileName: validation.sanitizedFileName,
        mimeType: file.type,
        key: storageKey,
        metadata: {
          entityType: "user",
          entityId: String(currentUser.id),
          purpose: "avatar",
          uploadedBy: String(actorUserId),
        },
        maxSizeBytes: maxAvatarBytes,
      });

      const attachment = primary
        ? await prisma.attachment.update({
            where: { id: primary.id },
            data: {
              fileName: result.fileName,
              originalName: file.name,
              mimeType: result.mimeType,
              category: result.category,
              fileSize: result.fileSize,
              bucket: result.bucket,
              storageKey: result.key,
              checksum: result.etag ?? null,
              version: { increment: 1 },
              uploadedBy: String(actorUserId),
            },
          })
        : await prisma.attachment.create({
            data: {
              organizationId: ctx.organizationId,
              entityType: "user",
              entityId: String(currentUser.id),
              fileName: result.fileName,
              originalName: file.name,
              mimeType: result.mimeType,
              category: result.category,
              purpose: "avatar",
              fileSize: result.fileSize,
              bucket: result.bucket,
              storageKey: result.key,
              checksum: result.etag ?? null,
              version: 1,
              uploadedBy: String(actorUserId),
            },
          });

      const stale = existing.slice(1);
      if (stale.length) {
        await prisma.attachment.deleteMany({
          where: { id: { in: stale.map((item) => item.id) } },
        });
        await Promise.all(
          stale.map(async (item) => {
            try {
              await deleteFile({ key: item.storageKey, bucket: item.bucket });
            } catch (error) {
              console.warn("[PUT /api/users] Failed to delete stale avatar object:", error);
            }
          })
        );
      }

      const { hashed_password, ...userWithoutPassword } = currentUser;
      return NextResponse.json({
        ...userWithoutPassword,
        avatarAttachmentId: attachment.id,
      });
    }

    const body = await req.json();

    const updateData: any = {};
    if (body.full_name) updateData.name = body.full_name;
    if (body.avatar_url) updateData.avatar_url = body.avatar_url;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email as string },
      data: updateData,
    });

    const { hashed_password, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error("Error updating me:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
