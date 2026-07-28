/**
 * ProjectionSubscriber — wires registered projections into the Platform Event Bus.
 * Modules never register raw event handlers for projections; they only register definitions.
 */

import { registerSubscriber } from "@/lib/platform/events/subscribers/registry";
import { logger } from "@/lib/logger";
import { listProjections } from "./registry";
import { projectionEngine } from "./engine";

const wired = new Set<string>();

/**
 * Register platform event bus subscribers for every ProjectionDefinition.
 * Idempotent per projection name.
 */
export function wireProjectionSubscribers(): void {
  for (const def of listProjections()) {
    if (wired.has(def.name)) continue;
    wired.add(def.name);

    registerSubscriber({
      id: `projection.${def.name}`,
      description:
        def.description ||
        `Platform projection subscriber for ${def.name} (${def.owner})`,
      events: def.events,
      maxRetries: def.maxRetries ?? 5,
      handler: async ({ event }) => {
        const result = await projectionEngine.applyEventToDefinition(
          def,
          event
        );
        if (!result.ok) {
          logger.error("platform.projections.subscriber", "projection failed", {
            projection: def.name,
            eventId: event.id,
            error: result.error,
          });
          // Re-throw so platform event delivery retries / DLQ
          throw new Error(
            result.error || `Projection ${def.name} failed for event ${event.id}`
          );
        }
      },
    });
  }
}

/** Test helper */
export function clearWiredProjections(): void {
  wired.clear();
}
