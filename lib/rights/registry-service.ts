import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  RIGHT_CATEGORY_LABELS,
  RIGHT_EVENTS,
  RIGHT_STATUS,
  RIGHT_TRANSITIONS,
  type RightStatus,
} from "./constants";
import { assertCanManageRights } from "./permissions";
import {
  appendRightHistory,
  appendRightTimeline,
  publishRightEvent,
} from "./events";
import { rightsLifecycleService } from "./lifecycle-service";

const includeAll = {
  grants: true,
  restrictions: true,
  parties: true,
  territories: true,
  works: true,
  releases: true,
  contractRefs: true,
} as const;

export class RightsRegistryService {
  async list(params: {
    organizationId: string;
    status?: string;
    category?: string;
    contractId?: number;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { organizationId: params.organizationId };
    if (params.status) where.status = params.status;
    if (params.category) where.category = params.category;
    if (params.contractId) where.contractId = params.contractId;

    const take = Math.min(params.limit ?? 50, 100);
    const skip = params.offset ?? 0;

    const [items, total] = await Promise.all([
      prisma.right.findMany({
        where,
        include: includeAll,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      prisma.right.count({ where }),
    ]);

    return {
      items: items.map((r) => this.toDto(r)),
      total,
      limit: take,
      offset: skip,
    };
  }

  async getById(params: { organizationId: string; rightId: string }) {
    const right = await prisma.right.findFirst({
      where: { id: params.rightId, organizationId: params.organizationId },
      include: includeAll,
    });
    if (!right) {
      throw new IntelligenceError("Right not found", 404, "RIGHT_NOT_FOUND");
    }
    return this.toDto(right);
  }

  async update(params: {
    ctx: OrganizationContext;
    organizationId: string;
    rightId: string;
    title?: string;
    description?: string | null;
    category?: string;
    exclusive?: boolean;
    status?: string;
    ownerType?: string | null;
    ownerEntityId?: string | null;
    ownerName?: string | null;
    effectiveDate?: string | null;
    expirationDate?: string | null;
    restrictions?: Array<{
      restrictionType: string;
      value: string;
      description?: string;
    }>;
  }) {
    assertCanManageRights(params.ctx);
    const existing = await prisma.right.findFirst({
      where: { id: params.rightId, organizationId: params.organizationId },
    });
    if (!existing) {
      throw new IntelligenceError("Right not found", 404, "RIGHT_NOT_FOUND");
    }

    if (params.status && params.status !== existing.status) {
      await rightsLifecycleService.transition({
        ctx: params.ctx,
        organizationId: params.organizationId,
        rightId: params.rightId,
        status: params.status,
      });
    }

    const data: any = {};
    if (params.title !== undefined) data.title = params.title;
    if (params.description !== undefined) data.description = params.description;
    if (params.category !== undefined) data.category = params.category;
    if (params.exclusive !== undefined) data.exclusive = params.exclusive;
    if (params.ownerType !== undefined) data.ownerType = params.ownerType;
    if (params.ownerEntityId !== undefined)
      data.ownerEntityId = params.ownerEntityId;
    if (params.ownerName !== undefined) data.ownerName = params.ownerName;
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
      await prisma.right.update({ where: { id: params.rightId }, data });
      await appendRightHistory({
        organizationId: params.organizationId,
        rightId: params.rightId,
        action: "updated",
        actorUserId: params.ctx.userId,
        payload: data,
      });
      await publishRightEvent({
        organizationId: params.organizationId,
        rightId: params.rightId,
        eventType: RIGHT_EVENTS.Updated,
        payload: data,
        userId: params.ctx.userId,
      });
    }

    if (params.restrictions?.length) {
      for (const r of params.restrictions) {
        await prisma.rightRestriction.create({
          data: {
            rightId: params.rightId,
            organizationId: params.organizationId,
            restrictionType: r.restrictionType,
            value: r.value,
            description: r.description || null,
          },
        });
      }
      await appendRightTimeline({
        organizationId: params.organizationId,
        rightId: params.rightId,
        entryType: "restriction",
        title: "Restrictions updated",
        actorUserId: params.ctx.userId,
      });
      await publishRightEvent({
        organizationId: params.organizationId,
        rightId: params.rightId,
        eventType: RIGHT_EVENTS.Restricted,
        payload: { count: params.restrictions.length },
        userId: params.ctx.userId,
      });
    }

    return this.getById({
      organizationId: params.organizationId,
      rightId: params.rightId,
    });
  }

  async getContracts(params: { organizationId: string; rightId: string }) {
    const refs = await prisma.rightContractReference.findMany({
      where: {
        organizationId: params.organizationId,
        rightId: params.rightId,
      },
    });
    return refs.map((r) => ({
      ...r,
      contractCenterUrl: `/contracts/${r.contractId}`,
    }));
  }

  /**
   * Relationships for a right — reuses Contract Relationship Layer by contract refs.
   * Does not invent a parallel rights relationship graph.
   */
  async getRelationships(params: {
    organizationId: string;
    rightId: string;
  }) {
    const right = await prisma.right.findFirst({
      where: { id: params.rightId, organizationId: params.organizationId },
      include: { contractRefs: true, works: true, releases: true },
    });
    if (!right) {
      throw new IntelligenceError("Right not found", 404, "RIGHT_NOT_FOUND");
    }

    const contractIds = right.contractRefs.map((c) => c.contractId);
    const contractRels =
      contractIds.length > 0
        ? await prisma.contractRelationship.findMany({
            where: {
              organizationId: params.organizationId,
              contractId: { in: contractIds },
              status: "active",
            },
          })
        : [];

    return {
      works: right.works,
      releases: right.releases,
      contractRelationships: contractRels,
      note: "Entity links use RightWork/RightRelease; contract links reuse Relationship Layer",
    };
  }

  toDto(r: any) {
    return {
      id: r.id,
      organizationId: r.organizationId,
      title: r.title,
      category: r.category,
      categoryLabel: RIGHT_CATEGORY_LABELS[r.category] || r.category,
      description: r.description,
      status: r.status,
      previousStatus: r.previousStatus,
      allowedTransitions:
        RIGHT_TRANSITIONS[r.status as RightStatus] || [],
      version: r.version,
      exclusive: r.exclusive,
      perpetual: r.perpetual,
      effectiveDate: formatDate(r.effectiveDate),
      expirationDate: formatDate(r.expirationDate),
      renewalDate: formatDate(r.renewalDate),
      terminationDate: formatDate(r.terminationDate),
      ownerType: r.ownerType,
      ownerEntityId: r.ownerEntityId,
      ownerName: r.ownerName,
      verifiedContractId: r.verifiedContractId,
      contractId: r.contractId,
      verificationSessionId: r.verificationSessionId,
      verifiedVersion: r.verifiedVersion,
      documentId: r.documentId,
      clauseReference: r.clauseReference,
      provenance: r.provenance,
      grants: r.grants || [],
      restrictions: r.restrictions || [],
      parties: r.parties || [],
      territories: r.territories || [],
      works: r.works || [],
      releases: r.releases || [],
      contractRefs: r.contractRefs || [],
      reviewedAt: r.reviewedAt?.toISOString?.() ?? r.reviewedAt,
      approvedAt: r.approvedAt?.toISOString?.() ?? r.approvedAt,
      createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
      contractCenterUrl: r.contractId
        ? `/contracts/${r.contractId}`
        : null,
    };
  }
}

function formatDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

export const rightsRegistryService = new RightsRegistryService();
