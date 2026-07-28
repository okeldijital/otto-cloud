import { prisma } from "@/lib/prisma";
import { RIGHT_CATEGORY_LABELS } from "./constants";

export class RightsDashboardService {
  async getSummary(params: { organizationId: string }) {
    const now = new Date();
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + 90);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const rights = await prisma.right.findMany({
      where: { organizationId: params.organizationId },
      include: { territories: true, restrictions: true },
    });

    const pendingReview = await prisma.rightCandidate.count({
      where: { organizationId: params.organizationId, status: "pending" },
    });

    const byCategory: Record<string, number> = {};
    for (const r of rights) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    }

    const territorySet = new Set<string>();
    for (const r of rights) {
      for (const t of r.territories) territorySet.add(t.name);
    }

    return {
      total: rights.length,
      pendingReview,
      byCategory: Object.entries(byCategory).map(([category, count]) => ({
        category,
        label: RIGHT_CATEGORY_LABELS[category] || category,
        count,
      })),
      expiring: rights.filter(
        (r) =>
          r.expirationDate &&
          r.expirationDate >= now &&
          r.expirationDate <= in90
      ).length,
      exclusive: rights.filter((r) => r.exclusive).length,
      withRestrictions: rights.filter((r) => r.restrictions.length > 0).length,
      territories: territorySet.size,
      recentlyActivated: rights.filter(
        (r) =>
          r.status === "active" &&
          r.statusChangedAt &&
          r.statusChangedAt >= weekAgo
      ).length,
      ownershipChanges: rights.filter(
        (r) => r.updatedAt >= weekAgo && r.ownerName
      ).length,
      byStatus: {
        active: rights.filter((r) => r.status === "active").length,
        approved: rights.filter((r) => r.status === "approved").length,
        suspended: rights.filter((r) => r.status === "suspended").length,
        expired: rights.filter((r) => r.status === "expired").length,
      },
    };
  }
}

export const rightsDashboardService = new RightsDashboardService();
