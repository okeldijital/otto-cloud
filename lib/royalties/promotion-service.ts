/**
 * EntitlementPromotionService — candidates from approved Rights only.
 * Never reads contracts, AI drafts, or extraction layer.
 */

import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  ENTITLEMENT_EVENTS,
  mapRightCategoryToRevenue,
  REVENUE_CATEGORY_LABELS,
} from "./constants";
import { assertCanManageEntitlements } from "./permissions";
import { publishEntitlementEvent } from "./events";

/** Only these right statuses may produce entitlements */
const APPROVED_RIGHT_STATUSES = ["approved", "active"];

export class EntitlementPromotionService {
  async promoteFromRight(params: {
    ctx: OrganizationContext;
    organizationId: string;
    rightId: string;
  }) {
    assertCanManageEntitlements(params.ctx);

    const right = await prisma.right.findFirst({
      where: {
        id: params.rightId,
        organizationId: params.organizationId,
      },
      include: {
        parties: true,
        territories: true,
        grants: true,
        restrictions: true,
        contractRefs: true,
      },
    });

    if (!right) {
      throw new IntelligenceError("Right not found", 404, "RIGHT_NOT_FOUND");
    }

    if (!APPROVED_RIGHT_STATUSES.includes(right.status)) {
      throw new IntelligenceError(
        "Only approved or active rights can promote entitlements",
        400,
        "RIGHT_NOT_APPROVED"
      );
    }

    const manifest = await prisma.entitlementPromotionManifest.create({
      data: {
        organizationId: params.organizationId,
        rightId: right.id,
        rightVersion: right.version,
        contractId: right.contractId,
        verifiedContractId: right.verifiedContractId,
        verifiedVersion: right.verifiedVersion,
        status: "running",
        createdBy: params.ctx.userId,
      },
    });

    try {
      const revenueCategory = mapRightCategoryToRevenue(right.category);
      const payload = {
        rightId: right.id,
        rightCategory: right.category,
        rightStatus: right.status,
        exclusive: right.exclusive,
        parties: right.parties,
        territories: right.territories,
        grants: right.grants,
        restrictions: right.restrictions,
        contractRefs: right.contractRefs,
        effectiveDate: right.effectiveDate?.toISOString?.()?.slice(0, 10),
        expirationDate: right.expirationDate?.toISOString?.()?.slice(0, 10),
        defaultAllocation: {
          allocationType: "percentage",
          splitType: "fractional",
          shares: right.parties.length
            ? right.parties.map((p) => ({
                name: p.name,
                sharePercent:
                  p.sharePercent != null
                    ? p.sharePercent
                    : 100 / right.parties.length,
              }))
            : right.ownerName
              ? [{ name: right.ownerName, sharePercent: 100 }]
              : [{ name: "Unassigned", sharePercent: 100 }],
        },
      };

      const candidate = await prisma.entitlementCandidate.create({
        data: {
          organizationId: params.organizationId,
          promotionManifestId: manifest.id,
          rightId: right.id,
          rightVersion: right.version,
          contractId: right.contractId,
          verifiedContractId: right.verifiedContractId,
          verifiedVersion: right.verifiedVersion,
          revenueCategory,
          title: `${right.title} — ${REVENUE_CATEGORY_LABELS[revenueCategory] || revenueCategory}`,
          description: right.description,
          proposedPayload: payload as object,
          status: "pending",
        },
      });

      await publishEntitlementEvent({
        organizationId: params.organizationId,
        eventType: ENTITLEMENT_EVENTS.CandidateCreated,
        payload: {
          candidateId: candidate.id,
          rightId: right.id,
          revenueCategory,
          promotionManifestId: manifest.id,
        },
        userId: params.ctx.userId,
      });

      await prisma.entitlementPromotionManifest.update({
        where: { id: manifest.id },
        data: {
          status: "completed",
          candidateCount: 1,
          completedAt: new Date(),
        },
      });

      return {
        promotionManifestId: manifest.id,
        candidateCount: 1,
        candidates: [
          {
            id: candidate.id,
            title: candidate.title,
            revenueCategory: candidate.revenueCategory,
            status: candidate.status,
          },
        ],
      };
    } catch (error) {
      await prisma.entitlementPromotionManifest.update({
        where: { id: manifest.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }
}

export const entitlementPromotionService = new EntitlementPromotionService();
