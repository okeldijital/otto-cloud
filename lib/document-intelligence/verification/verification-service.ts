import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import {
  DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD,
  EXTRACTION_STATUS,
  FIELD_VERIFICATION_STATE,
  REQUIRED_VERIFICATION_FIELDS,
  SESSION_STATUS,
} from "../constants";
import { IntelligenceError } from "../types/errors";
import { assertCanVerify } from "./permissions";
import { emitVerificationActivity, emitVerificationAudit } from "./events";
import { confidenceBand } from "./confidence-ui";

type FieldAction = "accept" | "reject" | "edit" | "reset";

/** Human Verification Service — trust boundary between AI drafts and verified data. */
export class VerificationService {
  async getVerification(params: {
    organizationId: string;
    documentId: string;
    extractionId: string;
    userId: number;
    ensureSession?: boolean;
  }) {
    const extraction = await prisma.documentExtraction.findFirst({
      where: {
        id: params.extractionId,
        organizationId: params.organizationId,
        documentId: params.documentId,
      },
      include: { fields: { orderBy: { sortOrder: "asc" } }, draft: true },
    });
    if (!extraction) throw new IntelligenceError("Extraction not found", 404, "EXTRACTION_NOT_FOUND");

    let session = await prisma.verificationSession.findFirst({
      where: { extractionId: extraction.id, organizationId: params.organizationId },
      orderBy: { version: "desc" },
      include: {
        verified: true,
        history: { orderBy: { createdAt: "desc" }, take: 50 },
        decisions: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!session && params.ensureSession !== false) {
      session = await this.createSession({
        organizationId: params.organizationId,
        extractionId: extraction.id,
        documentId: params.documentId,
        contractId: extraction.contractId,
        userId: params.userId,
      });
    }
    return this.toDto(extraction, session);
  }

  async createSession(params: { organizationId: string; extractionId: string; documentId: string; contractId?: number | null; userId: number }) {
    const last = await prisma.verificationSession.findFirst({ where: { extractionId: params.extractionId }, orderBy: { version: "desc" } });
    const session = await prisma.verificationSession.create({
      data: {
        organizationId: params.organizationId, extractionId: params.extractionId, documentId: params.documentId,
        contractId: params.contractId ?? null, version: (last?.version ?? 0) + 1,
        status: SESSION_STATUS.in_progress, startedAt: new Date(), startedBy: params.userId,
      },
      include: { verified: true, history: { orderBy: { createdAt: "desc" }, take: 50 }, decisions: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    await prisma.verificationDraft.updateMany({ where: { extractionId: params.extractionId }, data: { status: "in_progress", begunAt: new Date(), begunBy: params.userId } });
    await emitVerificationActivity({ action: "Verification Started", userId: params.userId, contractId: params.contractId, entityName: params.documentId });
    return session;
  }

  async updateField(params: { ctx: OrganizationContext; organizationId: string; documentId: string; extractionId: string; fieldKey: string; action: FieldAction; value?: string | null }) {
    assertCanVerify(params.ctx);
    const { extraction, session } = await this.requireOpenSession(params);
    const field = extraction.fields.find((f) => f.fieldKey === params.fieldKey);
    if (!field) throw new IntelligenceError("Field not found", 404, "FIELD_NOT_FOUND");
    if (session.status === SESSION_STATUS.completed) throw new IntelligenceError("Verification is complete; reopen to edit", 409, "SESSION_COMPLETED");

    const previousState = field.verificationState;
    const previousValue = field.value;
    let newState = previousState;
    let newValue = field.value;
    const sourceLoc = (field.sourceLocation as any) || {};
    if (sourceLoc.aiOriginalValue === undefined) {
      sourceLoc.aiOriginalValue = field.value;
      sourceLoc.aiConfidence = field.confidence;
    }
    switch (params.action) {
      case "accept": newState = FIELD_VERIFICATION_STATE.accepted; newValue = field.value; break;
      case "reject": newState = FIELD_VERIFICATION_STATE.rejected; break;
      case "edit":
        if (params.value === undefined) throw new IntelligenceError("Edit requires value", 400, "VALUE_REQUIRED");
        newState = FIELD_VERIFICATION_STATE.edited; newValue = params.value; break;
      case "reset":
        newState = FIELD_VERIFICATION_STATE.draft;
        newValue = sourceLoc.aiOriginalValue !== undefined ? sourceLoc.aiOriginalValue : field.value;
        break;
      default: throw new IntelligenceError("Invalid action", 400, "INVALID_ACTION");
    }
    const updated = await prisma.extractionField.update({ where: { id: field.id }, data: { verificationState: newState, value: newValue, sourceLocation: sourceLoc } });
    await prisma.verificationHistory.create({ data: { sessionId: session.id, organizationId: params.organizationId, extractionId: params.extractionId, fieldKey: params.fieldKey, action: `field.${params.action}`, previousValue, newValue, previousState, newState, actorUserId: params.ctx.userId } });
    await emitVerificationAudit({
      action: params.action === "accept" ? "field.accepted" : params.action === "edit" ? "field.edited" : params.action === "reject" ? "field.rejected" : "field.reset",
      organizationId: params.organizationId, userId: params.ctx.userId, documentId: params.documentId, contractId: extraction.contractId,
      extractionId: params.extractionId, sessionId: session.id, fieldKey: params.fieldKey, changes: { previousState, newState, previousValue, newValue },
    });
    await emitVerificationActivity({ action: "Verification Updated", userId: params.ctx.userId, contractId: extraction.contractId });
    if (session.status === SESSION_STATUS.pending || session.status === SESSION_STATUS.reopened) {
      await prisma.verificationSession.update({ where: { id: session.id }, data: { status: SESSION_STATUS.in_progress, startedAt: session.startedAt ?? new Date(), startedBy: session.startedBy ?? params.ctx.userId } });
    }
    return updated;
  }

  async bulkUpdate(params: { ctx: OrganizationContext; organizationId: string; documentId: string; extractionId: string; action: "accept_above_threshold" | "reject_all"; confidenceThreshold?: number }) {
    assertCanVerify(params.ctx);
    const { extraction, session } = await this.requireOpenSession(params);
    if (session.status === SESSION_STATUS.completed) throw new IntelligenceError("Verification is complete; reopen to edit", 409, "SESSION_COMPLETED");
    const threshold = params.confidenceThreshold ?? DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD;
    let count = 0;
    for (const field of extraction.fields) {
      if (params.action === "accept_above_threshold" && field.confidence >= threshold && field.verificationState === FIELD_VERIFICATION_STATE.draft) {
        if (field.value == null || String(field.value).trim() === "") continue;
        await this.updateField({ ctx: params.ctx, organizationId: params.organizationId, documentId: params.documentId, extractionId: params.extractionId, fieldKey: field.fieldKey, action: "accept" }); count++;
      } else if (params.action === "reject_all" && field.verificationState !== FIELD_VERIFICATION_STATE.rejected && field.value != null && String(field.value).trim() !== "") {
        await this.updateField({ ctx: params.ctx, organizationId: params.organizationId, documentId: params.documentId, extractionId: params.extractionId, fieldKey: field.fieldKey, action: "reject" }); count++;
      }
    }
    await emitVerificationAudit({ action: "verification.bulk", organizationId: params.organizationId, userId: params.ctx.userId, documentId: params.documentId, contractId: extraction.contractId, extractionId: params.extractionId, sessionId: session.id, changes: { bulkAction: params.action, count, threshold } });
    return { updated: count };
  }

  async complete(params: { ctx: OrganizationContext; organizationId: string; documentId: string; extractionId: string; notes?: string }) {
    assertCanVerify(params.ctx);
    const { extraction, session } = await this.requireOpenSession(params);
    if (session.status === SESSION_STATUS.completed) throw new IntelligenceError("Already completed", 409, "ALREADY_COMPLETED");
    const fields = await prisma.extractionField.findMany({ where: { extractionId: params.extractionId }, orderBy: { sortOrder: "asc" } });
    const incompleteRequired = REQUIRED_VERIFICATION_FIELDS.filter((key) => {
      const f = fields.find((x) => x.fieldKey === key);
      return !f || f.value == null || String(f.value).trim() === "" || f.verificationState === FIELD_VERIFICATION_STATE.draft;
    });
    if (incompleteRequired.length > 0) throw new IntelligenceError(`Required fields still in draft or missing: ${incompleteRequired.join(", ")}`, 400, "REQUIRED_FIELDS_PENDING", incompleteRequired);
    const stillDraft = fields.filter((f) => f.verificationState === FIELD_VERIFICATION_STATE.draft && f.value != null && String(f.value).trim() !== "");
    if (stillDraft.length > 0) throw new IntelligenceError(`Extracted fields still require review (${stillDraft.length})`, 400, "DRAFT_FIELDS_REMAIN", stillDraft.map((f) => f.fieldKey));

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.verifiedField.deleteMany({ where: { sessionId: session.id } });
      for (const field of fields) {
        const hasValue = field.value != null && String(field.value).trim() !== "";
        if (!hasValue) continue;
        if (field.verificationState === FIELD_VERIFICATION_STATE.rejected) {
          await tx.verifiedField.create({ data: {
            sessionId: session.id, organizationId: params.organizationId, extractionId: params.extractionId, documentId: params.documentId,
            fieldKey: field.fieldKey, fieldLabel: field.fieldLabel, verifiedValue: null, decision: "rejected",
            aiValue: (field.sourceLocation as any)?.aiOriginalValue ?? field.value, aiConfidence: field.confidence,
            sourceFieldId: field.id, verifiedBy: params.ctx.userId, verifiedAt: now,
          } });
        } else {
          await tx.verifiedField.create({ data: {
            sessionId: session.id, organizationId: params.organizationId, extractionId: params.extractionId, documentId: params.documentId,
            fieldKey: field.fieldKey, fieldLabel: field.fieldLabel, verifiedValue: field.value,
            decision: field.verificationState === FIELD_VERIFICATION_STATE.edited ? "edited" : "accepted",
            aiValue: (field.sourceLocation as any)?.aiOriginalValue ?? field.value, aiConfidence: field.confidence,
            sourceFieldId: field.id, verifiedBy: params.ctx.userId, verifiedAt: now,
          } });
          await tx.extractionField.update({ where: { id: field.id }, data: { verificationState: FIELD_VERIFICATION_STATE.verified } });
        }
      }
      await tx.verificationSession.update({ where: { id: session.id }, data: { status: SESSION_STATUS.completed, completedAt: now, completedBy: params.ctx.userId, notes: params.notes ?? null } });
      await tx.verificationDecision.create({ data: { sessionId: session.id, organizationId: params.organizationId, extractionId: params.extractionId, decision: "completed", actorUserId: params.ctx.userId, notes: params.notes ?? null, snapshot: { fields: fields.map((f) => ({ key: f.fieldKey, state: f.verificationState, value: f.value, confidence: f.confidence })) } } });
      await tx.verificationHistory.create({ data: { sessionId: session.id, organizationId: params.organizationId, extractionId: params.extractionId, action: "session.completed", actorUserId: params.ctx.userId, newState: SESSION_STATUS.completed } });
      await tx.documentExtraction.update({ where: { id: params.extractionId }, data: { status: "verified" } });
      await tx.verificationDraft.updateMany({ where: { extractionId: params.extractionId }, data: { status: "completed" } });
    });
    await emitVerificationAudit({ action: "verification.completed", organizationId: params.organizationId, userId: params.ctx.userId, documentId: params.documentId, contractId: extraction.contractId, extractionId: params.extractionId, sessionId: session.id });
    await emitVerificationActivity({ action: "Verification Completed", userId: params.ctx.userId, contractId: extraction.contractId });
    let promotion: { verifiedContractId?: string; version?: number; eventType?: string | null } | null = null;
    if (extraction.contractId != null) {
      try {
        const { promoteVerifiedContract } = await import("@/lib/verified-contract/promotion");
        const result = await promoteVerifiedContract({ organizationId: params.organizationId, contractId: extraction.contractId, documentId: params.documentId, extractionId: params.extractionId, verificationSessionId: session.id, reviewerUserId: params.ctx.userId, documentType: extraction.documentType });
        promotion = { verifiedContractId: result.verifiedContract.id, version: result.verifiedContract.version, eventType: result.eventType };
      } catch (err) {
        const { logger } = await import("@/lib/logger");
        logger.error("verification.complete", "Verified contract promotion failed", { sessionId: session.id, error: err instanceof Error ? err.message : String(err) });
      }
    }
    const verification = await this.getVerification({ organizationId: params.organizationId, documentId: params.documentId, extractionId: params.extractionId, userId: params.ctx.userId, ensureSession: false });
    return { ...verification, promotion };
  }

  async reopen(params: { ctx: OrganizationContext; organizationId: string; documentId: string; extractionId: string; notes?: string }) {
    assertCanVerify(params.ctx);
    const extraction = await prisma.documentExtraction.findFirst({ where: { id: params.extractionId, organizationId: params.organizationId, documentId: params.documentId } });
    if (!extraction) throw new IntelligenceError("Extraction not found", 404, "EXTRACTION_NOT_FOUND");
    const last = await prisma.verificationSession.findFirst({ where: { extractionId: params.extractionId, organizationId: params.organizationId }, orderBy: { version: "desc" } });
    if (!last || last.status !== SESSION_STATUS.completed) throw new IntelligenceError("Only completed verifications can be reopened", 400, "NOT_COMPLETED");
    const session = await prisma.verificationSession.create({ data: { organizationId: params.organizationId, extractionId: params.extractionId, documentId: params.documentId, contractId: extraction.contractId, version: last.version + 1, status: SESSION_STATUS.reopened, startedAt: new Date(), startedBy: params.ctx.userId, reopenedAt: new Date(), reopenedBy: params.ctx.userId, notes: params.notes ?? null } });
    const fields = await prisma.extractionField.findMany({ where: { extractionId: params.extractionId } });
    for (const field of fields) {
      const sourceLoc = (field.sourceLocation as any) || {};
      const aiVal = sourceLoc.aiOriginalValue !== undefined ? sourceLoc.aiOriginalValue : field.value;
      await prisma.extractionField.update({ where: { id: field.id }, data: { verificationState: FIELD_VERIFICATION_STATE.draft, value: aiVal } });
    }
    await prisma.verificationDecision.create({ data: { sessionId: session.id, organizationId: params.organizationId, extractionId: params.extractionId, decision: "reopened", actorUserId: params.ctx.userId, notes: params.notes ?? null } });
    await prisma.verificationHistory.create({ data: { sessionId: session.id, organizationId: params.organizationId, extractionId: params.extractionId, action: "session.reopened", actorUserId: params.ctx.userId, newState: SESSION_STATUS.reopened } });
    await prisma.documentExtraction.update({ where: { id: params.extractionId }, data: { status: EXTRACTION_STATUS.awaiting_verification } });
    await prisma.verificationDraft.updateMany({ where: { extractionId: params.extractionId }, data: { status: "in_progress", begunAt: new Date(), begunBy: params.ctx.userId } });
    await emitVerificationAudit({ action: "verification.reopened", organizationId: params.organizationId, userId: params.ctx.userId, documentId: params.documentId, contractId: extraction.contractId, extractionId: params.extractionId, sessionId: session.id, changes: { previousSessionId: last.id, newVersion: session.version } });
    await emitVerificationActivity({ action: "Verification Started", userId: params.ctx.userId, contractId: extraction.contractId });
    return this.getVerification({ organizationId: params.organizationId, documentId: params.documentId, extractionId: params.extractionId, userId: params.ctx.userId });
  }

  private async requireOpenSession(params: { organizationId: string; documentId: string; extractionId: string; ctx?: OrganizationContext }) {
    const extraction = await prisma.documentExtraction.findFirst({ where: { id: params.extractionId, organizationId: params.organizationId, documentId: params.documentId }, include: { fields: { orderBy: { sortOrder: "asc" } } } });
    if (!extraction) throw new IntelligenceError("Extraction not found", 404, "EXTRACTION_NOT_FOUND");
    let session = await prisma.verificationSession.findFirst({ where: { extractionId: params.extractionId, organizationId: params.organizationId }, orderBy: { version: "desc" } });
    if (!session) {
      if (!params.ctx) throw new IntelligenceError("No verification session", 404, "SESSION_NOT_FOUND");
      session = await this.createSession({ organizationId: params.organizationId, extractionId: params.extractionId, documentId: params.documentId, contractId: extraction.contractId, userId: params.ctx.userId });
    }
    return { extraction, session };
  }

  private toDto(extraction: any, session: any) {
    const fields = (extraction.fields || []).map((f: any) => {
      const aiOriginal = (f.sourceLocation as any)?.aiOriginalValue !== undefined ? (f.sourceLocation as any).aiOriginalValue : f.value;
      const hasExtractedValue = aiOriginal != null && String(aiOriginal).trim() !== "";
      const band = confidenceBand(f.confidence ?? 0);
      return {
        id: f.id, fieldKey: f.fieldKey, fieldLabel: f.fieldLabel, extractedValue: hasExtractedValue ? aiOriginal : null,
        workingValue: f.value, confidence: f.confidence, confidenceBand: band, verificationState: f.verificationState,
        sourceLocation: f.sourceLocation, sortOrder: f.sortOrder,
        isRequired: (REQUIRED_VERIFICATION_FIELDS as readonly string[]).includes(f.fieldKey),
        isExtracted: hasExtractedValue, isNotFound: !hasExtractedValue,
        differsFromAi: String(aiOriginal ?? "") !== String(f.value ?? "") || f.verificationState === FIELD_VERIFICATION_STATE.edited,
      };
    });
    const extractedFields = fields.filter((f: any) => f.isExtracted);
    const notFoundFields = fields.filter((f: any) => f.isNotFound);
    const reviewed = extractedFields.filter((f: any) => f.verificationState !== FIELD_VERIFICATION_STATE.draft).length;
    const accepted = fields.filter((f: any) => ["accepted", "edited", "verified"].includes(f.verificationState) && f.isExtracted).length;
    const rejected = fields.filter((f: any) => f.verificationState === FIELD_VERIFICATION_STATE.rejected && f.isExtracted).length;
    const draft = extractedFields.filter((f: any) => f.verificationState === FIELD_VERIFICATION_STATE.draft).length;
    const requiredPending = REQUIRED_VERIFICATION_FIELDS.filter((key) => {
      const f = fields.find((x: any) => x.fieldKey === key);
      return !f || !f.isExtracted || f.verificationState === FIELD_VERIFICATION_STATE.draft;
    });
    return {
      extractionId: extraction.id, documentId: extraction.documentId, contractId: extraction.contractId,
      extractionVersion: extraction.version, extractionStatus: extraction.status, documentType: extraction.documentType,
      overallConfidence: extraction.overallConfidence, humanVerificationRequired: true,
      isDocumentVerified: session?.status === SESSION_STATUS.completed,
      session: session ? { id: session.id, version: session.version, status: session.status, startedAt: session.startedAt?.toISOString?.() ?? null, completedAt: session.completedAt?.toISOString?.() ?? null, completedBy: session.completedBy } : null,
      progress: {
        total: fields.length, extracted: extractedFields.length, notFound: notFoundFields.length, reviewed, accepted, rejected, draft,
        pendingReview: draft, percent: extractedFields.length ? Math.round((reviewed / extractedFields.length) * 100) : 100,
        requiredPending, canComplete: draft === 0 && requiredPending.length === 0 && session?.status !== SESSION_STATUS.completed,
      },
      fields,
      verifiedFields: (session?.verified || []).map((v: any) => ({ fieldKey: v.fieldKey, fieldLabel: v.fieldLabel, verifiedValue: v.verifiedValue, decision: v.decision, aiValue: v.aiValue, aiConfidence: v.aiConfidence, verifiedAt: v.verifiedAt?.toISOString?.() ?? v.verifiedAt, verifiedBy: v.verifiedBy })),
      history: (session?.history || []).map((h: any) => ({ id: h.id, action: h.action, fieldKey: h.fieldKey, previousValue: h.previousValue, newValue: h.newValue, previousState: h.previousState, newState: h.newState, actorUserId: h.actorUserId, createdAt: h.createdAt?.toISOString?.() ?? h.createdAt })),
      decisions: (session?.decisions || []).map((d: any) => ({ id: d.id, decision: d.decision, actorUserId: d.actorUserId, notes: d.notes, createdAt: d.createdAt?.toISOString?.() ?? d.createdAt })),
    };
  }
}

export const verificationService = new VerificationService();
