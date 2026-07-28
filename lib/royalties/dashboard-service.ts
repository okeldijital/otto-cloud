import { prisma } from "@/lib/prisma";
import { REVENUE_CATEGORY_LABELS } from "./constants";

export class EntitlementDashboardService {
  async getSummary(params: { organizationId: string }) {
    const now = new Date();
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + 90);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const entitlements = await prisma.royaltyEntitlement.findMany({
      where: { organizationId: params.organizationId },
      include: {
        beneficiaries: true,
        restrictions: true,
      },
    });

    const pendingReviews = await prisma.entitlementCandidate.count({
      where: { organizationId: params.organizationId, status: "pending" },
    });

    const byCategory: Record<string, number> = {};
    const beneficiarySet = new Set<string>();
    const territorySet = new Set<string>();

    for (const e of entitlements) {
      byCategory[e.revenueCategory] =
        (byCategory[e.revenueCategory] || 0) + 1;
      for (const b of e.beneficiaries) beneficiarySet.add(b.name);
      for (const r of e.restrictions) {
        if (r.restrictionType === "territory") territorySet.add(r.value);
      }
    }

    return {
      pendingReviews,
      active: entitlements.filter((e) => e.status === "active").length,
      total: entitlements.length,
      expiring: entitlements.filter(
        (e) =>
          e.expirationDate &&
          e.expirationDate >= now &&
          e.expirationDate <= in90
      ).length,
      byRevenueCategory: Object.entries(byCategory).map(
        ([category, count]) => ({
          category,
          label: REVENUE_CATEGORY_LABELS[category] || category,
          count,
        })
      ),
      beneficiaries: beneficiarySet.size,
      territories: territorySet.size,
      recentlyApproved: entitlements.filter(
        (e) => e.approvedAt && e.approvedAt >= weekAgo
      ).length,
      ownershipChanges: entitlements.filter(
        (e) => e.updatedAt >= weekAgo && e.status === "active"
      ).length,
    };
  }
}

export const entitlementDashboardService = new EntitlementDashboardService();
