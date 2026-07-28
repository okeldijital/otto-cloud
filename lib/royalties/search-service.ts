import { prisma } from "@/lib/prisma";
import { REVENUE_CATEGORY_LABELS } from "./constants";

export class EntitlementSearchService {
  async search(params: {
    organizationId: string;
    q?: string;
    revenueCategory?: string;
    status?: string;
    rightId?: string;
    beneficiary?: string;
    territory?: string;
    limit?: number;
  }) {
    const take = Math.min(params.limit ?? 30, 100);
    const where: any = { organizationId: params.organizationId };
    if (params.revenueCategory) where.revenueCategory = params.revenueCategory;
    if (params.status) where.status = params.status;
    if (params.rightId) where.rightId = params.rightId;

    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { revenueCategory: { contains: q, mode: "insensitive" } },
      ];
    }

    let items = await prisma.royaltyEntitlement.findMany({
      where,
      include: {
        beneficiaries: true,
        restrictions: true,
        allocations: { include: { shares: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: take * 2,
    });

    if (params.beneficiary?.trim()) {
      const b = params.beneficiary.trim().toLowerCase();
      items = items.filter((e) =>
        e.beneficiaries.some((x) => x.name.toLowerCase().includes(b))
      );
    }
    if (params.territory?.trim()) {
      const t = params.territory.trim().toLowerCase();
      items = items.filter((e) =>
        e.restrictions.some(
          (r) =>
            r.restrictionType === "territory" &&
            r.value.toLowerCase().includes(t)
        )
      );
    }

    return items.slice(0, take).map((e) => ({
      id: e.id,
      title: e.title,
      revenueCategory: e.revenueCategory,
      revenueCategoryLabel:
        REVENUE_CATEGORY_LABELS[e.revenueCategory] || e.revenueCategory,
      status: e.status,
      rightId: e.rightId,
      contractId: e.contractId,
      beneficiaries: e.beneficiaries.map((b) => b.name),
      expirationDate: e.expirationDate
        ? e.expirationDate.toISOString().slice(0, 10)
        : null,
    }));
  }
}

export const entitlementSearchService = new EntitlementSearchService();
