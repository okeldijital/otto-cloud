import type { ProjectionDefinition } from "./types";
import { ProjectionError } from "./types";

const byName = new Map<string, ProjectionDefinition>();

export function registerProjection(def: ProjectionDefinition): void {
  if (!def.name?.trim()) {
    throw new ProjectionError("Projection name is required", 400, "NAME_REQUIRED");
  }
  if (!def.events?.length) {
    throw new ProjectionError(
      `Projection ${def.name} must declare events`,
      400,
      "EVENTS_REQUIRED"
    );
  }
  if (typeof def.resolveKeys !== "function" || typeof def.project !== "function") {
    throw new ProjectionError(
      `Projection ${def.name} must implement resolveKeys and project`,
      400,
      "HANDLERS_REQUIRED"
    );
  }
  byName.set(def.name, def);
}

export function unregisterProjection(name: string): boolean {
  return byName.delete(name);
}

export function getProjection(name: string): ProjectionDefinition | undefined {
  return byName.get(name);
}

export function requireProjection(name: string): ProjectionDefinition {
  const def = byName.get(name);
  if (!def) {
    throw new ProjectionError(
      `Projection not registered: ${name}`,
      404,
      "PROJECTION_NOT_FOUND"
    );
  }
  return def;
}

export function listProjections(): ProjectionDefinition[] {
  return [...byName.values()];
}

export function clearProjections(): void {
  byName.clear();
}

/** Projections that subscribe to a given platform event name. */
export function matchProjectionsForEvent(
  eventName: string
): ProjectionDefinition[] {
  return listProjections().filter((def) =>
    def.events.some((pattern) => matchEventPattern(pattern, eventName))
  );
}

export function matchEventPattern(pattern: string, eventName: string): boolean {
  if (pattern === "*" || pattern === eventName) return true;
  if (pattern.endsWith("*")) {
    return eventName.startsWith(pattern.slice(0, -1));
  }
  return false;
}
