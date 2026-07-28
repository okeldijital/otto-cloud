import { prisma } from "@/lib/prisma";
import {
  publishVerifiedContractEvent,
  VERIFIED_CONTRACT_EVENTS,
} from "./events";

export type FieldProvenance = {
  documentId: string;
  extractionId: string;
  extractionVersion?: number;
  verificationSessionId: string;
  sessionVersion?: number;
  verifiedFieldId?: string;
  fieldKey: string;
  decision: string;
  reviewerUserId: number | null;
  verifiedAt: string;
  aiValue?: string | null;
  aiConfidence?: number | null;
};

export type PromoteInput = {
  organizationId: string;
  contractId: number;
  documentId: string;
  extractionId: string;
  verificationSessionId: string;
  reviewerUserId: number;
  documentType?: string | null;
};

type PromotableField = {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  verifiedValue: string | null;
  decision: string;
  aiValue: string | null;
  aiConfidence: number | null;
  verifiedBy: number | null;
  verifiedAt: Date;
};

function fieldMap(rows: PromotableField[]) {
  const m = new Map<string, PromotableField>();
  for (const r of rows) m.set(r.fieldKey, r);
  return m;
}

function prov(
  input: PromoteInput,
  f: PromotableField,
  sessionVersion?: number,
  extractionVersion?: number
): FieldProvenance {
  return {
    documentId: input.documentId,
    extractionId: input.extractionId,
    extractionVersion,
    verificationSessionId: input.verificationSessionId,
    sessionVersion,
    verifiedFieldId: f.id,
    fieldKey: f.fieldKey,
    decision: f.decision,
    reviewerUserId: f.verifiedBy ?? input.reviewerUserId,
    verifiedAt: f.verifiedAt.toISOString(),
    aiValue: f.aiValue,
    aiConfidence: f.aiConfidence,
  };
}

/**
 * Split a parties string into names (best-effort).
 */
