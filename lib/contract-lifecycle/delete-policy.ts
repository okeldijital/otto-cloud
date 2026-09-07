export type ContractDeletionFacts = {
  contractStatus: string | null | undefined;
  lifecycleStatus: string | null | undefined;
  hasVerifiedContract: boolean;
  relationshipCount: number;
  rightReferenceCount: number;
  rightCount: number;
  royaltyEntitlementCount: number;
};

export type ContractDeletionDecision =
  | { allowed: true }
  | { allowed: false; reason: string; code: string };

/**
 * A contract may only be hard-removed while it is still an intake/draft record
 * and has not become authoritative or acquired downstream business meaning.
 */
export function evaluateContractDeletion(
  facts: ContractDeletionFacts
): ContractDeletionDecision {
  const lifecycle = (facts.lifecycleStatus || "").toLowerCase();
  const status = (facts.contractStatus || "").toLowerCase();

  if (facts.hasVerifiedContract) {
    return {
      allowed: false,
      code: "CONTRACT_VERIFIED",
      reason: "This contract has a verified version and cannot be deleted.",
    };
  }

  if (facts.relationshipCount > 0) {
    return {
      allowed: false,
      code: "CONTRACT_HAS_RELATIONSHIPS",
      reason: "This contract has confirmed catalogue or entity relationships and cannot be deleted.",
    };
  }

  if (facts.rightReferenceCount > 0 || facts.rightCount > 0) {
    return {
      allowed: false,
      code: "CONTRACT_HAS_RIGHTS",
      reason: "This contract has downstream rights data and cannot be deleted.",
    };
  }

  if (facts.royaltyEntitlementCount > 0) {
    return {
      allowed: false,
      code: "CONTRACT_HAS_ROYALTY_ENTITLEMENTS",
      reason: "This contract has downstream royalty entitlements and cannot be deleted.",
    };
  }

  const deletableStatuses = new Set(["draft", "pending_verification"]);
  if (lifecycle && !deletableStatuses.has(lifecycle)) {
    return {
      allowed: false,
      code: "CONTRACT_LIFECYCLE_LOCKED",
      reason: `Contracts in lifecycle state '${facts.lifecycleStatus}' cannot be deleted.`,
    };
  }

  if (status && !["draft", "pending_verification"].includes(status)) {
    return {
      allowed: false,
      code: "CONTRACT_STATUS_LOCKED",
      reason: `Contracts in status '${facts.contractStatus}' cannot be deleted.`,
    };
  }

  return { allowed: true };
}
