import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import { assertCanManageRelationships } from "./permissions";
import { matchingService } from "./matching-service";
import { relationshipDiscoveryService } from "./discovery-service";
import {
  TARGET_ENTITY_TYPES,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  type TargetEntityType,
} from "./constants";
import {
  emitRelationshipActivity,
  publishRelationshipEvent,
  recordRelationshipHistory,
  RELATIONSHIP_EVENTS,
} from "./events";

/**
 * RelationshipService — create/update/remove confirmed relationships.
 * Suggestions are never auto-linked.
 */
export class RelationshipService {
  async list(params: {
    organizationId: string;
    contractId: number;
    status?: string;
  }) {
    const rows = await prisma.contractRelationship.findMany({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        status: params.status || "active",
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toDto(r));
  }

  async listHistory(params: {
    organizationId: string;
    contractId: number;
  }) {
    const rows = await prisma.relationshipHistory.findMany({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((h) => ({
      id: h.id,
      action: h.action,
      relationshipId: h.relationshipId,
      suggestionId: h.suggestionId,
      actorUserId: h.actorUserId,
      payload: h.payload,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  async create(params: {
    ctx: OrganizationContext;
    organizationId: string;
    contractId: number;
    relationshipType: string;
    targetEntityType: string;
    targetEntityId: string;
    targetEntityName?: string;
    source?: "manual" | "suggestion";
    suggestionId?: string;
    confidence?: number | null;
    matchStrategy?: string | null;
    reason?: string | null;
    verifiedContractId?: string | null;
  }) {
    assertCanManageRelationships(params.ctx);
    this.validateTypes(params.relationshipType, params.targetEntityType);

    const name =
      params.targetEntityName ||
      (await matchingService.resolveEntityName(
        params.targetEntityType as TargetEntityType,
        params.targetEntityId,
        params.organizationId
      ));

    if (!name) {
      throw new IntelligenceError(
        "Target entity not found or not accessible",
        404,
        "TARGET_NOT_FOUND"
      );
    }

    // Soft-reactivate if previously removed same target
    const existing = await prisma.contractRelationship.findFirst({
      where: {
        contractId: params.contractId,
        relationshipType: params.relationshipType,
        targetEntityType: params.targetEntityType,
        targetEntityId: params.targetEntityId,
      },
    });

    if (existing && existing.status === "active") {
      throw new IntelligenceError(
        "Relationship already exists",
        409,
        "RELATIONSHIP_EXISTS"
      );
    }

    const provenance = {
      source: params.source || "manual",
      suggestionId: params.suggestionId || null,
      matchStrategy: params.matchStrategy || null,
      confidence: params.confidence ?? null,
      createdBy: params.ctx.userId,
      createdAt: new Date().toISOString(),
    };

    let row;
    if (existing) {
      row = await prisma.contractRelationship.update({
        where: { id: existing.id },
        data: {
          status: "active",
          targetEntityName: name,
          source: params.source || "manual",
          suggestionId: params.suggestionId || null,
          confidence: params.confidence ?? null,
          matchStrategy: params.matchStrategy || null,
          reason: params.reason || null,
          verifiedContractId: params.verifiedContractId || null,
          provenance: provenance as object,
          createdBy: params.ctx.userId,
          removedAt: null,
          removedBy: null,
        },
      });
    } else {
      row = await prisma.contractRelationship.create({
        data: {
          organizationId: params.organizationId,
          contractId: params.contractId,
          verifiedContractId: params.verifiedContractId || null,
          relationshipType: params.relationshipType,
          targetEntityType: params.targetEntityType,
          targetEntityId: params.targetEntityId,
          targetEntityName: name,
          status: "active",
          source: params.source || "manual",
          suggestionId: params.suggestionId || null,
          confidence: params.confidence ?? null,
          matchStrategy: params.matchStrategy || null,
          reason: params.reason || null,
          provenance: provenance as object,
          createdBy: params.ctx.userId,
        },
      });
    }

    await publishRelationshipEvent({
      organizationId: params.organizationId,
      contractId: params.contractId,
      eventType: RELATIONSHIP_EVENTS.Created,
      payload: {
        relationshipId: row.id,
        relationshipType: row.relationshipType,
        targetEntityType: row.targetEntityType,
        targetEntityId: row.targetEntityId,
        source: row.source,
      },
      userId: params.ctx.userId,
    });

    await recordRelationshipHistory({
      organizationId: params.organizationId,
      contractId: params.contractId,
      action: "created",
      actorUserId: params.ctx.userId,
      relationshipId: row.id,
      suggestionId: params.suggestionId,
      payload: { targetEntityName: name },
    });

    await emitRelationshipActivity({
      action: "Relationship Created",
      userId: params.ctx.userId,
      contractId: params.contractId,
      entityName: name,
    });

    return this.toDto(row);
  }

  async acceptSuggestion(params: {
    ctx: OrganizationContext;
    organizationId: string;
    contractId: number;
    suggestionId: string;
  }) {
    assertCanManageRelationships(params.ctx);
    const suggestion = await prisma.relationshipSuggestion.findFirst({
      where: {
        id: params.suggestionId,
        organizationId: params.organizationId,
        contractId: params.contractId,
      },
    });
    if (!suggestion) {
      throw new IntelligenceError("Suggestion not found", 404, "SUGGESTION_NOT_FOUND");
    }
    if (suggestion.status !== "pending") {
      throw new IntelligenceError(
        "Suggestion already decided",
        409,
        "SUGGESTION_DECIDED"
      );
    }

    const rel = await this.create({
      ctx: params.ctx,
      organizationId: params.organizationId,
      contractId: params.contractId,
      relationshipType: suggestion.relationshipType,
      targetEntityType: suggestion.targetEntityType,
      targetEntityId: suggestion.targetEntityId,
      targetEntityName: suggestion.targetEntityName || undefined,
      source: "suggestion",
      suggestionId: suggestion.id,
      confidence: suggestion.confidence,
      matchStrategy: suggestion.matchStrategy,
      reason: suggestion.reason,
      verifiedContractId: suggestion.verifiedContractId,
    });

    await prisma.relationshipSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: "accepted",
        decidedAt: new Date(),
        decidedBy: params.ctx.userId,
      },
    });

    await prisma.relationshipDecision.create({
      data: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        suggestionId: suggestion.id,
        decision: "accepted",
        actorUserId: params.ctx.userId,
        relationshipId: rel.id,
      },
    });

    await recordRelationshipHistory({
      organizationId: params.organizationId,
      contractId: params.contractId,
      action: "accepted",
      actorUserId: params.ctx.userId,
      relationshipId: rel.id,
      suggestionId: suggestion.id,
    });

    return rel;
  }

  async rejectSuggestion(params: {
    ctx: OrganizationContext;
    organizationId: string;
    contractId: number;
    suggestionId: string;
    notes?: string;
  }) {
    assertCanManageRelationships(params.ctx);
    const suggestion = await prisma.relationshipSuggestion.findFirst({
      where: {
        id: params.suggestionId,
        organizationId: params.organizationId,
        contractId: params.contractId,
      },
    });
    if (!suggestion) {
      throw new IntelligenceError("Suggestion not found", 404, "SUGGESTION_NOT_FOUND");
    }
    if (suggestion.status !== "pending") {
      throw new IntelligenceError(
        "Suggestion already decided",
        409,
        "SUGGESTION_DECIDED"
      );
    }

    await prisma.relationshipSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: "rejected",
        decidedAt: new Date(),
        decidedBy: params.ctx.userId,
      },
    });

    await prisma.relationshipDecision.create({
      data: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        suggestionId: suggestion.id,
        decision: "rejected",
        actorUserId: params.ctx.userId,
        notes: params.notes || null,
      },
    });

