/**
 * Platform Projection Framework — shared types.
 *
 * Modules implement ProjectionDefinition + domain builder logic.
 * Platform owns subscriptions, replay, rebuild, checkpoints, metrics, retries.
 */

import type { PlatformEventRecord } from "@/lib/platform/events/types";

export type ProjectionMode = "event" | "rebuild" | "manual" | "replay";

export interface ProjectionKey {
  /**
   * Stable stream key for the projection row/stream.
   * Examples: "release:42", "release:42:contract:7"
   */
  key: string;
  /** Optional structured identity for builders */
  parts?: Record<string, string | number | null | undefined>;
}

export interface ProjectionContext {
  organizationId: string;
  mode: ProjectionMode;
  sourceEventId?: string | null;
  sourceEventName?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
  event?: PlatformEventRecord | null;
}

/**
 * Module-owned projection definition.
 * Register once; platform handles infrastructure.
 */
export interface ProjectionDefinition {
  /** Unique name e.g. release.contract.summary */
  name: string;
  version: string;
  description: string;
  /** Owning module e.g. release-workspace */
  owner: string;
  /** Platform event name patterns (supports trailing *) */
  events: string[];
  maxRetries?: number;

  /**
   * Map an inbound platform event to projection keys to rebuild.
   * Return empty array to no-op.
   */
  resolveKeys(
    event: PlatformEventRecord
  ): ProjectionKey[] | Promise<ProjectionKey[]>;

  /**
   * Build or update the projection for one key.
   * Domain-only logic — no subscription / retry / metrics here.
   */
  project(key: ProjectionKey, ctx: ProjectionContext): Promise<void>;

  /**
   * Optional: enumerate all keys for an organization (full rebuild / replay seed).
   */
  listKeys?(organizationId: string): Promise<ProjectionKey[]>;

  /**
   * Optional: after all keys for an event have been projected.
   */
  afterEvent?(
    event: PlatformEventRecord,
    keys: ProjectionKey[]
  ): Promise<void>;
}

export interface ProjectionCheckpoint {
  projectionName: string;
  organizationId: string;
  lastEventId: string | null;
  lastEventName: string | null;
  lastEventPublishedAt: Date | null;
  status: "idle" | "running" | "failed" | "rebuilding";
  lastError: string | null;
  lastRebuildAt: Date | null;
  processedCount: number;
  failureCount: number;
  updatedAt: Date;
}

export interface RebuildResult {
  projectionName: string;
  organizationId: string;
  keysProcessed: number;
  errors: string[];
}

export interface ApplyEventResult {
  projectionName: string;
  keys: string[];
  ok: boolean;
  error?: string;
}

export class ProjectionError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "PROJECTION_ERROR") {
    super(message);
    this.name = "ProjectionError";
    this.status = status;
    this.code = code;
  }
}
