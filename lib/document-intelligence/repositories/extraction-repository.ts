import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class ExtractionRepository {
  async createJob(data: Prisma.DocumentExtractionJobCreateInput) {
    return prisma.documentExtractionJob.create({ data });
  }

  async updateJob(id: string, data: Prisma.DocumentExtractionJobUpdateInput) {
    return prisma.documentExtractionJob.update({ where: { id }, data });
  }

  async findJob(id: string) {
    return prisma.documentExtractionJob.findUnique({ where: { id } });
  }

  async findLatestJobForDocument(documentId: string, organizationId: string) {
    return prisma.documentExtractionJob.findFirst({
      where: { documentId, organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listJobsForDocument(documentId: string, organizationId: string) {
    return prisma.documentExtractionJob.findMany({
      where: { documentId, organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async nextExtractionVersion(documentId: string): Promise<number> {
    const last = await prisma.documentExtraction.findFirst({
      where: { documentId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return (last?.version ?? 0) + 1;
  }

  async createExtraction(
    data: Prisma.DocumentExtractionCreateInput,
    fields: Array<{
      fieldKey: string;
      fieldLabel: string;
      value: string | null;
      confidence: number;
      verificationState: string;
      sortOrder: number;
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      const extraction = await tx.documentExtraction.create({ data });
      if (fields.length) {
        await tx.extractionField.createMany({
          data: fields.map((f) => ({
            extractionId: extraction.id,
            fieldKey: f.fieldKey,
            fieldLabel: f.fieldLabel,
            value: f.value,
            confidence: f.confidence,
            verificationState: f.verificationState,
            sortOrder: f.sortOrder,
          })),
        });
      }
      await tx.verificationDraft.create({
        data: {
          organizationId: extraction.organizationId,
          extractionId: extraction.id,
          documentId: extraction.documentId,
          contractId: extraction.contractId,
          status: "pending",
        },
      });
      return extraction;
    });
  }

  async findExtraction(id: string, organizationId: string) {
    return prisma.documentExtraction.findFirst({
      where: { id, organizationId },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        draft: true,
        job: true,
      },
    });
  }

  async findLatestExtraction(documentId: string, organizationId: string) {
    return prisma.documentExtraction.findFirst({
      where: { documentId, organizationId },
      orderBy: { version: "desc" },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        draft: true,
        job: true,
      },
    });
  }

  async beginVerification(extractionId: string, userId: number) {
    return prisma.verificationDraft.update({
      where: { extractionId },
      data: {
        status: "in_progress",
        begunAt: new Date(),
        begunBy: userId,
      },
    });
  }
}

export const extractionRepository = new ExtractionRepository();
