import { prisma } from "@/lib/prisma";

export type ContractReadinessBlocker =
  | "verified_contract_missing"
  | "artist_unresolved"
  | "release_unresolved"
  | "terms_unverified";

export type ContractReadiness = {
  ready: boolean;
  status: "ready" | "blocked";
  blockers: ContractReadinessBlocker[];
  checks: {
    verifiedContract: boolean;
    artist: boolean;
    release: boolean;
    terms: boolean;
  };
};

/**
 * Operational readiness gate for a contract.
 *
 * Readiness is deliberately derived from human-verified contract data and
 * human-confirmed relationships. AI extraction and pending suggestions do not
 * satisfy any readiness requirement.
 */
export class ContractReadinessService {
  async evaluate(params: {
    organizationId: string;
    contractId: number;
  }): Promise<ContractReadiness> {
    const verified = await prisma.verifiedContract.findFirst({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        isCurrent: true,
        status: "active",
      },
      select: { id: true; extractionId: true; },
    });

    if (!verified) {
      return {
        ready: false,
        status: "blocked",
        blockers: ["verified_contract_missing"],
        checks: {
          verifiedContract: false,
          artist: false,
          release: false,
          terms: false,
        },
      };
    }

    const [artistLink, releaseLink, terms] = await Promise.all([
      prisma.contractRelationship.findFirst({
        where: {
          organizationId: params.organizationId,
          contractId: params.contractId,
          targetEntityType: "artist",
          relationshipType: "represents",
          status: "active",
        },
        select: { id: true },
      }),
      prisma.contractRelationship.findFirst({
        where: {
          organizationId: params.organizationId,
          contractId: params.contractId,
          targetEntityType: "release",
          relationshipType: "applies_to",
          status: "active",
        },
        select: { id: true },
      }),
      prisma.verifiedField.findFirst({
        where: {
          organizationId: params.organizationId,
          extractionId: verified.extractionId,
          fieldKey: "term",
          decision: { in: ["accepted", "edited"] },
        },
        select: { id: true },
      }),
    ]);

    const checks = {
      verifiedContract: true,
      artist: !!artistLink,
      release: !!releaseLink,
      terms: !!terms,
    };

    const blockers: ContractReadinessBlocker[] = [];
    if (!checks.artist) blockers.push("artist_unresolved");
    if (!checks.release) blockers.push("release_unresolved");
    if (!checks.terms) blockers.push("terms_unverified");

    return {
      ready: blockers.length === 0,
      status: blockers.length === 0 ? "ready" : "blocked",
      blockers,
      checks,
    };
  }
}

export const contractReadinessService = new ContractReadinessService();
