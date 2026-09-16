import { documentService } from "@/lib/documents";
import { logger } from "@/lib/logger";
import {
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_STATUS,
  FIELD_VERIFICATION_STATE,
  JOB_STATUS,
  MAX_EXTRACTION_ATTEMPTS,
} from "../constants";
import { documentTypeLabel } from "../classification";
import { adjustForOcr, clampConfidence } from "../confidence";
import {
  emitIntelligenceActivity,
  emitIntelligenceAudit,
} from "../events/intelligence-events";
import { defaultOcrProvider } from "../providers/pdf-text-ocr";
import { aiExtractionProvider } from "../providers/ai-extraction-adapter";
import type { OcrProvider } from "../providers/ocr-provider";
import type { ExtractionProvider } from "../providers/extraction-provider";
import { extractionRepository } from "../repositories/extraction-repository";
import { IntelligenceError } from "../types/errors";

export interface StartExtractionInput {
  organizationId: string;
  documentId: string;
  contractId?: number | null;
  userId: number;
  /** When true, re-queue even if a job is running (retry path). */
  force?: boolean;
}

/**
 * Document Intelligence Service — orchestrates OCR → extract → AI → persist.
 * Does not modify Document Platform storage; reads bytes via signed URL.
 */
export class DocumentIntelligenceService {
  constructor(
    private readonly ocr: OcrProvider = defaultOcrProvider,
    private readonly extraction: ExtractionProvider = aiExtractionProvider
  ) {}