export function parsePartyNames(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const text = raw.trim();
  // "A and B" / "A & B" / "A, B, and C"
  const parts = text
    .split(/\s+and\s+|\s*&\s*|,\s*(?:and\s+)?/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

/**
 * Promote accepted/edited VerifiedField rows into normalized VerifiedContract domain.
 * Idempotent per verificationSessionId: re-running returns existing row.
 */
export async function promoteVerifiedContract(input: PromoteInput) {
  // Idempotency: one verified contract version per verification session
  const existing = await prisma.verifiedContract.findFirst({
    where: {
      verificationSessionId: input.verificationSessionId,
      organizationId: input.organizationId,
    },
    include: {
      parties: { orderBy: { sortOrder: "asc" } },
      terms: true,
      rights: true,
      obligations: true,
      territories: true,
      dates: true,
    },
  });
  if (existing) {
    return { verifiedContract: existing, created: false, eventType: null as string | null };
  }

  const session = await prisma.verificationSession.findFirst({
    where: {
      id: input.verificationSessionId,
      organizationId: input.organizationId,
      status: "completed",
    },
  });
  if (!session) {
    throw new Error("Verification session not found or not completed");
  }

  const extraction = await prisma.documentExtraction.findFirst({
    where: { id: input.extractionId, organizationId: input.organizationId },
  });

  const verifiedFields = (await prisma.verifiedField.findMany({
    where: {
      sessionId: input.verificationSessionId,
      organizationId: input.organizationId,
      decision: { in: ["accepted", "edited"] },
    },
  })) as PromotableField[];

  const map = fieldMap(verifiedFields);
  const get = (key: string) => map.get(key);

  const last = await prisma.verifiedContract.findFirst({
    where: { contractId: input.contractId, organizationId: input.organizationId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;
  const isReverify = !!last;

  const title = get("title")?.verifiedValue ?? null;
  const partiesRaw = get("parties")?.verifiedValue ?? null;
  const effective = get("effective_date")?.verifiedValue ?? null;
  const expiration = get("expiration_date")?.verifiedValue ?? null;
  const territory = get("territory")?.verifiedValue ?? null;
  const currency = get("currency")?.verifiedValue ?? null;
  const term = get("term")?.verifiedValue ?? null;
  const rights = get("rights")?.verifiedValue ?? null;
  const obligations = get("obligations")?.verifiedValue ?? null;
  const governingLaw = get("governing_law")?.verifiedValue ?? null;
  const referenceNumber = get("reference_number")?.verifiedValue ?? null;

  const rootProvenance = {
    documentId: input.documentId,
    extractionId: input.extractionId,
    extractionVersion: extraction?.version,
    verificationSessionId: input.verificationSessionId,
    sessionVersion: session.version,
    promotedBy: input.reviewerUserId,
    promotedAt: new Date().toISOString(),
    fieldKeys: verifiedFields.map((f) => f.fieldKey),
  };

  const result = await prisma.$transaction(async (tx) => {
    // Demote previous current versions
    await tx.verifiedContract.updateMany({
      where: {
        contractId: input.contractId,
        organizationId: input.organizationId,
        isCurrent: true,
      },
      data: { isCurrent: false },
    });

    const vc = await tx.verifiedContract.create({
      data: {
        organizationId: input.organizationId,
        contractId: input.contractId,
        documentId: input.documentId,
        extractionId: input.extractionId,
        verificationSessionId: input.verificationSessionId,
        version,
        isCurrent: true,
        status: "active",
        title,
        documentType: extraction?.documentType ?? input.documentType ?? null,
        referenceNumber,
        currency,
        territorySummary: territory,
        termSummary: term,
        rightsSummary: rights,
        obligationsSummary: obligations,
        effectiveDateText: effective,
        expirationDateText: expiration,
        governingLaw,
        provenance: rootProvenance,
        promotedBy: input.reviewerUserId,
        promotedAt: new Date(),
      },
    });

    const p = (f: PromotableField | undefined): FieldProvenance =>
      f
        ? prov(input, f, session.version, extraction?.version)
        : {
            documentId: input.documentId,
            extractionId: input.extractionId,
            verificationSessionId: input.verificationSessionId,
            fieldKey: "unknown",
            decision: "accepted",
            reviewerUserId: input.reviewerUserId,
            verifiedAt: new Date().toISOString(),
          };

    // Parties
    const names = parsePartyNames(partiesRaw);
    const partyField = get("parties");
    for (let i = 0; i < names.length; i++) {
      await tx.verifiedParty.create({
        data: {
          verifiedContractId: vc.id,
          organizationId: input.organizationId,
          name: names[i],
          role: null,
          sortOrder: i,
          provenance: p(partyField) as object,
        },
      });
    }

    if (term) {
      await tx.verifiedContractTerm.create({
        data: {
          verifiedContractId: vc.id,
          organizationId: input.organizationId,
          termType: "term",
          value: term,
          provenance: p(get("term")) as object,
        },
      });
    }

    if (rights) {
      await tx.verifiedRight.create({
        data: {
          verifiedContractId: vc.id,
          organizationId: input.organizationId,
          description: rights,
          provenance: p(get("rights")) as object,
        },
      });
    }

    if (obligations) {
      await tx.verifiedObligation.create({
        data: {
          verifiedContractId: vc.id,
          organizationId: input.organizationId,
          description: obligations,
          provenance: p(get("obligations")) as object,
        },
      });
    }

    if (territory) {
      for (const name of territory.split(/[,;/]/).map((s) => s.trim()).filter(Boolean)) {
        await tx.verifiedTerritory.create({
          data: {
            verifiedContractId: vc.id,
            organizationId: input.organizationId,
            name,
            provenance: p(get("territory")) as object,
          },
        });
      }
    }

    if (effective) {
      await tx.verifiedDate.create({
        data: {
          verifiedContractId: vc.id,
          organizationId: input.organizationId,
          dateType: "effective",
          valueText: effective,
          provenance: p(get("effective_date")) as object,
        },
      });
    }
    if (expiration) {
      await tx.verifiedDate.create({
        data: {
          verifiedContractId: vc.id,
          organizationId: input.organizationId,
          dateType: "expiration",
          valueText: expiration,
          provenance: p(get("expiration_date")) as object,
        },
      });
    }

    return tx.verifiedContract.findUniqueOrThrow({
      where: { id: vc.id },
      include: {
        parties: { orderBy: { sortOrder: "asc" } },
        terms: true,
        rights: true,
        obligations: true,
        territories: true,
        dates: true,
      },
    });
  });

  const eventType = isReverify
    ? VERIFIED_CONTRACT_EVENTS.Reverified
    : version === 1
      ? VERIFIED_CONTRACT_EVENTS.Created
      : VERIFIED_CONTRACT_EVENTS.Updated;

  await publishVerifiedContractEvent({
    organizationId: input.organizationId,
    contractId: input.contractId,
    verifiedContractId: result.id,
    eventType,
    payload: {
      version: result.version,
      title: result.title,
      partyCount: result.parties.length,
      verificationSessionId: input.verificationSessionId,
      documentId: input.documentId,
    },
    userId: input.reviewerUserId,
  });

  if (result.parties.length) {
    await publishVerifiedContractEvent({
      organizationId: input.organizationId,
      contractId: input.contractId,
      verifiedContractId: result.id,
      eventType: isReverify
        ? VERIFIED_CONTRACT_EVENTS.PartyUpdated
        : VERIFIED_CONTRACT_EVENTS.PartyAdded,
      payload: {
        parties: result.parties.map((p) => ({ id: p.id, name: p.name })),
      },
      userId: input.reviewerUserId,
    });
  }

  return { verifiedContract: result, created: true, eventType };
}
