/**
 * RightsPromotionService — builds candidates from Verified Contract only.
 * Never reads AI extraction or draft data.
 */

import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import { verifiedContractService } from "@/lib/verified-contract";
import {
  RIGHT_CATEGORIES,
  RIGHT_CATEGORY_LABELS,
  RIGHT_EVENTS,
} from "./constants";
import { assertCanManageRights } from "./permissions";
import { publishRightEvent } from "./events";

function inferCategory(text: string): string {
  const t = text.toLowerCase();
  if (/sync|synchron/.test(t)) return "synchronization";
  if (/mechanical/.test(t)) return "mechanical";
  if (/performance|perform/.test(t)) return "performance";
  if (/stream/.test(t)) return "streaming";
  if (/broadcast/.test(t)) return "broadcast";
  if (/publish/.test(t)) return "publishing";
  if (/administ/.test(t)) return "administration";
  if (/distrib|digital/.test(t)) return "digital_distribution";
  if (/master|recording/.test(t)) return "master_recording";
  if (/compos|work/.test(t)) return "composition";
  if (/neighbor|related/.test(t)) return "neighboring";
  if (/licen/.test(t)) return "licensing";
  if (/territor/.test(t)) return "territory";
  return "custom";
}

export class RightsPromotionService {
  /**
   * Promote verified contract → rights candidates (pending review).
   * No automatic registry publication.
   */
  async promoteFromVerifiedContract(params: {
    ctx: OrganizationContext;
    organizationId: string;
    contractId: number;
  }) {
    assertCanManageRights(params.ctx);

    const verified = await verifiedContractService.getCurrent({
      organizationId: params.organizationId,
      contractId: params.contractId,
    });
    if (!verified) {
      throw new IntelligenceError(
        "No current verified contract found",
        404,
        "VERIFIED_CONTRACT_REQUIRED"
      );
    }

    const run = await prisma.rightPromotionRun.create({
      data: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        verifiedContractId: verified.id,
        verifiedVersion: verified.version,
        verificationSessionId: verified.verificationSessionId,
        documentId: verified.documentId,
        status: "running",
        createdBy: params.ctx.userId,
      },
    });

    try {
      const candidates: Array<{
        category: string;
        title: string;
        description?: string;
        exclusive?: boolean;
        clauseReference?: string;
        confidence?: number;
        proposedPayload: Record<string, unknown>;
      }> = [];

      // From normalized verified rights rows
      for (const r of verified.rights || []) {
        const desc = r.description || "Right";
        candidates.push({
          category: inferCategory(desc),
          title: desc.slice(0, 255),
          description: desc,
          confidence: 0.85,
          clauseReference: undefined,
          proposedPayload: {
            source: "verified_right",
            verifiedRightId: r.id,
            parties: verified.parties,
            territories: verified.territories,
            rightsSummary: verified.rightsSummary,
            effectiveDateText: verified.effectiveDateText,
            expirationDateText: verified.expirationDateText,
          },
        });
      }

      // From rights summary text if no structured rights
      if (candidates.length === 0 && verified.rightsSummary) {
        candidates.push({
          category: inferCategory(verified.rightsSummary),
          title: `${verified.title || "Contract"} — Rights`,
          description: verified.rightsSummary,
          confidence: 0.6,
          proposedPayload: {
            source: "rights_summary",
            parties: verified.parties,
            territories: verified.territories,
            effectiveDateText: verified.effectiveDateText,
            expirationDateText: verified.expirationDateText,
          },
        });
      }

      // Always create at least one candidate shell for review when verified exists
      if (candidates.length === 0) {
        candidates.push({
          category: "custom",
          title: `${verified.title || `Contract #${params.contractId}`} — Rights package`,
          description:
            "Candidate shell created from verified contract (no structured rights extracted).",
          confidence: 0.4,
          proposedPayload: {
            source: "verified_contract_shell",
            parties: verified.parties,
            territories: verified.territories,
            termSummary: verified.termSummary,
            rightsSummary: verified.rightsSummary,
            effectiveDateText: verified.effectiveDateText,
            expirationDateText: verified.expirationDateText,
          },
        });
      }

      const created = [];
      for (const c of candidates) {
        const row = await prisma.rightCandidate.create({
          data: {
            organizationId: params.organizationId,
            promotionRunId: run.id,
            contractId: params.contractId,
            verifiedContractId: verified.id,
            verifiedVersion: verified.version,
            verificationSessionId: verified.verificationSessionId,
            documentId: verified.documentId,
            category: c.category,
            title: c.title,
            description: c.description || null,
            clauseReference: c.clauseReference || null,
            exclusive: !!c.exclusive,
            confidence: c.confidence ?? null,
            proposedPayload: c.proposedPayload as object,
            status: "pending",
          },
        });
        created.push(row);

        await publishRightEvent({
          organizationId: params.organizationId,
          eventType: RIGHT_EVENTS.CandidateCreated,
          payload: {
            candidateId: row.id,
            contractId: params.contractId,
            category: row.category,
            promotionRunId: run.id,
          },
          userId: params.ctx.userId,
        });
      }

      await prisma.rightPromotionRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          candidateCount: created.length,
          completedAt: new Date(),
        },
      });

      return {
        promotionRunId: run.id,
        candidateCount: created.length,
        candidates: created.map((c) => ({
          id: c.id,
          category: c.category,
          categoryLabel: RIGHT_CATEGORY_LABELS[c.category] || c.category,
          title: c.title,
          status: c.status,
          confidence: c.confidence,
        })),
        categories: RIGHT_CATEGORIES,
      };
    } catch (error) {
      await prisma.rightPromotionRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async listPendingCandidates(params: {
    organizationId: string;
    contractId?: number;
    limit?: number;
  }) {
    const rows = await prisma.rightCandidate.findMany({
      where: {
        organizationId: params.organizationId,
        status: "pending",
        ...(params.contractId ? { contractId: params.contractId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50,
    });
    return rows;
  }
}

export const rightsPromotionService = new RightsPromotionService();