  /**
   * Queue extraction job and schedule async processing.
   */
  async startExtraction(input: StartExtractionInput) {
    const doc = await documentService.getActiveDocument(
      input.documentId,
      input.organizationId
    );
    if (!doc) {
      throw new IntelligenceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    if (!input.force) {
      const latest = await extractionRepository.findLatestJobForDocument(
        input.documentId,
        input.organizationId
      );
      if (
        latest &&
        (latest.status === JOB_STATUS.queued ||
          latest.status === JOB_STATUS.running ||
          latest.status === JOB_STATUS.retrying)
      ) {
        return this.toJobDto(latest);
      }
    }

    const job = await extractionRepository.createJob({
      organizationId: input.organizationId,
      documentId: input.documentId,
      contractId: input.contractId ?? null,
      status: JOB_STATUS.queued,
      attempt: 1,
      maxAttempts: MAX_EXTRACTION_ATTEMPTS,
      createdBy: input.userId,
    });

    await emitIntelligenceAudit({
      action: "extraction.started",
      organizationId: input.organizationId,
      userId: input.userId,
      documentId: input.documentId,
      contractId: input.contractId,
      jobId: job.id,
      entityName: doc.originalFilename,
      changes: { status: job.status },
    });

    // Fire-and-forget async pipeline (in-process). Production may swap for a queue worker.
    setImmediate(() => {
      void this.runJob(job.id).catch((err) => {
        logger.error("document-intelligence", "Unhandled job failure", {
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    });

    return this.toJobDto(job);
  }

  async retryExtraction(params: {
    organizationId: string;
    documentId: string;
    jobId: string;
    userId: number;
    contractId?: number | null;
  }) {
    const job = await extractionRepository.findJob(params.jobId);
    if (
      !job ||
      job.organizationId !== params.organizationId ||
      job.documentId !== params.documentId
    ) {
      throw new IntelligenceError("Extraction job not found", 404, "JOB_NOT_FOUND");
    }
    if (job.status === JOB_STATUS.running || job.status === JOB_STATUS.queued) {
      throw new IntelligenceError(
        "Extraction already in progress",
        409,
        "JOB_IN_PROGRESS"
      );
    }

    const attempt = job.attempt + 1;
    if (attempt > job.maxAttempts) {
      throw new IntelligenceError(
        "Maximum extraction attempts exceeded",
        400,
        "MAX_ATTEMPTS"
      );
    }

    const updated = await extractionRepository.updateJob(job.id, {
      status: JOB_STATUS.retrying,
      attempt,
      errorMessage: null,
      errorCode: null,
      startedAt: null,
      completedAt: null,
    });

    await emitIntelligenceAudit({
      action: "extraction.started",
      organizationId: params.organizationId,
      userId: params.userId,
      documentId: params.documentId,
      contractId: params.contractId ?? job.contractId,
      jobId: job.id,
      changes: { retry: true, attempt },
    });

    setImmediate(() => {
      void this.runJob(job.id).catch(() => undefined);
    });

    return this.toJobDto(updated);
  }

  async getJobStatus(params: {
    organizationId: string;
    documentId: string;
    jobId?: string;
  }) {
    const job = params.jobId
      ? await extractionRepository.findJob(params.jobId)
      : await extractionRepository.findLatestJobForDocument(
          params.documentId,
          params.organizationId
        );

    if (!job || job.organizationId !== params.organizationId) {
      throw new IntelligenceError("Extraction job not found", 404, "JOB_NOT_FOUND");
    }
    if (job.documentId !== params.documentId) {
      throw new IntelligenceError("Extraction job not found", 404, "JOB_NOT_FOUND");
    }

    const extraction =
      job.status === JOB_STATUS.completed
        ? await extractionRepository.findLatestExtraction(
            params.documentId,
            params.organizationId
          )
        : null;

    return {
      job: this.toJobDto(job),
      extractionId: extraction?.id ?? null,
      extractionStatus: extraction?.status ?? null,
    };
  }

  async getExtractionResult(params: {
    organizationId: string;
    documentId: string;
    extractionId?: string;
  }) {
    const extraction = params.extractionId
      ? await extractionRepository.findExtraction(
          params.extractionId,
          params.organizationId
        )
      : await extractionRepository.findLatestExtraction(
          params.documentId,
          params.organizationId
        );

    if (!extraction || extraction.documentId !== params.documentId) {
      throw new IntelligenceError("Extraction not found", 404, "EXTRACTION_NOT_FOUND");
    }

    return this.toExtractionDto(extraction);
  }

  async listDocumentJobs(params: {
    organizationId: string;
    documentId: string;
  }) {
    const jobs = await extractionRepository.listJobsForDocument(
      params.documentId,
      params.organizationId
    );
    return jobs.map((j) => this.toJobDto(j));
  }

  /**
   * Begin verification workspace (foundation only — no field editing APIs yet).
   */
  async beginVerification(params: {
    organizationId: string;
    extractionId: string;
    userId: number;
  }) {
    const extraction = await extractionRepository.findExtraction(
      params.extractionId,
      params.organizationId
    );
    if (!extraction) {
      throw new IntelligenceError("Extraction not found", 404, "EXTRACTION_NOT_FOUND");
    }

    const draft = await extractionRepository.beginVerification(
      params.extractionId,
      params.userId
    );

    await emitIntelligenceAudit({
      action: "verification.begun",
      organizationId: params.organizationId,
      userId: params.userId,
      documentId: extraction.documentId,
      contractId: extraction.contractId,
      extractionId: extraction.id,
      changes: { draftId: draft.id },
    });

    await emitIntelligenceActivity({
      action: "Verification Pending",
      userId: params.userId,
      contractId: extraction.contractId,
      entityName: extraction.documentType || extraction.documentId,
    });

    return draft;
  }

  // ── Pipeline ────────────────────────────────────────────────────────────

  async runJob(jobId: string): Promise<void> {
    const job = await extractionRepository.findJob(jobId);
    if (!job) return;
    if (
      job.status !== JOB_STATUS.queued &&
      job.status !== JOB_STATUS.retrying
    ) {
      return;
    }

    const startedAt = new Date();
    await extractionRepository.updateJob(jobId, {
      status: JOB_STATUS.running,
      startedAt,
    });

    const t0 = Date.now();
    try {
      const buffer = await this.fetchDocumentBytes(
        job.documentId,
        job.organizationId
      );
      const docMeta = await documentService.getActiveDocument(
        job.documentId,
        job.organizationId
      );

      // OCR / text extraction
      const ocrResult = await this.ocr.extractText({
        buffer,
        mimeType: docMeta?.mimeType || "application/pdf",
        filename: docMeta?.originalFilename,
      });

      if (!ocrResult.fullText || ocrResult.fullText.replace(/\s+/g, "").length < 10) {
        // Treat as unsupported/corrupt for pipeline purposes
        throw new IntelligenceError(
          ocrResult.fullText
            ? "Insufficient text extracted"
            : "Corrupt or empty PDF text layer",
          422,
          ocrResult.fullText ? "UNSUPPORTED_DOCUMENT" : "CORRUPT_PDF"
        );
      }

      // Normalize text
      const normalizedText = normalizeText(ocrResult.fullText);
      const pageBoundaries = ocrResult.pages.map((p, idx) => ({
        page: p.pageNumber,
        charCount: p.text.length,
        index: idx,
      }));

      // AI extraction (+ classification inside provider)
      const extracted = await this.extraction.extract({
        text: normalizedText,
        filename: docMeta?.originalFilename,
        promptVersion: EXTRACTION_PROMPT_VERSION,
      });

      const overall = adjustForOcr(
        clampConfidence(extracted.overallConfidence),
        ocrResult.ocrApplied
      );

      const version = await extractionRepository.nextExtractionVersion(job.documentId);

      const extraction = await extractionRepository.createExtraction(
        {
          organizationId: job.organizationId,
          documentId: job.documentId,
          contractId: job.contractId,
          job: { connect: { id: jobId } },
          version,
          status: EXTRACTION_STATUS.awaiting_verification,
          documentType: extracted.documentType,
          documentTypeConfidence: extracted.documentTypeConfidence,
          ocrRequired: ocrResult.ocrApplied,
          ocrProvider: ocrResult.provider,
          textCharCount: normalizedText.length,
          pageCount: ocrResult.pages.length,
          rawText: normalizedText.slice(0, 500_000),
          pageBoundaries,
          promptVersion: EXTRACTION_PROMPT_VERSION,
          model: extracted.model ?? null,
          aiProvider: extracted.provider,
          rawResponse: extracted.rawResponse as object,
          normalizedResponse: JSON.parse(
            JSON.stringify({
              documentType: extracted.documentType,
              fields: extracted.fields,
              overallConfidence: overall,
            })
          ),
          overallConfidence: overall,
          durationMs: Date.now() - t0,
          createdBy: job.createdBy,
        },
        extracted.fields.map((f, i) => ({
          fieldKey: f.fieldKey,
          fieldLabel: f.fieldLabel,
          value: f.value,
          confidence: clampConfidence(f.confidence),
          verificationState: FIELD_VERIFICATION_STATE.draft,
          sortOrder: i,
        }))
      );

      await extractionRepository.updateJob(jobId, {
        status: JOB_STATUS.completed,
        completedAt: new Date(),
        errorMessage: null,
        errorCode: null,
      });

      const userId = job.createdBy || 0;
      await emitIntelligenceAudit({
        action: "extraction.completed",
        organizationId: job.organizationId,
        userId,
        documentId: job.documentId,
        contractId: job.contractId,
        jobId,
        extractionId: extraction.id,
        changes: {
          version,
          overallConfidence: overall,
          documentType: extracted.documentType,
          ocrRequired: ocrResult.ocrApplied,
        },
      });
      await emitIntelligenceActivity({
        action: "Document Extracted",
        userId,
        contractId: job.contractId,
        entityName: docMeta?.originalFilename,
      });
      await emitIntelligenceActivity({
        action: "Verification Pending",
        userId,
        contractId: job.contractId,
        entityName: docMeta?.originalFilename,
      });
    } catch (error) {
      const code =
        error instanceof IntelligenceError
          ? error.code
          : mapProviderError(error);
      const message =
        error instanceof Error ? error.message : "Extraction failed";

      const shouldRetry =
        job.attempt < job.maxAttempts &&
        ["AI_TIMEOUT", "PROVIDER_UNAVAILABLE", "NETWORK"].includes(code);

      await extractionRepository.updateJob(jobId, {
        status: shouldRetry ? JOB_STATUS.retrying : JOB_STATUS.failed,
        completedAt: shouldRetry ? null : new Date(),
        errorMessage: message.slice(0, 2000),
        errorCode: code,
      });

      await emitIntelligenceAudit({
        action: "extraction.failed",
        organizationId: job.organizationId,
        userId: job.createdBy || 0,
        documentId: job.documentId,
        contractId: job.contractId,
        jobId,
        changes: { code, message, attempt: job.attempt, willRetry: shouldRetry },
      });
      await emitIntelligenceActivity({
        action: "Extraction Failed",
        userId: job.createdBy || 0,
        contractId: job.contractId,
      });

      if (shouldRetry) {
        // Auto-retry once after short delay
        setTimeout(() => {
          void this.retryExtraction({
            organizationId: job.organizationId,
            documentId: job.documentId,
            jobId: job.id,
            userId: job.createdBy || 0,
            contractId: job.contractId,
          }).catch(() => undefined);
        }, 1500);
      }
    }
  }

  private async fetchDocumentBytes(
    documentId: string,
    organizationId: string
  ): Promise<Buffer> {
    try {
      const url = await documentService.getSignedDownloadUrl(
        documentId,
        organizationId
      );
      const res = await fetch(url);
      if (!res.ok) {
        throw new IntelligenceError(
          "Unable to download document for extraction",
          502,
          "PROVIDER_UNAVAILABLE"
        );
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      if (error instanceof IntelligenceError) throw error;
      throw new IntelligenceError(
        error instanceof Error ? error.message : "Document download failed",
        502,
        "NETWORK"
      );
    }
  }

  toJobDto(job: {
    id: string;
    organizationId: string;
    documentId: string;
    contractId: number | null;
    status: string;
    attempt: number;
    maxAttempts: number;
    errorMessage: string | null;
    errorCode: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdBy: number | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: job.id,
      documentId: job.documentId,
      contractId: job.contractId,
      status: job.status,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      errorMessage: job.errorMessage,
      errorCode: job.errorCode,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  toExtractionDto(extraction: any) {
    return {
      id: extraction.id,
      documentId: extraction.documentId,
      contractId: extraction.contractId,
      jobId: extraction.jobId,
      version: extraction.version,
      status: extraction.status,
      documentType: extraction.documentType,
      documentTypeLabel: documentTypeLabel(extraction.documentType),
      documentTypeConfidence: extraction.documentTypeConfidence,
      ocrRequired: extraction.ocrRequired,
      ocrProvider: extraction.ocrProvider,
      textCharCount: extraction.textCharCount,
      pageCount: extraction.pageCount,
      promptVersion: extraction.promptVersion,
      model: extraction.model,
      aiProvider: extraction.aiProvider,
      overallConfidence: extraction.overallConfidence,
      durationMs: extraction.durationMs,
      // rawText intentionally available for verification shell — not verified data
      rawTextPreview: (extraction.rawText || "").slice(0, 2000),
      pageBoundaries: extraction.pageBoundaries,
      rawResponse: extraction.rawResponse,
      normalizedResponse: extraction.normalizedResponse,
      fields: (extraction.fields || []).map((f: any) => ({
        id: f.id,
        fieldKey: f.fieldKey,
        fieldLabel: f.fieldLabel,
        value: f.value,
        confidence: f.confidence,
        verificationState: f.verificationState,
        sourceLocation: f.sourceLocation,
        sortOrder: f.sortOrder,
      })),
      verificationDraft: extraction.draft
        ? {
            id: extraction.draft.id,
            status: extraction.draft.status,
            begunAt: extraction.draft.begunAt?.toISOString() ?? null,
            begunBy: extraction.draft.begunBy,
          }
        : null,
      createdAt: extraction.createdAt.toISOString(),
      // Human verification remains mandatory
      isVerified: false,
      humanVerificationRequired: true,
    };
  }
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapProviderError(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  if (msg.includes("timeout")) return "AI_TIMEOUT";
  if (msg.includes("network") || msg.includes("fetch")) return "NETWORK";
  if (msg.includes("unavailable") || msg.includes("503")) return "PROVIDER_UNAVAILABLE";
  return "EXTRACTION_FAILED";
}

export const documentIntelligenceService = new DocumentIntelligenceService();
