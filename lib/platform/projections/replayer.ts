/**
 * ProjectionReplayer — rebuild projections from the platform event store.
 * Preserves event order (publishedAt asc) and updates checkpoints.
 */

import { listEvents } from "@/lib/platform/events/store";
import type { PlatformEventRecord } from "@/lib/platform/events/types";
import { requireProjection, matchEventPattern } from "./registry";
import { projectionEngine } from "./engine";
import { upsertCheckpoint } from "./store";
import { incProjectionMetric } from "./metrics";
import type { RebuildResult } from "./types";

export class ProjectionReplayer {
  /**
   * Replay stored platform events into a projection (or all matching).
   */
  async replay(params: {
    organizationId: string;
    projectionName: string;
    from?: Date;
    to?: Date;
    /** When true, also run listKeys full rebuild first */
    fullRebuildFirst?: boolean;
    limit?: number;
  }): Promise<{
    projectionName: string;
    eventsProcessed: number;
    keysTouched: number;
    errors: string[];
    rebuild?: RebuildResult;
  }> {
    const def = requireProjection(params.projectionName);
    let rebuild: RebuildResult | undefined;

    if (params.fullRebuildFirst && def.listKeys) {
      rebuild = await projectionEngine.rebuild({
        projectionName: def.name,
        organizationId: params.organizationId,
      });
    }

    await upsertCheckpoint({
      projectionName: def.name,
      organizationId: params.organizationId,
      status: "running",
      lastError: null,
    });

    // Paginate event store (newest-first API) — collect then process oldest-first
    const collected: PlatformEventRecord[] = [];
    let offset = 0;
    const pageSize = 100;
    const max = params.limit ?? 1000;

    while (collected.length < max) {
      const page = await listEvents({
        organizationId: params.organizationId,
        from: params.from,
        to: params.to,
        limit: pageSize,
        offset,
      });
      if (!page.items.length) break;
      for (const ev of page.items) {
        if (def.events.some((p) => matchEventPattern(p, ev.eventName))) {
          collected.push(ev);
        }
      }
      offset += page.items.length;
      if (page.items.length < pageSize) break;
    }

    collected.sort(
      (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime()
    );

    let eventsProcessed = 0;
    let keysTouched = 0;
    const errors: string[] = [];

    for (const event of collected.slice(0, max)) {
      const result = await projectionEngine.applyEventToDefinition(def, {
        ...event,
        // mark mode via engine always uses "event"; acceptable for replay
      });
      if (result.ok) {
        eventsProcessed += 1;
        keysTouched += result.keys.length;
      } else if (result.error) {
        errors.push(`${event.id}: ${result.error}`);
      }
    }

    await upsertCheckpoint({
      projectionName: def.name,
      organizationId: params.organizationId,
      status: errors.length ? "failed" : "idle",
      lastError: errors[0] ?? null,
      lastRebuildAt: new Date(),
    });

    incProjectionMetric("replays");

    return {
      projectionName: def.name,
      eventsProcessed,
      keysTouched,
      errors,
      rebuild,
    };
  }
}

export const projectionReplayer = new ProjectionReplayer();
