import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth/organization-context";
import { documentIntelligenceService } from "@/lib/document-intelligence";

function positiveInt(raw: unknown, label: string): number {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? ""));
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`Invalid ${label}`);
  return n;
}

/**
 * Contract Intelligence intake actor bridge.
 *
 * IAM remains authoritative for authentication. Legacy contract/audit tables
 * still require users.id (INT), so this route resolves that actor server-side
 * from the authenticated IAM email + the current organization scope.
 * No client-supplied actor id is accepted and no fallback actor is used.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();
    if (!ctx.userEmail) {
      return NextResponse.json(
        { error: "Authenticated user email is not available", code: "USER_SCOPE_UNAVAILABLE" },
        { status: 403 }
      );
    }

    const legacyUser = await prisma.user.findFirst({
      where: {
        email: ctx.userEmail,
        organization_id: ctx.organizationId,
      },
      select: { id: true, is_active: true },
    });

    if (!legacyUser || legacyUser.is_active === false) {
      return NextResponse.json(
        { error: "No active legacy contract actor is mapped to the authenticated user", code: "USER_SCOPE_UNAVAILABLE" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.document_id || typeof body.document_id !== "string") {
      return NextResponse.json({ error: "Missing document_id" }, { status: 400 });
    }

    const contractId = body.contract_id == null ? null : positiveInt(body.contract_id, "contract_id");

    const job = await documentIntelligenceService.startExtraction({
      organizationId: ctx.organizationId,
      documentId: body.document_id,
      contractId,
      userId: legacyUser.id,
    });

    return NextResponse.json(job, { status: 202 });
  } catch (err: any) {
    console.error("[POST /api/ai/contracts/intake]", err);
    if (err?.message?.startsWith("Invalid contract_id")) {
      return NextResponse.json({ error: err.message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to start contract extraction" }, { status: 500 });
  }
}
