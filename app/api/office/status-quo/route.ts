import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth/organization-context";
import { getStatusQueue, summarizeStatusQueue } from "@/lib/status-queue/status-queue";

export async function GET() {
  try {
    const ctx = await requireOrganization();
    const items = await getStatusQueue(ctx.organizationId);

    return NextResponse.json({
      items,
      summary: summarizeStatusQueue(items),
    });
  } catch (error) {
    console.error("[GET /api/office/status-quo]", error);
    return NextResponse.json(
      { error: "Unable to evaluate status queue" },
      { status: 500 }
    );
  }
}
