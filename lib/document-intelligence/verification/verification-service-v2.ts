import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import {
  FIELD_VERIFICATION_STATE,
  REQUIRED_VERIFICATION_FIELDS,
  SESSION_STATUS,
} from "../constants";
import { IntelligenceError } from "../types/errors";
import { assertCanVerify } from "./permissions";
import { emitVerificationActivity, emitVerificationAudit } from "./events";
import { VerificationService as BaseVerificationService } from "./verification-service";

/**
 * Verification behavior fixes layered over the stable verification service.
 * Keeps the original service as the trust-boundary implementation while fixing
 * bulk re-acceptance and explicit "not found" resolution for required fields.
 */
export class VerificationServiceV2 extends BaseVerificationService {
  override async getVerification(params: Parameters<BaseVerificationService["getVerification"]>[0]) {
    const verification = await super.getVerification(params);
    const explicitNotFound = new Set(
      (verification.fields || [])
        .filter((field: any) => field.sourceLocation?.humanNotFound === true)
        .map((field: any) => field.fieldKey)
    );
    const fields = (verification.fields || []).map((field: any) => ({
      ...field,
      isExplicitlyNotFound: explicitNotFound.has(field.fieldKey),
    }));
    const requiredPending = (verification.progress?.requiredPending || []).filter(
      (key: string) => !explicitNotFound.has(key)
    );

    return {
      ...verification,
      fields,
      progress: {
        ...verification.progress,
        requiredPending,
        canComplete:
          verification.progress?.draft === 0 &&
          requiredPending.length === 0 &&
          verification.session?.status !== SESSION_STATUS.completed,
      },
    };
  }

  override async bulkUpdate(params: Parameters<BaseVerificationService["bulkUpdate"]>[0]) {
    if (params.action !== "accept_above_threshold") {
      return super.bulkUpdate(params);
    }

    const threshold = params.confidenceThreshold ?? 0.8;
    const verification = await super.getVerification({
      organizationId: params.organizationId,
      documentId: params.documentId,
      extractionId: params.extractionId,
      userId: params.ctx.userId,
      ensureSession: false,
    });

    // An explicit bulk accept is allowed to reverse a previous human rejection.
    // This is intentional: the current human action is the new decision.
    for (const field of verification.fields || []) {
      if (
        field.isExtracted &&
        field.confidence >= threshold &&
        field.verificationState === FIELD_VERIFICATION_STATE.rejected
      ) {
        await super.updateField({
          ctx: params.ctx,
          organizationId: params.organizationId,
          documentId: params.documentId,
          extractionId: params.extractionId,
          fieldKey: field.fieldKey,
          action: "reset",
        });
        await super.updateField({
          ctx: params.ctx,
          organizationId: params.organizationId,
          documentId: params.documentId,
          extractionId: params.extractionId,
          fieldKey: field.fieldKey,
          action: "accept",
        });
      }
    }

    return super.bulkUpdate(params);
  }

  async markNotFound(params: {
    ctx: OrganizationContext;
    organizationId: string;
    documentId: string;
    extractionId: string;
    fieldKey: string;
  }) {
    assertCanVerify(params.ctx);
    await super.updateField({
      ctx: params.ctx,
      organizationId: params.organizationId,
      documentId: params.documentId,
      extractionId: params.extractionId,
      fieldKey: params.fieldKey,
      action: "reject",
    });

    const extraction = await prisma.documentExtraction.findFirst({
      where: {
        id: params.extractionId,
        organizationId: params.organizationId,
        documentId: params.documentId,
      },
      include: { fields: true },
    });
    const field = extraction?.fields.find((item) => item.fieldKey === params.fieldKey);
    if (!field) throw new IntelligenceError("Field not found", 404, "FIELD_NOT_FOUND");

    const sourceLocation = {
      ...((field.sourceLocation as Record<string, unknown> | null) || {}),
      humanNotFound: true,
    };
    await prisma.extractionField.update({
      where: { id: field.id },
      data: { sourceLocation, value: null, verificationState: FIELD_VERIFICATION_STATE.rejected },
    });

    const session = await prisma.verificationSession.findFirst({
      where: { extractionId: params.extractionId, organizationId: params.organizationId },
      orderBy: { version: "desc" },
    });
    if (session) {
      await prisma.verificationHistory.create({
        data: {
          sessionId: session.id,
          organizationId: params.organizationId,
          extractionId: params.extractionId,
          fieldKey: params.fieldKey,
          action: "field.not_found",
          previousValue: null,
          newValue: null,
          previousState: FIELD_VERIFICATION_STATE.rejected,
          newState: FIELD_VERIFICATION_STATE.rejected,
          actorUserId: params.ctx.userId,
        },
      });
      await emitVerificationAudit({
        action: "field.not_found",
        organizationId: params.organizationId,
        userId: params.ctx.userId,
        documentId: params.documentId,
        contractId: extraction.contractId,
        extractionId: params.extractionId,
        sessionId: session.id,
        fieldKey: params.fieldKey,
        changes: { humanNotFound: true },
      });
    }

    return this.getVerification({
      organizationId: params.organizationId,
      documentId: params.documentId,
      extractionId: params.extractionId,
      userId: params.ctx.userId,
      ensureSession: false,
    });
  }

