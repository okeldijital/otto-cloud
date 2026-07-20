import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUnassignedUserOrganizationId } from "@/lib/auth/migration-compat";

/**
 * Registration creates a User identity only.
 * Organization membership is intentional:
 *   - Accept an invitation → join existing org
 *   - POST /api/organizations → create org + membership
 *
 * Never invents organization_id via uuidv4().
 */
export async function POST(req: Request) {
  try {
    const { email, password, full_name } = await req.json();

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

    const newUser = await prisma.user.create({
      data: {
        email,
        hashed_password: hashedPassword,
        name: full_name,
        organization_id: getUnassignedUserOrganizationId(),
        tenant_id: null,
        is_active: true,
        role: "user",
      },
    });

    const { hashed_password, ...userWithoutPassword } = newUser;
    return NextResponse.json(
      {
        ...userWithoutPassword,
        requiresOrganization: true,
        message:
          "Account created. Accept an invitation or create an organization to continue.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
