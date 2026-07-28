/**
 * ProjectionEngine — apply events, rebuild keys, full org rebuild.
 * No domain logic. Retries are handled by the platform event subscriber layer.
 */

import { logger } from "@/lib/logger";
import type { PlatformEventRecord } from "@/lib/platform/events/types";
import {
  getProjection,
  listProjections,
  requireProjection,
} from "./registry";
import { upsertCheckpoint } from "./store";
import {
  incProjectionMetric,
  recordProjectionTime,
} from "./metrics";
import type {
  ApplyEventResult,
  ProjectionContext,
  ProjectionDefinition,
  ProjectionKey,
  RebuildResult,
} from "./types";
import { ProjectionError } from "./types";

export class ProjectionEngine {
  async applyEvent(
    projectionName: string,
    event: PlatformEventRecord
  ): Promise<ApplyEventResult> {
    const def = requireProjection(projectionName);
    return this.applyEventToDefinition(def, event);
  }

  async applyEventToDefinition(
    def: ProjectionDefinition,
    event: PlatformEventRecord
  ): Promise<ApplyEventResult> {
    const started = Date.now();
    try {
      const keys = await Promise.resolve(def.resolveKeys(event));
      const ctx: ProjectionContext = {
        organizationId: event.organizationId,
        mode: "event",
        sourceEventId: event.id,
        sourceEventName: event.eventName,
        payload: event.payload,
        occurredAt: event.occurredAt,
        event,
      };

      for (const key of keys) {
        await def.project(key, ctx);
        incProjectionMetric("keys_projected");
      }

      if (def.afterEvent) {
        await def.afterEvent(event, keys);
      }

      await upsertCheckpoint({
        projectionName: def.name,
        organizationId: event.organizationId,
        lastEventId: event.id,
        lastEventName: event.eventName,
        lastEventPublishedAt: event.publishedAt,
        status: "idle",
        lastError: null,
        incrementProcessed: 1,
      });

      incProjectionMetric("events_applied");
      recordProjectionTime(Date.now() - started);

      return {
        projectionName: def.name,
        keys: keys.map((k) => k.key),
        ok: true,
      };
    } catch (error) {
      incProjectionMetric("failures");
      const message =
        error instanceof Error ? error.message : String(error);
      logger.error("platform.projections", "applyEvent failed", {
        projection: def.name,
        eventId: event.id,
        error: message,
      });
      await upsertCheckpoint({
        projectionName: def.name,
        organizationId: event.organizationId,
        status: "failed",
        lastError: message,
        incrementFailures: 1,
      }).catch(() => undefined);

      return {
        projectionName: def.name,
        keys: [],
        ok: false,
        error: message,
      };
    }
  }

  /**
   * Apply one event to all matching registered projections.
   */
  async fanOutEvent(event: PlatformEventRecord): Promise<ApplyEventResult[]> {
    const { matchProjectionsForEvent } = await import("./registry");
    const defs = matchProjectionsForEvent(event.eventName);
    const results: ApplyEventResult[] = [];
    for (const def of defs) {
      results.push(await this.applyEventToDefinition(def, event));
    }
    return results;
  }

  async projectKey(params: {
    projectionName: string;
    organizationId: string;
    key: ProjectionKey;
    mode?: ProjectionContext["mode"];
    sourceEventId?: string | null;
  }): Promise<void> {
    const def = requireProjection(params.projectionName);
    await def.project(params.key, {
      organizationId: params.organizationId,
      mode: params.mode ?? "manual",
      sourceEventId: params.sourceEventId,
    });
    incProjectionMetric("keys_projected");
  }

  async rebuild(params: {
    projectionName: string;
    organizationId: string;
  }): Promise<RebuildResult> {
    const def = requireProjection(params.projectionName);
    if (!def.listKeys) {
      throw new ProjectionError(
        `Projection ${def.name} does not support listKeys rebuild`,
        400,
        "REBUILD_UNSUPPORTED"
      );
    }

    await upsertCheckpoint({
      projectionName: def.name,
      organizationId: params.organizationId,
      status: "rebuilding",
      lastError: null,
    });

    const keys = await def.listKeys(params.organizationId);
    const errors: string[] = [];
    let keysProcessed = 0;

    for (const key of keys) {
      try {
        await def.project(key, {
          organizationId: params.organizationId,
          mode: "rebuild",
        });
        keysProcessed += 1;
        incProjectionMetric("keys_projected");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${key.key}: ${msg}`);
        incProjectionMetric("failures");
      }
    }

    await upsertCheckpoint({
      projectionName: def.name,
      organizationId: params.organizationId,
      status: errors.length ? "failed" : "idle",
      lastError: errors[0] ?? null,
      lastRebuildAt: new Date(),
      incrementProcessed: keysProcessed,
      incrementFailures: errors.length,
    });

    incProjectionMetric("rebuilds");

    return {
      projectionName: def.name,
      organizationId: params.organizationId,
      keysProcessed,
      errors,
    };
  }

  async rebuildAll(params: {
    organizationId: string;
    projectionName?: string;
  }): Promise<RebuildResult[]> {
    const defs = params.projectionName
      ? [requireProjection(params.projectionName)]
      : listProjections().filter((d) => !!d.listKeys);

    const results: RebuildResult[] = [];
    for (const def of defs) {
      results.push(
        await this.rebuild({
          projectionName: def.name,
          organizationId: params.organizationId,
        })
      );
    }
    return results;
  }
}

export const projectionEngine = new ProjectionEngine();

export function isProjectionRegistered(name: string): boolean {
  return !!getProjection(name);
}
