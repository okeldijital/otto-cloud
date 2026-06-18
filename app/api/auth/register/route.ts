import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { email, password, full_name, org_name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newOrgId = uuidv4();
    const tenantId = uuidv4();

    const newUser = await prisma.user.create({
      data: {
        email,
        hashed_password: hashedPassword,
        name: full_name,
        organization_id: newOrgId,
        tenant_id: tenantId,
        is_active: true,
      },
    });

    await prisma.tenants.create({
      data: {
        id: tenantId,
        name: org_name || `${full_name || email}'s Organization`,
        display_name: org_name || null,
        org_type: "record_label",
        owner_id: newUser.id,
        is_active: true,
      },
    });

    await prisma.tenant_users.create({
      data: {
        tenant_id: tenantId,
        user_id: newUser.id,
        is_default: true,
        invited_at: new Date(),
        accepted_at: new Date(),
      },
    });

    const { hashed_password, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
