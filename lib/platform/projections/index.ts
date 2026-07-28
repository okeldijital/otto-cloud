/**
 * OTTO Platform Projection Framework
 *
 * Modules implement: Projection Definition → Builder (project/resolveKeys) → UI
 * Platform handles: subscriptions, replay, rebuild, checkpointing, metrics, retries
 */

export type {
  ProjectionDefinition,
  ProjectionKey,
  ProjectionContext,
  ProjectionMode,
  ProjectionCheckpoint,
  RebuildResult,
  ApplyEventResult,
} from "./types";
export { ProjectionError } from "./types";

export {
  registerProjection,
  unregisterProjection,
  getProjection,
  requireProjection,
  listProjections,
  clearProjections,
  matchProjectionsForEvent,
  matchEventPattern,
} from "./registry";

export { projectionEngine, ProjectionEngine } from "./engine";
export { projectionReplayer, ProjectionReplayer } from "./replayer";
export {
  getCheckpoint,
  upsertCheckpoint,
  listCheckpoints,
} from "./store";
export {
  wireProjectionSubscribers,
  clearWiredProjections,
} from "./subscriber";
import { wireProjectionSubscribers as wireSubscribers } from "./subscriber";
export {
  getProjectionMetrics,
  incProjectionMetric,
  recordProjectionTime,
  resetProjectionMetrics,
} from "./metrics";

/** Bootstrap: register module projection definitions then wire subscribers. */
let projectionsBootstrapped = false;

export async function bootstrapProjections(): Promise<void> {
  if (projectionsBootstrapped) return;
  projectionsBootstrapped = true;

  // Reference implementation: Release Workspace contract projection
  const { registerReleaseContractProjection } = await import(
    "@/lib/release-workspace/contracts/projection"
  );
  registerReleaseContractProjection();

  wireSubscribers();
}

/** Reset bootstrap flag (tests). */
export function resetProjectionBootstrap(): void {
  projectionsBootstrapped = false;
}
