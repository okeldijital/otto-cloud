import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";

export type ContractReadinessBlocker =
  | "verified_contract_missing"
  | "artist_unresolved"
  | "release_unresolved"
  | "terms_unverified";

export type ContractReadiness = {
  /**
   * Legacy downstream gate. A contract is operationally ready only when
   * verified contractual data and required catalogue relationships exist.
   */
  ready: boolean;
  status: "ready" | "blocked";
  blockers: ContractReadinessBlocker[];
  checks: {
    verifiedContract: boolean;
    artist: boolean;
    release: boolean;
    terms: boolean;
  };
  /**
   * Contract capture is intentionally independent from catalogue linkage.
   * A contract can be Captured / Verified before an Artist or Release is linked.
   */
  captureReady: boolean;
  captureStatus: "captured" | "blocked";
  /**
   * Downstream catalogue context is a separate state from contract capture.
   */
  catalogueLinkageStatus: "pending" | "contextualised";
};

export function buildContractReadiness(input: {
  verifiedContract: boolean;
  artist: boolean;
  release: boolean;
  terms: boolean;
}): ContractReadiness {
  const captureReady = input.verifiedContract && input.terms;
  const captureStatus = captureReady ? "captured" : "blocked";
  const catalogueLinkageStatus =
    captureReady && input.artist && input.release
      ? "contextualised"
      : "pending";

  if (!input.verifiedContract) {
    return {
      ready: false,
      status: "blocked",
      blockers: ["verified_contract_missing"],
      checks: input,
      captureReady,
      captureStatus,
      catalogueLinkageStatus,
    };
  }

  const blockers: ContractReadinessBlocker[] = [];
  if (!input.artist) blockers.push("artist_unresolved");
  if (!input.release) blockers.push("release_unresolved");
  if (!input.terms) blockers.push("terms_unverified");

  return {
    ready: blockers.length === 0,
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    checks: input,
    captureReady,
    captureStatus,
    catalogueLinkageStatus,
  };
}

/**
 * Throw a deterministic operational-readiness error when a contract cannot
 * be consumed by a downstream operation that requires a fully resolved
 * contract. Readiness is human-confirmation based; AI suggestions never pass.
 */
export function assertContractReady(readiness: ContractReadiness): void {
  if (readiness.ready) return;

  throw new IntelligenceError(
    "Contract is not operationally ready",
    409,
    "CONTRACT_NOT_OPERATIONALLY_READY",
    readiness.blockers
  );
}

/**
 * Operational readiness gate for a contract.
 *
 * Readiness is deliberately derived from human-verified contract data and
 * human-confirmed relationships. AI extraction and pending suggestions do not
 * satisfy any readiness requirement.
 *
 * Important: this gate intentionally exposes capture readiness separately.
 * Contract capture does not require an Artist or Release relationship. Those
 * are downstream catalogue-linkage dependencies.
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
      select: { id: true, extractionId: true },
    });

    if (!verified) {
      return buildContractReadiness({
        verifiedContract: false,
        artist: false,
        release: false,
        terms: false,
      });
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

    return buildContractReadiness({
      verifiedContract: true,
      artist: !!artistLink,
      release: !!releaseLink,
      terms: !!terms,
    });
  }
}

export const contractReadinessService = new ContractReadinessService();
