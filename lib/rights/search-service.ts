import { prisma } from "@/lib/prisma";
import { RIGHT_CATEGORY_LABELS } from "./constants";

export class RightsSearchService {
  async search(params: {
    organizationId: string;
    q?: string;
    category?: string;
    status?: string;
    contractId?: number;
    territory?: string;
    owner?: string;
    limit?: number;
  }) {
    const take = Math.min(params.limit ?? 30, 100);
    const where: any = { organizationId: params.organizationId };
    if (params.category) where.category = params.category;
    if (params.status) where.status = params.status;
    if (params.contractId) where.contractId = params.contractId;

    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { ownerName: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { clauseReference: { contains: q, mode: "insensitive" } },
      ];
    }

    if (params.owner?.trim()) {
      where.ownerName = { contains: params.owner.trim(), mode: "insensitive" };
    }

    let items = await prisma.right.findMany({
      where,
      include: {
        territories: true,
        parties: true,
        restrictions: true,
      },
      orderBy: { updatedAt: "desc" },
      take: take * 2,
    });

    if (params.territory?.trim()) {
      const t = params.territory.trim().toLowerCase();
      items = items.filter((r) =>
        r.territories.some((x) => x.name.toLowerCase().includes(t))
      );
    }

    return items.slice(0, take).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      categoryLabel: RIGHT_CATEGORY_LABELS[r.category] || r.category,
      status: r.status,
      exclusive: r.exclusive,
      contractId: r.contractId,
      ownerName: r.ownerName,
      territories: r.territories.map((t) => t.name),
      parties: r.parties.map((p) => p.name),
      expirationDate: r.expirationDate
        ? r.expirationDate.toISOString().slice(0, 10)
        : null,
    }));
  }
}

export const rightsSearchService = new RightsSearchService();