  override async complete(params: Parameters<BaseVerificationService["complete"]>[0]) {
    assertCanVerify(params.ctx);
    const extraction = await prisma.documentExtraction.findFirst({
      where: {
        id: params.extractionId,
        organizationId: params.organizationId,
        // documentId is part of the trust boundary; keep it explicit.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        documentId: params.documentId as any,
      },
    });
    if (!extraction) throw new IntelligenceError("Extraction not found", 404, "EXTRACTION_NOT_FOUND");

    const session = await prisma.verificationSession.findFirst({
      where: { extractionId: params.extractionId, organizationId: params.organizationId },
      orderBy: { version: "desc" },
    });
    if (!session) throw new IntelligenceError("No verification session", 404, "SESSION_NOT_FOUND");
    if (session.status === SESSION_STATUS.completed) throw new IntelligenceError("Already completed", 409, "ALREADY_COMPLETED");

    const fields = await prisma.extractionField.findMany({
      where: { extractionId: params.extractionId },
      orderBy: { sortOrder: "asc" },
    });

    const incompleteRequired = REQUIRED_VERIFICATION_FIELDS.filter((key) => {
      const field = fields.find((item) => item.fieldKey === key);
      const humanNotFound = (field?.sourceLocation as any)?.humanNotFound === true;
      return !field || (!humanNotFound && (field.value == null || String(field.value).trim() === "")) || field.verificationState === FIELD_VERIFICATION_STATE.draft;
    });
    if (incompleteRequired.length > 0) {
      throw new IntelligenceError(
        `Required fields still in draft or unresolved: ${incompleteRequired.join(", ")}`,
        400,
        "REQUIRED_FIELDS_PENDING",
        incompleteRequired
      );
    }

    const stillDraft = fields.filter(
      (field) =>
        field.verificationState === FIELD_VERIFICATION_STATE.draft &&
        field.value != null &&
        String(field.value).trim() !== ""
    );
    if (stillDraft.length > 0) {
      throw new IntelligenceError(
        `Extracted fields still require review (${stillDraft.length})`,
        400,
        "DRAFT_FIELDS_REMAIN",
        stillDraft.map((field) => field.fieldKey)
      );
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.verifiedField.deleteMany({ where: { sessionId: session.id } });

      for (const field of fields) {
        const sourceLocation = (field.sourceLocation as any) || {};
        const humanNotFound = sourceLocation.humanNotFound === true;
        const hasValue = field.value != null && String(field.value).trim() !== "";

        if (!hasValue && !humanNotFound) continue;

        if (humanNotFound) {
          await tx.verifiedField.create({
            data: {
              sessionId: session.id,
              organizationId: params.organizationId,
              extractionId: params.extractionId,
              documentId: params.documentId,
              fieldKey: field.fieldKey,
              fieldLabel: field.fieldLabel,
              verifiedValue: null,
              decision: "not_found",
              aiValue: (sourceLocation as any)?.aiOriginalValue ?? field.value,
              aiConfidence: field.confidence,
              sourceFieldId: field.id,
              verifiedBy: params.ctx.userId,
              verifiedAt: now,
            },
          });
          continue;
        }

        if (field.verificationState === FIELD_VERIFICATION_STATE.rejected) {
          await tx.verifiedField.create({
            data: {
              sessionId: session.id,
              organizationId: params.organizationId,
              extractionId: params.extractionId,
              documentId: params.documentId,
              fieldKey: field.fieldKey,
              fieldLabel: field.fieldLabel,
              verifiedValue: null,
              decision: "rejected",
              aiValue: (sourceLocation as any)?.aiOriginalValue ?? field.value,
              aiConfidence: field.confidence,
              sourceFieldId: field.id,
              verifiedBy: params.ctx.userId,
              verifiedAt: now,
            },
          });
        } else {
          await tx.verifiedField.create({
            data: {
              sessionId: session.id,
              organizationId: params.organizationId,
              extractionId: params.extractionId,
              documentId: params.documentId,
              fieldKey: field.fieldKey,
              fieldLabel: field.fieldLabel,
              verifiedValue: field.value,
              decision: field.verificationState === FIELD_VERIFICATION_STATE.edited ? "edited" : "accepted",
              aiValue: (sourceLocation as any)?.aiOriginalValue ?? field.value,
              aiConfidence: field.confidence,
              sourceFieldId: field.id,
              verifiedBy: params.ctx.userId,
              verifiedAt: now,
            },
          });
          await tx.extractionField.update({
            where: { id: field.id },
            data: { verificationState: FIELD_VERIFICATION_STATE.verified },
          });
        }
      }

      await tx.verificationSession.update({
        where: { id: session.id },
        data: {
          status: SESSION_STATUS.completed,
          completedAt: now,
          completedBy: params.ctx.userId,
          notes: params.notes ?? null,
        },
      });
      await tx.verificationDecision.create({
        data: {
          sessionId: session.id,
          organizationId: params.organizationId,
          extractionId: params.extractionId,
          decision: "completed",
          actorUserId: params.ctx.userId,
          notes: params.notes ?? null,
          snapshot: {
            fields: fields.map((field) => ({
              key: field.fieldKey,
              state: field.verificationState,
              value: field.value,
              confidence: field.confidence,
              humanNotFound: (field.sourceLocation as any)?.humanNotFound === true,
            })),
          },
        },
      });
      await tx.verificationHistory.create({
        data: {
          sessionId: session.id,
          organizationId: params.organizationId,
          extractionId: params.extractionId,
          action: "session.completed",
          actorUserId: params.ctx.userId,
          newState: SESSION_STATUS.completed,
        },
      });
      await tx.documentExtraction.update({
        where: { id: params.extractionId },
        data: { status: "verified" },
      });
      await tx.verificationDraft.updateMany({
        where: { extractionId: params.extractionId },
        data: { status: "completed" },
      });
    });

