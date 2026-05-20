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

    // In legacy python, org_id is used. We fetch the user's organization.
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user || !user.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Since we don't have subscriptions and plans directly in the introspection (or we skipped them),
    // we'll stub this based on the Python logic or try to query if tables exist.
    // Let's stub it based on legacy fallback logic for now.
    
    const plan = {
      name: "Pro",
      job_limit: 100,
      price: null
    };

    return NextResponse.json({
      success: true,
      data: {
        plan,
        usage: {
          jobs: 0,
          limit: 100
        }
      }
    });
  } catch (error: any) {
    console.error("Error fetching billing info:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
