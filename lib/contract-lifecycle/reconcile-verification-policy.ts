import { LIFECYCLE_STATUS, type LifecycleStatus } from "./constants";

export type VerificationReconciliation =
  | { action: "create"; status: typeof LIFECYCLE_STATUS.verified }
  | {
      action: "transition";
      from: LifecycleStatus;
      to: typeof LIFECYCLE_STATUS.verified;
    }
  | { action: "bind"; status: LifecycleStatus };

export function decideVerificationReconciliation(
  currentStatus: LifecycleStatus | null
): VerificationReconciliation {
  if (!currentStatus) {
    return { action: "create", status: LIFECYCLE_STATUS.verified };
  }

  if (
    currentStatus === LIFECYCLE_STATUS.draft ||
    currentStatus === LIFECYCLE_STATUS.pending_verification
  ) {
    return {
      action: "transition",
      from: currentStatus,
      to: LIFECYCLE_STATUS.verified,
    };
  }

  return { action: "bind", status: currentStatus };
}