    await emitVerificationAudit({
      action: "verification.completed",
      organizationId: params.organizationId,
      userId: params.ctx.userId,
      documentId: params.documentId,
      contractId: extraction.contractId,
      extractionId: params.extractionId,
      sessionId: session.id,
    });
    await emitVerificationActivity({
      action: "Verification Completed",
      userId: params.ctx.userId,
      contractId: extraction.contractId,
    });

    let promotion: { verifiedContractId?: string; version?: number; eventType?: string | null } | null = null;
    if (extraction.contractId != null) {
      try {
        const { promoteVerifiedContract } = await import("@/lib/verified-contract/promotion");
        const result = await promoteVerifiedContract({
          organizationId: params.organizationId,
          contractId: extraction.contractId,
          documentId: params.documentId,
          extractionId: params.extractionId,
          verificationSessionId: session.id,
          reviewerUserId: params.ctx.userId,
          documentType: extraction.documentType,
        });
        promotion = {
          verifiedContractId: result.verifiedContract.id,
          version: result.verifiedContract.version,
          eventType: result.eventType,
        };
      } catch (err) {
        const { logger } = await import("@/lib/logger");
        logger.error("verification.complete", "Verified contract promotion failed", {
          sessionId: session.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const verification = await this.getVerification({
      organizationId: params.organizationId,
      documentId: params.documentId,
      extractionId: params.extractionId,
      userId: params.ctx.userId,
      ensureSession: false,
    });
    return { ...verification, promotion };
  }
}

export const verificationServiceV2 = new VerificationServiceV2();
