import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  ENTITLEMENT_EVENTS,
  ENTITLEMENT_STATUS,
  validateFractionalSplit,
} from "./constants";
import { assertCanReviewEntitlements } from "./permissions";
import {
  appendEntitlementHistory,
  appendEntitlementTimeline,
  publishEntitlementEvent,
} from "./events";

export class EntitlementReviewService {
  async listCandidates(params: {
    organizationId: string;
    status?: string;
    limit?: number;
  }) {
    return prisma.entitlementCandidate.findMany({
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
    edits?: {
      title?: string;
      revenueCategory?: string;
      description?: string;
    };
  }) {
    assertCanReviewEntitlements(params.ctx);

    const candidate = await prisma.entitlementCandidate.findFirst({
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
      const updated = await prisma.entitlementCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "rejected",
          decisionNotes: params.notes || null,
          decidedBy: params.ctx.userId,
          decidedAt: new Date(),
        },
      });
      await publishEntitlementEvent({
        organizationId: params.organizationId,
        eventType: ENTITLEMENT_EVENTS.ReviewCompleted,
        payload: {
          candidateId: candidate.id,
          decision: "reject",
          rightId: candidate.rightId,
        },
        userId: params.ctx.userId,
      });
      return { candidate: updated, entitlement: null };
    }

    const payload = (candidate.proposedPayload || {}) as Record<string, any>;
    const title = params.edits?.title || candidate.title;
    const revenueCategory =
      params.edits?.revenueCategory || candidate.revenueCategory;
    const description =
      params.edits?.description ?? candidate.description ?? null;

    const defaultShares =
      payload.defaultAllocation?.shares ||
      ([{ name: "Unassigned", sharePercent: 100 }] as Array<{
        name: string;
        sharePercent: number;
      }>);

    const splitCheck = validateFractionalSplit(defaultShares);
    if (!splitCheck.ok) {
      throw new IntelligenceError(
        splitCheck.error || "Invalid split",
        400,
        "INVALID_SPLIT"
      );
    }

    // Normalize to 0-100
    const normalized = defaultShares.map((s: any) => {
      let pct = Number(s.sharePercent) || 0;
      if (pct > 0 && pct <= 1 && splitCheck.total <= 1.01) pct = pct * 100;
      return { name: s.name, sharePercent: pct };
    });

    const entitlement = await prisma.royaltyEntitlement.create({
      data: {
        organizationId: params.organizationId,
        title,
        revenueCategory,
        description,
        status: ENTITLEMENT_STATUS.approved,
        statusChangedAt: new Date(),
        statusChangedBy: params.ctx.userId,
        rightId: candidate.rightId,
        rightVersion: candidate.rightVersion,
        contractId: candidate.contractId,
        verifiedContractId: candidate.verifiedContractId,
        verifiedVersion: candidate.verifiedVersion,
        promotionManifestId: candidate.promotionManifestId,
        candidateId: candidate.id,
        effectiveDate: payload.effectiveDate
          ? new Date(payload.effectiveDate)
          : null,
        expirationDate: payload.expirationDate
          ? new Date(payload.expirationDate)
          : null,
        reviewedBy: params.ctx.userId,
        reviewedAt: new Date(),
        approvedBy: params.ctx.userId,
        approvedAt: new Date(),
        createdBy: params.ctx.userId,
        provenance: {
          rightId: candidate.rightId,
          rightVersion: candidate.rightVersion,
          contractId: candidate.contractId,
          verifiedContractId: candidate.verifiedContractId,
          verifiedVersion: candidate.verifiedVersion,
          promotionManifestId: candidate.promotionManifestId,
          candidateId: candidate.id,
          promotedAt: new Date().toISOString(),
        } as object,
        allocations: {
          create: {
            organizationId: params.organizationId,
            allocationType: "percentage",
            splitType: "fractional",
            percentage: 100,
            shares: {
              create: normalized.map((s: any, i: number) => ({
                organizationId: params.organizationId,
                beneficiaryName: s.name,
                sharePercent: s.sharePercent,
                sortOrder: i,
              })),
            },
          },
        },
      },
      include: {
        allocations: { include: { shares: true } },
      },
    });

    // Beneficiaries + ownership from proposed parties
    const parties = Array.isArray(payload.parties) ? payload.parties : [];
    for (const p of parties) {
      if (!p?.name) continue;
      await prisma.royaltyBeneficiary.create({
        data: {
          entitlementId: entitlement.id,
          organizationId: params.organizationId,
          beneficiaryType: "custom",
          name: p.name,
          role: p.role || "beneficiary",
        },
      });
      await prisma.royaltyOwnership.create({
        data: {
          entitlementId: entitlement.id,
          organizationId: params.organizationId,
          role: "beneficiary",
          name: p.name,
        },
      });
    }

    // Mirror right restrictions where applicable
    const restrictions = Array.isArray(payload.restrictions)
      ? payload.restrictions
      : [];
    for (const r of restrictions) {
      await prisma.entitlementRestriction.create({
        data: {
          entitlementId: entitlement.id,
          organizationId: params.organizationId,
          restrictionType: r.restrictionType || "custom",
          value: r.value || String(r),
          description: r.description || null,
        },
      });
    }

    // Territories as territory restrictions
    const territories = Array.isArray(payload.territories)
      ? payload.territories
      : [];
    for (const t of territories) {
      const name = t?.name || String(t);
      if (!name) continue;
      await prisma.entitlementRestriction.create({
        data: {
          entitlementId: entitlement.id,
          organizationId: params.organizationId,
          restrictionType: "territory",
          value: name,
        },
      });
    }

    await prisma.entitlementCandidate.update({
      where: { id: candidate.id },
      data: {
        status: "approved",
        decisionNotes: params.notes || null,
        decidedBy: params.ctx.userId,
        decidedAt: new Date(),
        resultingEntitlementId: entitlement.id,
        title,
        revenueCategory,
        description,
      },
    });

    await appendEntitlementTimeline({
      organizationId: params.organizationId,
      entitlementId: entitlement.id,
      entryType: "approval",
      title: "Entitlement approved from candidate",
      actorUserId: params.ctx.userId,
      payload: { candidateId: candidate.id, rightId: candidate.rightId },
    });
    await appendEntitlementHistory({
      organizationId: params.organizationId,
      entitlementId: entitlement.id,
      action: "approved",
      actorUserId: params.ctx.userId,
      payload: { candidateId: candidate.id },
    });

    await publishEntitlementEvent({
      organizationId: params.organizationId,
      entitlementId: entitlement.id,
      eventType: ENTITLEMENT_EVENTS.ReviewCompleted,
      payload: {
        candidateId: candidate.id,
        decision: "approve",
        rightId: candidate.rightId,
      },
      userId: params.ctx.userId,
    });
    await publishEntitlementEvent({
      organizationId: params.organizationId,
      entitlementId: entitlement.id,
      eventType: ENTITLEMENT_EVENTS.Created,
      payload: {
        rightId: candidate.rightId,
        revenueCategory,
        status: entitlement.status,
      },
      userId: params.ctx.userId,
    });

    return { candidate: { ...candidate, status: "approved" }, entitlement };
  }
}

export const entitlementReviewService = new EntitlementReviewService();
