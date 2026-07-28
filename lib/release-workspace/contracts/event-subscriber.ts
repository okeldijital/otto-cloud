/**
 * @deprecated Prefer platform projections.
 * Kept as a thin bootstrap alias so existing imports keep working.
 *
 * Registration is owned by `lib/platform/projections` via
 * `registerReleaseContractProjection` + `wireProjectionSubscribers`.
 */

import { registerReleaseContractProjection } from "./projection";

/**
 * Registers the Release contract ProjectionDefinition with the platform.
 * Does NOT register a raw event-bus subscriber (platform wires that).
 */
export function registerReleaseContractSubscriber(): void {
  registerReleaseContractProjection();
}
