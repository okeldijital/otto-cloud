import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { IntelligenceError } from "@/lib/document-intelligence";
import type { OrganizationContext } from "@/lib/auth/organization-context";

export type AmendmentDraftContent = {
  title?: string | null;
  documentType?: string | null;
  referenceNumber?: string | null;
  effectiveDateText?: string | null;
  expirationDateText?: string | null;
  governingLaw?: string | null;
  currency?: string | null;
  territorySummary?: string | null;
  termSummary?: string | null;
  rightsSummary?: string | null;
  obligationsSummary?: string | null;
  parties?: Array<{ name: string; role?: string | null }>;
};

function assertManage(ctx: OrganizationContext) {
  if (!ctx.userId) throw new IntelligenceError("Authentication required", 401, "UNAUTHENTICATED");
}

export async function createAmendmentDraft(params: {
  ctx: OrganizationContext;
  organizationId: string;
  contractId: number;
  amendmentId: string;
}) {
  assertManage(params.ctx);

  const amendment = await prisma.contractAmendment.findFirst({
    where: {
      id: params.amendmentId,
      organizationId: params.organizationId,
      contractId: params.contractId,
    },
  });
  if (!amendment) throw new IntelligenceError("Amendment not found", 404, "AMENDMENT_NOT_FOUND");

  const current = await prisma.verifiedContract.findFirst({
    where: { contractId: params.contractId, organizationId: params.organizationId, isCurrent: true },
    include: {
      parties: { orderBy: { sortOrder: "asc" } },
      terms: true,
      rights: true,
      obligations: true,
      territories: true,
    },
  });

  const existing = await prisma.$queryRaw<Array<any>>`
    SELECT "id", "status", "content", "sourceVerifiedContractId", "createdAt", "updatedAt"
    FROM "contract_amendment_drafts"
    WHERE "amendmentId" = ${params.amendmentId}::uuid
      AND "organizationId" = ${params.organizationId}::uuid
    LIMIT 1
  `;
  if (existing[0]) return { draft: existing[0], created: false };

  const content: AmendmentDraftContent = {
    title: current?.title ?? null,
    documentType: current?.documentType ?? null,
    referenceNumber: current?.referenceNumber ?? null,
    effectiveDateText: current?.effectiveDateText ?? null,
    expirationDateText: current?.expirationDateText ?? null,
    governingLaw: current?.governingLaw ?? null,
    currency: current?.currency ?? null,
    territorySummary: current?.territorySummary ?? null,
    termSummary: current?.termSummary ?? null,
    rightsSummary: current?.rightsSummary ?? null,
    obligationsSummary: current?.obligationsSummary ?? null,
    parties: current?.parties.map((p) => ({ name: p.name, role: p.role })) ?? [],
  };

  const id = randomUUID();
  const rows = await prisma.$queryRaw<Array<any>>`
    INSERT INTO "contract_amendment_drafts"
      ("id", "organizationId", "contractId", "amendmentId", "sourceVerifiedContractId", "status", "content", "createdBy", "updatedBy")
    VALUES
      (${id}::uuid, ${params.organizationId}::uuid, ${params.contractId}, ${params.amendmentId}::uuid,
       ${current?.id ?? null}::uuid, 'draft', ${JSON.stringify(content)}::jsonb, ${params.ctx.userId}, ${params.ctx.userId})
    RETURNING "id", "status", "content", "sourceVerifiedContractId", "createdAt", "updatedAt"
  `;

  return { draft: rows[0], created: true };
}

export async function getAmendmentDraft(params: {
  organizationId: string;
  contractId: number;
  amendmentId: string;
}) {
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT "id", "status", "content", "sourceVerifiedContractId", "createdBy", "updatedBy", "createdAt", "updatedAt"
    FROM "contract_amendment_drafts"
    WHERE "organizationId" = ${params.organizationId}::uuid
      AND "contractId" = ${params.contractId}
      AND "amendmentId" = ${params.amendmentId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function updateAmendmentDraft(params: {
  ctx: OrganizationContext;
  organizationId: string;
  contractId: number;
  amendmentId: string;
  content: AmendmentDraftContent;
}) {
  assertManage(params.ctx);
  const existing = await getAmendmentDraft(params);
  if (!existing) throw new IntelligenceError("Amendment draft not found", 404, "AMENDMENT_DRAFT_NOT_FOUND");
  if (existing.status !== "draft") throw new IntelligenceError("Only draft amendments can be edited", 409, "AMENDMENT_DRAFT_LOCKED");

  const rows = await prisma.$queryRaw<Array<any>>`
    UPDATE "contract_amendment_drafts"
    SET "content" = ${JSON.stringify(params.content)}::jsonb,
        "updatedBy" = ${params.ctx.userId},
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "organizationId" = ${params.organizationId}::uuid
      AND "contractId" = ${params.contractId}
      AND "amendmentId" = ${params.amendmentId}::uuid
      AND "status" = 'draft'
    RETURNING "id", "status", "content", "sourceVerifiedContractId", "createdAt", "updatedAt"
  `;
  return rows[0];
}
