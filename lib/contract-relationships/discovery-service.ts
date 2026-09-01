import { prisma } from "@/lib/prisma";
import { verifiedContractService } from "@/lib/verified-contract";
import { matchingService } from "./matching-service";
import {
  publishRelationshipEvent,
  recordRelationshipHistory,
  RELATIONSHIP_EVENTS,
} from "./events";
import type { TargetEntityType } from "./constants";

/**
 * RelationshipDiscoveryService — generates suggestions from Verified Contract.
 * Never creates links automatically.
 *
 * Resolution sources are deliberately limited to verified data. AI extraction
 * drafts are never used to create relationship suggestions.
 */
export class RelationshipDiscoveryService {
  /**
   * Generate (or refresh pending) suggestions for a contract from current verified domain.
   */
  async discover(params: {
    organizationId: string;
    contractId: number;
    userId?: number;
    force?: boolean;
  }) {
    const verified = await verifiedContractService.getCurrent({
      organizationId: params.organizationId,
      contractId: params.contractId,
    });

    if (!verified) {
      return { suggestions: [], message: "No verified contract domain object yet" };
    }

    // Source strings from verified parties + explicit verified release/work title.
    // Contract title is intentionally not treated as a release identifier because
    // the legal agreement title and the governed release title are different concepts.
    const sources: {
      text: string;
      preferredTypes: TargetEntityType[];
      relType: string;
    }[] = [];

    for (const party of verified.parties || []) {
      sources.push({
        text: party.name,
        preferredTypes: ["artist", "label", "publisher", "organization", "person"],
        relType: "represents",
      });
    }

    const releaseTitleField = await prisma.verifiedField.findFirst({
      where: {
        extractionId: verified.extractionId,
        organizationId: params.organizationId,
        fieldKey: "release_title",
        decision: { in: ["accepted", "edited"] },
      },
      orderBy: { verifiedAt: "desc" },
      select: { verifiedValue: true },
    });

    if (releaseTitleField?.verifiedValue?.trim()) {
      sources.push({
        text: releaseTitleField.verifiedValue.trim(),
        preferredTypes: ["release", "work", "track"],
        relType: "applies_to",
      });
    }

    if (verified.territorySummary) {
      // Territory names are not entities usually — skip entity match.
    }

    const created: any[] = [];
    const seen = new Set<string>();

    for (const src of sources) {
      const matches = await matchingService.matchName({
        organizationId: params.organizationId,
        sourceText: src.text,
        entityTypes: src.preferredTypes,
        limit: 3,
      });

      for (const m of matches) {
        if (!src.preferredTypes.includes(m.entityType)) continue;
        if (m.confidence < 0.65) continue;

        const key = `${m.entityType}:${m.entityId}:${src.relType}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const existingLink = await prisma.contractRelationship.findFirst({
          where: {
            contractId: params.contractId,
            targetEntityType: m.entityType,
            targetEntityId: m.entityId,
            relationshipType: src.relType,
            status: "active",
          },
        });
        if (existingLink) continue;

        const existingSug = await prisma.relationshipSuggestion.findFirst({
          where: {
            contractId: params.contractId,
            targetEntityType: m.entityType,
            targetEntityId: m.entityId,
            relationshipType: src.relType,
            status: "pending",
          },
        });
        if (existingSug && !params.force) {
          created.push(existingSug);
          continue;
        }

        const suggestion = await prisma.relationshipSuggestion.create({
          data: {
            organizationId: params.organizationId,
            contractId: params.contractId,
            verifiedContractId: verified.id,
            relationshipType: src.relType,
            targetEntityType: m.entityType,
            targetEntityId: m.entityId,
            targetEntityName: m.entityName,
            sourceText: src.text,
            confidence: m.confidence,
            matchStrategy: m.strategy,
            reason: m.reason,
            status: "pending",
          },
        });

        await publishRelationshipEvent({
          organizationId: params.organizationId,
          contractId: params.contractId,
          eventType: RELATIONSHIP_EVENTS.Suggested,
          payload: {
            suggestionId: suggestion.id,
            targetEntityType: m.entityType,
            targetEntityId: m.entityId,
            confidence: m.confidence,
            matchStrategy: m.strategy,
          },
          userId: params.userId,
        });

        await recordRelationshipHistory({
          organizationId: params.organizationId,
          contractId: params.contractId,
          action: "suggested",
          actorUserId: params.userId,
          suggestionId: suggestion.id,
          payload: {
            targetEntityType: m.entityType,
            targetEntityId: m.entityId,
            confidence: m.confidence,
          },
        });

        created.push(suggestion);
      }
    }

    return {
      suggestions: created.map((s) => this.toSuggestionDto(s)),
      verifiedContractId: verified.id,
      sourceCount: sources.length,
    };
  }

  async listSuggestions(params: {
    organizationId: string;
    contractId: number;
    status?: string;
  }) {
    const rows = await prisma.relationshipSuggestion.findMany({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        ...(params.status ? { status: params.status } : {}),
      },
      orderBy: [{ status: "asc" }, { confidence: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((s) => this.toSuggestionDto(s));
  }

  toSuggestionDto(s: any) {
    return {
      id: s.id,
      contractId: s.contractId,
      verifiedContractId: s.verifiedContractId,
      relationshipType: s.relationshipType,
      targetEntityType: s.targetEntityType,
      targetEntityId: s.targetEntityId,
      targetEntityName: s.targetEntityName,
      sourceText: s.sourceText,
      confidence: s.confidence,
      matchStrategy: s.matchStrategy,
      reason: s.reason,
      status: s.status,
      createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
      decidedAt: s.decidedAt?.toISOString?.() ?? s.decidedAt,
      decidedBy: s.decidedBy,
    };
  }
}

export const relationshipDiscoveryService = new RelationshipDiscoveryService();