    await publishRelationshipEvent({
      organizationId: params.organizationId,
      contractId: params.contractId,
      eventType: RELATIONSHIP_EVENTS.Rejected,
      payload: {
        suggestionId: suggestion.id,
        targetEntityType: suggestion.targetEntityType,
        targetEntityId: suggestion.targetEntityId,
      },
      userId: params.ctx.userId,
    });

    await recordRelationshipHistory({
      organizationId: params.organizationId,
      contractId: params.contractId,
      action: "rejected",
      actorUserId: params.ctx.userId,
      suggestionId: suggestion.id,
      payload: { notes: params.notes },
    });

    return { id: suggestion.id, status: "rejected" };
  }

  async update(params: {
    ctx: OrganizationContext;
    organizationId: string;
    contractId: number;
    relationshipId: string;
    relationshipType?: string;
    reason?: string | null;
  }) {
    assertCanManageRelationships(params.ctx);
    const row = await prisma.contractRelationship.findFirst({
      where: {
        id: params.relationshipId,
        organizationId: params.organizationId,
        contractId: params.contractId,
        status: "active",
      },
    });
    if (!row) {
      throw new IntelligenceError("Relationship not found", 404, "NOT_FOUND");
    }

    if (params.relationshipType) {
      this.validateTypes(params.relationshipType, row.targetEntityType);
    }

    const updated = await prisma.contractRelationship.update({
      where: { id: row.id },
      data: {
        relationshipType: params.relationshipType || row.relationshipType,
        reason: params.reason !== undefined ? params.reason : row.reason,
      },
    });

    await publishRelationshipEvent({
      organizationId: params.organizationId,
      contractId: params.contractId,
      eventType: RELATIONSHIP_EVENTS.Updated,
      payload: {
        relationshipId: updated.id,
        relationshipType: updated.relationshipType,
      },
      userId: params.ctx.userId,
    });

    await recordRelationshipHistory({
      organizationId: params.organizationId,
      contractId: params.contractId,
      action: "updated",
      actorUserId: params.ctx.userId,
      relationshipId: updated.id,
      payload: {
        relationshipType: updated.relationshipType,
        reason: updated.reason,
      },
    });

    return this.toDto(updated);
  }

  async remove(params: {
    ctx: OrganizationContext;
    organizationId: string;
    contractId: number;
    relationshipId: string;
  }) {
    assertCanManageRelationships(params.ctx);
    const row = await prisma.contractRelationship.findFirst({
      where: {
        id: params.relationshipId,
        organizationId: params.organizationId,
        contractId: params.contractId,
        status: "active",
      },
    });
    if (!row) {
      throw new IntelligenceError("Relationship not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.contractRelationship.update({
      where: { id: row.id },
      data: {
        status: "removed",
        removedAt: new Date(),
        removedBy: params.ctx.userId,
      },
    });

    await publishRelationshipEvent({
      organizationId: params.organizationId,
      contractId: params.contractId,
      eventType: RELATIONSHIP_EVENTS.Removed,
      payload: {
        relationshipId: updated.id,
        targetEntityType: updated.targetEntityType,
        targetEntityId: updated.targetEntityId,
      },
      userId: params.ctx.userId,
    });

    await recordRelationshipHistory({
      organizationId: params.organizationId,
      contractId: params.contractId,
      action: "removed",
      actorUserId: params.ctx.userId,
      relationshipId: updated.id,
    });

    await emitRelationshipActivity({
      action: "Relationship Removed",
      userId: params.ctx.userId,
      contractId: params.contractId,
      entityName: updated.targetEntityName || undefined,
    });

    return this.toDto(updated);
  }

  async searchTargets(params: {
    organizationId: string;
    q: string;
    entityType?: string;
  }) {
    const types = params.entityType
      ? ([params.entityType] as TargetEntityType[])
      : undefined;
    return matchingService.matchName({
      organizationId: params.organizationId,
      sourceText: params.q,
      entityTypes: types,
      limit: 10,
    });
  }

  async getMeta() {
    return {
      relationshipTypes: RELATIONSHIP_TYPES.map((t) => ({
        value: t,
        label: RELATIONSHIP_TYPE_LABELS[t] || t,
      })),
      targetEntityTypes: TARGET_ENTITY_TYPES,
    };
  }

  private validateTypes(relationshipType: string, targetEntityType: string) {
    if (!(RELATIONSHIP_TYPES as readonly string[]).includes(relationshipType)) {
      // Allow extension beyond defaults if non-empty
      if (!relationshipType || relationshipType.length > 64) {
        throw new IntelligenceError(
          "Invalid relationship type",
          400,
          "INVALID_RELATIONSHIP_TYPE"
        );
      }
    }
    if (!(TARGET_ENTITY_TYPES as readonly string[]).includes(targetEntityType)) {
      throw new IntelligenceError(
        "Invalid target entity type",
        400,
        "INVALID_TARGET_TYPE"
      );
    }
  }

  toDto(r: any) {
    return {
      id: r.id,
      contractId: r.contractId,
      verifiedContractId: r.verifiedContractId,
      relationshipType: r.relationshipType,
      relationshipTypeLabel:
        RELATIONSHIP_TYPE_LABELS[r.relationshipType] || r.relationshipType,
      targetEntityType: r.targetEntityType,
      targetEntityId: r.targetEntityId,
      targetEntityName: r.targetEntityName,
      status: r.status,
      source: r.source,
      suggestionId: r.suggestionId,
      confidence: r.confidence,
      matchStrategy: r.matchStrategy,
      reason: r.reason,
      provenance: r.provenance,
      createdBy: r.createdBy,
      createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      removedAt: r.removedAt?.toISOString?.() ?? r.removedAt,
    };
  }
}

export const relationshipService = new RelationshipService();

// re-export discovery for convenience
export { relationshipDiscoveryService };
