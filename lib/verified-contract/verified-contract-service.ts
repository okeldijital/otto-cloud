import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";
import { promoteVerifiedContract, type PromoteInput } from "./promotion";

/**
 * VerifiedContractService — domain read model + promotion orchestration.
 * No AI / OCR. Platform integration surface for consumers.
 */
export class VerifiedContractService {
  /**
   * Promote from a completed verification session (idempotent).
   */
  async promoteFromSession(input: PromoteInput) {
    if (!input.contractId) {
      throw new IntelligenceError(
        "Contract id required for promotion",
        400,
        "CONTRACT_ID_REQUIRED"
      );
    }
    return promoteVerifiedContract(input);
  }

  async getCurrent(params: {
    organizationId: string;
    contractId: number;
  }) {
    const vc = await prisma.verifiedContract.findFirst({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        isCurrent: true,
      },
      include: {
        parties: { orderBy: { sortOrder: "asc" } },
        terms: true,
        rights: true,
        obligations: true,
        territories: true,
        dates: true,
      },
    });
    return vc ? this.toDto(vc) : null;
  }

  async getParties(params: {
    organizationId: string;
    contractId: number;
  }) {
    const current = await this.getCurrent(params);
    return current?.parties ?? [];
  }

  async getHistory(params: {
    organizationId: string;
    contractId: number;
  }) {
    const versions = await prisma.verifiedContract.findMany({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        isCurrent: true,
        status: true,
        title: true,
        documentType: true,
        verificationSessionId: true,
        extractionId: true,
        documentId: true,
        promotedBy: true,
        promotedAt: true,
        provenance: true,
        createdAt: true,
      },
    });

    const events = await prisma.verifiedContractEvent.findMany({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      versions: versions.map((v) => ({
        ...v,
        promotedAt: v.promotedAt.toISOString(),
        createdAt: v.createdAt.toISOString(),
      })),
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        verifiedContractId: e.verifiedContractId,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  toDto(vc: any) {
    return {
      id: vc.id,
      organizationId: vc.organizationId,
      contractId: vc.contractId,
      documentId: vc.documentId,
      extractionId: vc.extractionId,
      verificationSessionId: vc.verificationSessionId,
      version: vc.version,
      isCurrent: vc.isCurrent,
      status: vc.status,
      title: vc.title,
      documentType: vc.documentType,
      referenceNumber: vc.referenceNumber,
      currency: vc.currency,
      territorySummary: vc.territorySummary,
      termSummary: vc.termSummary,
      rightsSummary: vc.rightsSummary,
      obligationsSummary: vc.obligationsSummary,
      effectiveDateText: vc.effectiveDateText,
      expirationDateText: vc.expirationDateText,
      governingLaw: vc.governingLaw,
      provenance: vc.provenance,
      promotedBy: vc.promotedBy,
      promotedAt: vc.promotedAt?.toISOString?.() ?? vc.promotedAt,
      parties: (vc.parties || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        sortOrder: p.sortOrder,
        provenance: p.provenance,
      })),
      terms: (vc.terms || []).map((t: any) => ({
        id: t.id,
        termType: t.termType,
        value: t.value,
        provenance: t.provenance,
      })),
      rights: (vc.rights || []).map((r: any) => ({
        id: r.id,
        description: r.description,
        provenance: r.provenance,
      })),
      obligations: (vc.obligations || []).map((o: any) => ({
        id: o.id,
        description: o.description,
        provenance: o.provenance,
      })),
      territories: (vc.territories || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        provenance: t.provenance,
      })),
      dates: (vc.dates || []).map((d: any) => ({
        id: d.id,
        dateType: d.dateType,
        valueText: d.valueText,
        provenance: d.provenance,
      })),
      /** Relationship placeholders for future modules */
      relationships: {
        releases: [] as string[],
        works: [] as string[],
        tracks: [] as string[],
        note: "Placeholders — linking implemented in a later milestone",
      },
    };
  }
}

export const verifiedContractService = new VerifiedContractService();
