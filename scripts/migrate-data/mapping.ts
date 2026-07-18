/**
 * ID translation layer — source SQLite ids → destination PostgreSQL ids.
 * Persisted to migration/id-map.json for relationship reconstruction & resume.
 */

import { readJson, writeJson } from "./utils";
import type { DataMigrateConfig } from "./config";
import { paths } from "./config";

export type IdMapFile = {
  version: 1;
  updatedAt: string;
  /** entity type → { sourceId: destId } */
  maps: Record<string, Record<string, string | number>>;
};

export class IdMapper {
  private maps = new Map<string, Map<string, string | number>>();

  constructor(private config: DataMigrateConfig) {
    this.load();
  }

  load(): void {
    const file = readJson<IdMapFile>(paths(this.config).idMap, {
      version: 1,
      updatedAt: new Date().toISOString(),
      maps: {},
    });
    this.maps.clear();
    for (const [entity, pairs] of Object.entries(file.maps ?? {})) {
      const m = new Map<string, string | number>();
      for (const [k, v] of Object.entries(pairs)) m.set(String(k), v);
      this.maps.set(entity, m);
    }
  }

  save(): void {
    const maps: Record<string, Record<string, string | number>> = {};
    for (const [entity, m] of this.maps.entries()) {
      maps[entity] = Object.fromEntries(m.entries());
    }
    writeJson(paths(this.config).idMap, {
      version: 1,
      updatedAt: new Date().toISOString(),
      maps,
    } satisfies IdMapFile);
  }

  set(entity: string, sourceId: string | number, destId: string | number): void {
    if (!this.maps.has(entity)) this.maps.set(entity, new Map());
    this.maps.get(entity)!.set(String(sourceId), destId);
  }

  get(entity: string, sourceId: string | number): string | number | undefined {
    return this.maps.get(entity)?.get(String(sourceId));
  }

  getNumberMap(entity: string): Map<number, number> {
    const out = new Map<number, number>();
    const m = this.maps.get(entity);
    if (!m) return out;
    for (const [k, v] of m.entries()) {
      const sk = Number(k);
      const dv = typeof v === "number" ? v : Number(v);
      if (!Number.isNaN(sk) && !Number.isNaN(dv)) out.set(sk, dv);
    }
    return out;
  }

  /** Snapshot for reports */
  toJSON(): Record<string, Record<string, string | number>> {
    const maps: Record<string, Record<string, string | number>> = {};
    for (const [entity, m] of this.maps.entries()) {
      maps[entity] = Object.fromEntries(m.entries());
    }
    return maps;
  }
}

/** Canonical entity keys for FK remapping */
export const ENTITY_KEYS = {
  organizations: "organizations",
  users: "users",
  labels: "labels",
  publishers: "publishers",
  pros: "pros",
  artists: "artists",
  individuals: "individuals",
  works: "works",
  releases: "releases",
  tracks: "tracks",
  contracts: "contracts",
  documents: "documents",
  platforms: "platforms",
} as const;
