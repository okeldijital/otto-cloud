/**
 * RightsReviewService — human validation of candidates.
 * Approve / Reject / Edit — no AI chat.
 */

import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import { RIGHT_EVENTS, RIGHT_STATUS } from "./constants";
import { assertCanReviewRights } from "./permissions";
import {
  appendRightHistory,
  appendRightTimeline,
  publishRightEvent,
} from "./events";

function tryParseDate(text?: string | null): Date | null {
  if (!text) return null;
  const t = Date.parse(text);
  return Number.isNaN(t) ? null : new Date(t);
}

export class RightsReviewService {
  async listCandidates(params: {
    organizationId: string;
    status?: string;
    limit?: number;
  }) {
    return prisma.rightCandidate.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.status ? { status: params.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50,
    });
  }

  async decide(params: {
    ctx: OrganizationContext;
    organizationId: string;
    candidateId: string;
    decision: "approve" | "reject";
    notes?: string;
    /** Optional edits before approve */
    edits?: {
      title?: string;
      category?: string;
      description?: string;
      exclusive?: boolean;
    };
  }) {
    assertCanReviewRights(params.ctx);

    const candidate = await prisma.rightCandidate.findFirst({
      where: {
        id: params.candidateId,
        organizationId: params.organizationId,
      },
    });
    if (!candidate) {
      throw new IntelligenceError(
        "Candidate not found",
        404,
        "CANDIDATE_NOT_FOUND"
      );
    }
    if (candidate.status !== "pending") {
      throw new IntelligenceError(
        "Candidate already decided",
        409,
        "CANDIDATE_DECIDED"
      );
    }

    if (params.decision === "reject") {
      const updated = await prisma.rightCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "rejected",
          decisionNotes: params.notes || null,
          decidedBy: params.ctx.userId,
          decidedAt: new Date(),
          ...(params.edits?.title ? { title: params.edits.title } : {}),
        },
      });
      await publishRightEvent({
        organizationId: params.organizationId,
        eventType: RIGHT_EVENTS.ReviewCompleted,
        payload: {
          candidateId: candidate.id,
          decision: "reject",
          contractId: candidate.contractId,
        },
        userId: params.ctx.userId,
      });
      return { candidate: updated, right: null };
    }

    // Approve → create registry Right
    const payload = (candidate.proposedPayload || {}) as Record<string, any>;
    const title = params.edits?.title || candidate.title;
    const category = params.edits?.category || candidate.category;
    const description =
      params.edits?.description ?? candidate.description ?? null;
    const exclusive =
      params.edits?.exclusive ?? candidate.exclusive ?? false;

    const right = await prisma.right.create({
      data: {
        organizationId: params.organizationId,
        title,
        category,
        description,
        status: RIGHT_STATUS.approved,
        statusChangedAt: new Date(),
        statusChangedBy: params.ctx.userId,
        exclusive,
        effectiveDate: tryParseDate(payload.effectiveDateText),
        expirationDate: tryParseDate(payload.expirationDateText),
        verifiedContractId: candidate.verifiedContractId,
        contractId: candidate.contractId,
        verificationSessionId: candidate.verificationSessionId,
        verifiedVersion: candidate.verifiedVersion,
        documentId: candidate.documentId,
        clauseReference: candidate.clauseReference,
        promotionRunId: candidate.promotionRunId,
        candidateId: candidate.id,
        reviewedBy: params.ctx.userId,
        reviewedAt: new Date(),
        approvedBy: params.ctx.userId,
        approvedAt: new Date(),
        createdBy: params.ctx.userId,
        provenance: {
          verifiedContractId: candidate.verifiedContractId,
          verifiedVersion: candidate.verifiedVersion,
          verificationSessionId: candidate.verificationSessionId,
          documentId: candidate.documentId,
          promotionRunId: candidate.promotionRunId,
          candidateId: candidate.id,
          source: payload.source,
          promotedAt: new Date().toISOString(),
        } as object,
        grants: {
          create: {
            organizationId: params.organizationId,
            grantType: exclusive ? "exclusive_license" : "license",
            exclusive,
            transferable: false,
            assignable: false,
            sublicensable: false,
            revocable: true,
            perpetual: false,
          },
        },
        contractRefs: {
          create: {
            organizationId: params.organizationId,
            contractId: candidate.contractId,
            verifiedContractId: candidate.verifiedContractId,
            verifiedVersion: candidate.verifiedVersion,
            role: "source",
          },
        },
      },
    });

    // Parties from verified snapshot
    const parties = Array.isArray(payload.parties) ? payload.parties : [];
    for (const p of parties) {
      if (!p?.name) continue;
      await prisma.rightParty.create({
        data: {
          rightId: right.id,
          organizationId: params.organizationId,
          role: p.role || "party",
          name: p.name,
        },
      });
    }

    const territories = Array.isArray(payload.territories)
      ? payload.territories
      : [];
    for (const t of territories) {
      const name = t?.name || String(t);
      if (!name) continue;
      await prisma.rightTerritory.create({
        data: {
          rightId: right.id,
          organizationId: params.organizationId,
          territoryType: /world/i.test(name) ? "worldwide" : "custom",
          name,
        },
      });
    }

    await prisma.rightCandidate.update({
      where: { id: candidate.id },
      data: {
        status: "approved",
        decisionNotes: params.notes || null,
        decidedBy: params.ctx.userId,
        decidedAt: new Date(),
        resultingRightId: right.id,
        title,
        category,
        description,
        exclusive,
      },
    });

    await appendRightTimeline({
      organizationId: params.organizationId,
      rightId: right.id,
      entryType: "approval",
      title: "Right approved from candidate",
      actorUserId: params.ctx.userId,
      payload: { candidateId: candidate.id },
    });
    await appendRightHistory({
      organizationId: params.organizationId,
      rightId: right.id,
      action: "approved",
      actorUserId: params.ctx.userId,
      payload: { candidateId: candidate.id },
    });

    await publishRightEvent({
      organizationId: params.organizationId,
      rightId: right.id,
      eventType: RIGHT_EVENTS.ReviewCompleted,
      payload: {
        candidateId: candidate.id,
        decision: "approve",
        contractId: candidate.contractId,
      },
      userId: params.ctx.userId,
    });
    await publishRightEvent({
      organizationId: params.organizationId,
      rightId: right.id,
      eventType: RIGHT_EVENTS.Created,
      payload: {
        category: right.category,
        contractId: candidate.contractId,
        status: right.status,
      },
      userId: params.ctx.userId,
    });

    return { candidate: { ...candidate, status: "approved" }, right };
  }
}

export const rightsReviewService = new RightsReviewService();
