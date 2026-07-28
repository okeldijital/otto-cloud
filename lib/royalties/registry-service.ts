import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  canTransitionEntitlement,
  ENTITLEMENT_EVENTS,
  ENTITLEMENT_STATUS,
  ENTITLEMENT_TRANSITIONS,
  REVENUE_CATEGORY_LABELS,
  type EntitlementStatus,
} from "./constants";
import { assertCanManageEntitlements } from "./permissions";
import {
  appendEntitlementHistory,
  appendEntitlementTimeline,
  publishEntitlementEvent,
} from "./events";

const includeAll = {
  allocations: { include: { shares: true } },
  beneficiaries: true,
  restrictions: true,
  ownership: true,
} as const;

export class EntitlementRegistryService {
  async list(params: {
    organizationId: string;
    status?: string;
    revenueCategory?: string;
    rightId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { organizationId: params.organizationId };
    if (params.status) where.status = params.status;
    if (params.revenueCategory) where.revenueCategory = params.revenueCategory;
    if (params.rightId) where.rightId = params.rightId;

    const take = Math.min(params.limit ?? 50, 100);
    const skip = params.offset ?? 0;
    const [items, total] = await Promise.all([
      prisma.royaltyEntitlement.findMany({
        where,
        include: includeAll,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      prisma.royaltyEntitlement.count({ where }),
    ]);
    return {
      items: items.map((e) => this.toDto(e)),
      total,
      limit: take,
      offset: skip,
    };
  }

  async getById(params: { organizationId: string; entitlementId: string }) {
    const e = await prisma.royaltyEntitlement.findFirst({
      where: {
        id: params.entitlementId,
        organizationId: params.organizationId,
      },
      include: includeAll,
    });
    if (!e) {
      throw new IntelligenceError(
        "Entitlement not found",
        404,
        "ENTITLEMENT_NOT_FOUND"
      );
    }
    return this.toDto(e);
  }

  async getProvenance(params: {
    organizationId: string;
    entitlementId: string;
  }) {
    const e = await this.getById(params);
    const right = await prisma.right.findFirst({
      where: { id: e.rightId, organizationId: params.organizationId },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        version: true,
        contractId: true,
        verifiedContractId: true,
        verifiedVersion: true,
      },
    });
    return {
      entitlement: {
        id: e.id,
        title: e.title,
        status: e.status,
        version: e.version,
        provenance: e.provenance,
      },
      right,
      lineage: {
        rightId: e.rightId,
        rightVersion: e.rightVersion,
        contractId: e.contractId,
        verifiedContractId: e.verifiedContractId,
        verifiedVersion: e.verifiedVersion,
        promotionManifestId: e.promotionManifestId,
        candidateId: e.candidateId,
      },
    };
  }

  async update(params: {
    ctx: OrganizationContext;
    organizationId: string;
    entitlementId: string;
    title?: string;
    description?: string | null;
    revenueCategory?: string;
    status?: string;
    effectiveDate?: string | null;
    expirationDate?: string | null;
  }) {
    assertCanManageEntitlements(params.ctx);
    const existing = await prisma.royaltyEntitlement.findFirst({
      where: {
        id: params.entitlementId,
        organizationId: params.organizationId,
      },
    });
    if (!existing) {
      throw new IntelligenceError(
        "Entitlement not found",
        404,
        "ENTITLEMENT_NOT_FOUND"
      );
    }

    if (params.status && params.status !== existing.status) {
      await this.transition({
        ctx: params.ctx,
        organizationId: params.organizationId,
        entitlementId: params.entitlementId,
        status: params.status,
      });
    }

    const data: any = {};
    if (params.title !== undefined) data.title = params.title;
    if (params.description !== undefined) data.description = params.description;
    if (params.revenueCategory !== undefined)
      data.revenueCategory = params.revenueCategory;
    if (params.effectiveDate !== undefined) {
      data.effectiveDate = params.effectiveDate
        ? new Date(params.effectiveDate)
        : null;
    }
    if (params.expirationDate !== undefined) {
      data.expirationDate = params.expirationDate
        ? new Date(params.expirationDate)
        : null;
    }

    if (Object.keys(data).length) {
      await prisma.royaltyEntitlement.update({
        where: { id: params.entitlementId },
        data,
      });
      await appendEntitlementHistory({
        organizationId: params.organizationId,
        entitlementId: params.entitlementId,
        action: "updated",
        actorUserId: params.ctx.userId,
        payload: data,
      });
      await publishEntitlementEvent({
        organizationId: params.organizationId,
        entitlementId: params.entitlementId,
        eventType: ENTITLEMENT_EVENTS.Updated,
        payload: data,
        userId: params.ctx.userId,
      });
    }

    return this.getById({
      organizationId: params.organizationId,
      entitlementId: params.entitlementId,
    });
  }

  async transition(params: {
    ctx: OrganizationContext;
    organizationId: string;
    entitlementId: string;
    status: string;
  }) {
    assertCanManageEntitlements(params.ctx);
    const existing = await prisma.royaltyEntitlement.findFirst({
      where: {
        id: params.entitlementId,
        organizationId: params.organizationId,
      },
    });
    if (!existing) {
      throw new IntelligenceError(
        "Entitlement not found",
        404,
        "ENTITLEMENT_NOT_FOUND"
      );
    }

    const from = existing.status as EntitlementStatus;
    const to = params.status as EntitlementStatus;
    if (!Object.values(ENTITLEMENT_STATUS).includes(to as any)) {
      throw new IntelligenceError("Invalid status", 400, "INVALID_STATUS");
    }
    if (!canTransitionEntitlement(from, to)) {
      throw new IntelligenceError(
        `Cannot transition from ${from} to ${to}`,
        400,
        "INVALID_TRANSITION",
        [`Allowed: ${(ENTITLEMENT_TRANSITIONS[from] || []).join(", ") || "none"}`]
      );
    }

    await prisma.royaltyEntitlement.update({
      where: { id: existing.id },
      data: {
        previousStatus: from,
        status: to,
        statusChangedAt: new Date(),
        statusChangedBy: params.ctx.userId,
        ...(to === ENTITLEMENT_STATUS.suspended
          ? { suspensionDate: new Date() }
          : {}),
        ...(to === ENTITLEMENT_STATUS.terminated
          ? { terminationDate: new Date() }
          : {}),
      },
    });

    await appendEntitlementTimeline({
      organizationId: params.organizationId,
      entitlementId: existing.id,
      entryType: "lifecycle",
      title: `Status → ${to}`,
      description: `From ${from}`,
      actorUserId: params.ctx.userId,
      payload: { from, to },
    });

    if (to === ENTITLEMENT_STATUS.active) {
      await publishEntitlementEvent({
        organizationId: params.organizationId,
        entitlementId: existing.id,
        eventType: ENTITLEMENT_EVENTS.Activated,
        payload: {},
        userId: params.ctx.userId,
      });
    } else if (to === ENTITLEMENT_STATUS.expired) {
      await publishEntitlementEvent({
        organizationId: params.organizationId,
        entitlementId: existing.id,
        eventType: ENTITLEMENT_EVENTS.Expired,
        payload: {},
        userId: params.ctx.userId,
      });
    } else if (to === ENTITLEMENT_STATUS.suspended) {
      await publishEntitlementEvent({
        organizationId: params.organizationId,
        entitlementId: existing.id,
        eventType: ENTITLEMENT_EVENTS.Suspended,
        payload: {},
        userId: params.ctx.userId,
      });
    } else if (to === ENTITLEMENT_STATUS.terminated) {
      await publishEntitlementEvent({
        organizationId: params.organizationId,
        entitlementId: existing.id,
        eventType: ENTITLEMENT_EVENTS.Terminated,
        payload: {},
        userId: params.ctx.userId,
      });
    } else {
      await publishEntitlementEvent({
        organizationId: params.organizationId,
        entitlementId: existing.id,
        eventType: ENTITLEMENT_EVENTS.Updated,
        payload: { from, to },
        userId: params.ctx.userId,
      });
    }
  }

  async getTimeline(params: {
    organizationId: string;
    entitlementId: string;
    limit?: number;
  }) {
    await this.getById(params);
    const take = Math.min(params.limit ?? 100, 200);
    const [timeline, history] = await Promise.all([
      prisma.entitlementTimelineEntry.findMany({
        where: {
          organizationId: params.organizationId,
          entitlementId: params.entitlementId,
        },
        orderBy: { occurredAt: "desc" },
        take,
      }),
      prisma.entitlementHistory.findMany({
        where: {
          organizationId: params.organizationId,
          entitlementId: params.entitlementId,
        },
        orderBy: { createdAt: "desc" },
        take,
      }),
    ]);
    const merged = [
      ...timeline.map((e) => ({
        id: e.id,
        source: "timeline" as const,
        entryType: e.entryType,
        title: e.title,
        description: e.description,
        occurredAt: e.occurredAt.toISOString(),
      })),
      ...history.map((h) => ({
        id: `h-${h.id}`,
        source: "history" as const,
        entryType: h.action,
        title: h.action,
        description: null as string | null,
        occurredAt: h.createdAt.toISOString(),
      })),
    ];
    merged.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
    return merged.slice(0, take);
  }

  toDto(e: any) {
    return {
      id: e.id,
      organizationId: e.organizationId,
      title: e.title,
      revenueCategory: e.revenueCategory,
      revenueCategoryLabel:
        REVENUE_CATEGORY_LABELS[e.revenueCategory] || e.revenueCategory,
      description: e.description,
      status: e.status,
      previousStatus: e.previousStatus,
      allowedTransitions:
        ENTITLEMENT_TRANSITIONS[e.status as EntitlementStatus] || [],
      version: e.version,
      rightId: e.rightId,
      rightVersion: e.rightVersion,
      contractId: e.contractId,
      verifiedContractId: e.verifiedContractId,
      verifiedVersion: e.verifiedVersion,
      promotionManifestId: e.promotionManifestId,
      candidateId: e.candidateId,
      effectiveDate: formatDate(e.effectiveDate),
      expirationDate: formatDate(e.expirationDate),
      provenance: e.provenance,
      allocations: e.allocations || [],
      beneficiaries: e.beneficiaries || [],
      restrictions: e.restrictions || [],
      ownership: e.ownership || [],
      approvedAt: e.approvedAt?.toISOString?.() ?? e.approvedAt,
      createdAt: e.createdAt?.toISOString?.() ?? e.createdAt,
      updatedAt: e.updatedAt?.toISOString?.() ?? e.updatedAt,
      rightsUrl: `/rights/${e.rightId}`,
      contractUrl: e.contractId ? `/contracts/${e.contractId}` : null,
    };
  }
}

function formatDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

export const entitlementRegistryService = new EntitlementRegistryService();
