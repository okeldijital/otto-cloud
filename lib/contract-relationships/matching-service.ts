import { prisma } from "@/lib/prisma";
import {
  MATCH_STRATEGIES,
  type MatchStrategy,
  type TargetEntityType,
} from "./constants";

export type MatchCandidate = {
  entityType: TargetEntityType;
  entityId: string;
  entityName: string;
  confidence: number;
  strategy: MatchStrategy;
  reason: string;
};

/**
 * Normalize text for comparison: lowercase, strip punctuation, collapse space.
 */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function exactMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function normalizedMatch(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b) && normalizeText(a).length > 0;
}

/**
 * MatchingService — exact, normalized, alias strategies.
 * Future: fuzzy / semantic without changing callers.
 */
export class MatchingService {
  /**
   * Find candidate entities for a free-text name across entity types.
   */
  async matchName(params: {
    organizationId: string;
    sourceText: string;
    entityTypes?: TargetEntityType[];
    limit?: number;
  }): Promise<MatchCandidate[]> {
    const text = params.sourceText?.trim();
    if (!text || text.length < 2) return [];

    const types = params.entityTypes || [
      "artist",
      "label",
      "publisher",
      "release",
      "work",
      "organization",
      "person",
      "track",
    ];
    const limit = params.limit ?? 5;
    const results: MatchCandidate[] = [];

    const tasks: Promise<void>[] = [];

    if (types.includes("artist")) {
      tasks.push(
        this.matchArtists(params.organizationId, text, limit).then((r) => {
          results.push(...r);
        })
      );
    }
    if (types.includes("label")) {
      tasks.push(
        this.matchLabels(text, limit).then((r) => {
          results.push(...r);
        })
      );
    }
    if (types.includes("publisher")) {
      tasks.push(
        this.matchPublishers(text, limit).then((r) => {
          results.push(...r);
        })
      );
    }
    if (types.includes("release")) {
      tasks.push(
        this.matchReleases(params.organizationId, text, limit).then((r) => {
          results.push(...r);
        })
      );
    }
    if (types.includes("work")) {
      tasks.push(
        this.matchWorks(params.organizationId, text, limit).then((r) => {
          results.push(...r);
        })
      );
    }
    if (types.includes("track")) {
      tasks.push(
        this.matchTracks(text, limit).then((r) => {
          results.push(...r);
        })
      );
    }
    if (types.includes("organization")) {
      tasks.push(
        this.matchOrganizations(text, limit).then((r) => {
          results.push(...r);
        })
      );
    }
    if (types.includes("person")) {
      tasks.push(
        this.matchPersons(params.organizationId, text, limit).then((r) => {
          results.push(...r);
        })
      );
    }

    await Promise.all(tasks);

    // Prefer higher confidence, then exact strategy
    results.sort((a, b) => b.confidence - a.confidence);
    return results.slice(0, limit * 2);
  }

  private score(name: string, candidate: string, hasAliasHit: boolean): {
    confidence: number;
    strategy: MatchStrategy;
    reason: string;
  } | null {
    if (exactMatch(name, candidate)) {
      return {
        confidence: 0.98,
        strategy: MATCH_STRATEGIES.exact,
        reason: `Exact match on "${candidate}"`,
      };
    }
    if (normalizedMatch(name, candidate)) {
      return {
        confidence: 0.9,
        strategy: MATCH_STRATEGIES.normalized,
        reason: `Normalized match on "${candidate}"`,
      };
    }
    if (hasAliasHit) {
      return {
        confidence: 0.85,
        strategy: MATCH_STRATEGIES.alias,
        reason: `Alias/AKA match`,
      };
    }
    // contains normalized (weaker)
    const n = normalizeText(name);
    const c = normalizeText(candidate);
    if (n.length >= 3 && c.length >= 3 && (c.includes(n) || n.includes(c))) {
      return {
        confidence: 0.65,
        strategy: MATCH_STRATEGIES.normalized,
        reason: `Partial normalized match on "${candidate}"`,
      };
    }
    return null;
  }

  private async matchArtists(
    organizationId: string,
    text: string,
    limit: number
  ): Promise<MatchCandidate[]> {
    const rows = await prisma.artists.findMany({
      where: {
        organization_id: organizationId,
        is_deleted: false,
        OR: [
          { name: { contains: text, mode: "insensitive" } },
          { aka: { contains: text, mode: "insensitive" } },
          { legal_name: { contains: text, mode: "insensitive" } },
        ],
      },
      take: limit * 3,
      select: { id: true, name: true, aka: true, legal_name: true },
    });
    const out: MatchCandidate[] = [];
    for (const r of rows) {
      const aliasHit =
        (!!r.aka &&
          (exactMatch(text, r.aka) ||
            normalizedMatch(text, r.aka) ||
            normalizeText(r.aka).includes(normalizeText(text)))) ||
        (!!r.legal_name &&
          (exactMatch(text, r.legal_name) || normalizedMatch(text, r.legal_name)));
      const s =
        this.score(text, r.name, !!aliasHit) ||
        (r.legal_name ? this.score(text, r.legal_name, true) : null);
      if (s) {
        out.push({
          entityType: "artist",
          entityId: String(r.id),
          entityName: r.name,
          ...s,
          reason: aliasHit && s.strategy !== "exact" ? `Artist alias match for "${r.name}"` : s.reason,
        });
      }
    }
    return out;
  }

  private async matchLabels(text: string, limit: number): Promise<MatchCandidate[]> {
    const rows = await prisma.labels.findMany({
      where: { name: { contains: text, mode: "insensitive" } },
      take: limit * 3,
      select: { id: true, name: true },
    });
    return rows
      .map((r) => {
        const s = this.score(text, r.name, false);
        return s
          ? {
              entityType: "label" as const,
              entityId: String(r.id),
              entityName: r.name,
              ...s,
            }
          : null;
      })
      .filter(Boolean) as MatchCandidate[];
  }

  private async matchPublishers(
    text: string,
    limit: number
  ): Promise<MatchCandidate[]> {
    const rows = await prisma.publishers.findMany({
      where: { name: { contains: text, mode: "insensitive" } },
      take: limit * 3,
      select: { id: true, name: true },
    });
    return rows
      .map((r) => {
        const s = this.score(text, r.name, false);
        return s
          ? {
              entityType: "publisher" as const,
              entityId: String(r.id),
              entityName: r.name,
              ...s,
            }
          : null;
      })
      .filter(Boolean) as MatchCandidate[];
  }

  private async matchReleases(
    organizationId: string,
    text: string,
    limit: number
  ): Promise<MatchCandidate[]> {
    const rows = await prisma.releases.findMany({
      where: {
        organization_id: organizationId,
        is_deleted: false,
        title: { contains: text, mode: "insensitive" },
      },
      take: limit * 3,
      select: { id: true, title: true },
    });
    return rows
      .map((r) => {
        const s = this.score(text, r.title, false);
        return s
          ? {
              entityType: "release" as const,
              entityId: String(r.id),
              entityName: r.title,
              ...s,
            }
          : null;
      })
      .filter(Boolean) as MatchCandidate[];
  }

  private async matchWorks(
    organizationId: string,
    text: string,
    limit: number
  ): Promise<MatchCandidate[]> {
    const rows = await prisma.works.findMany({
      where: {
        organization_id: organizationId,
        is_deleted: false,
        title: { contains: text, mode: "insensitive" },
      },
      take: limit * 3,
      select: { id: true, title: true },
    });
    return rows
      .map((r) => {
        const s = this.score(text, r.title, false);
        return s
          ? {
              entityType: "work" as const,
              entityId: String(r.id),
              entityName: r.title,
              ...s,
            }
          : null;
      })
      .filter(Boolean) as MatchCandidate[];
  }

  private async matchTracks(text: string, limit: number): Promise<MatchCandidate[]> {
    const rows = await prisma.tracks.findMany({
      where: { title: { contains: text, mode: "insensitive" } },
      take: limit * 3,
      select: { id: true, title: true },
    });
    return rows
      .map((r) => {
        const s = this.score(text, r.title, false);
        return s
          ? {
              entityType: "track" as const,
              entityId: String(r.id),
              entityName: r.title,
              ...s,
            }
          : null;
      })
      .filter(Boolean) as MatchCandidate[];
  }

  private async matchOrganizations(
    text: string,
    limit: number
  ): Promise<MatchCandidate[]> {
    const rows = await prisma.organizations.findMany({
      where: { name: { contains: text, mode: "insensitive" } },
      take: limit * 3,
      select: { id: true, name: true },
    });
    return rows
      .map((r) => {
        const s = this.score(text, r.name, false);
        return s
          ? {
              entityType: "organization" as const,
              entityId: String(r.id),
              entityName: r.name,
              ...s,
            }
          : null;
      })
      .filter(Boolean) as MatchCandidate[];
  }

  private async matchPersons(
    organizationId: string,
    text: string,
    limit: number
  ): Promise<MatchCandidate[]> {
    // individuals use int organization_id — search by name fields globally-ish
    const parts = text.split(/\s+/);
    const rows = await prisma.individuals.findMany({
      where: {
        OR: [
          { first_name: { contains: parts[0] || text, mode: "insensitive" } },
          { last_name: { contains: parts[parts.length - 1] || text, mode: "insensitive" } },
        ],
      },
      take: limit * 3,
      select: { id: true, first_name: true, last_name: true },
    });
    return rows
      .map((r) => {
        const name = `${r.first_name || ""} ${r.last_name || ""}`.trim();
        const s = this.score(text, name, false);
        return s
          ? {
              entityType: "person" as const,
              entityId: String(r.id),
              entityName: name,
              ...s,
            }
          : null;
      })
      .filter(Boolean) as MatchCandidate[];
  }

  /**
   * Resolve entity display name for validation.
   */
  async resolveEntityName(
    entityType: TargetEntityType,
    entityId: string,
    organizationId: string
  ): Promise<string | null> {
    const idNum = parseInt(entityId, 10);
    try {
      switch (entityType) {
        case "artist": {
          const r = await prisma.artists.findFirst({
            where: {
              id: idNum,
              organization_id: organizationId,
              is_deleted: false,
            },
            select: { name: true },
          });
          return r?.name ?? null;
        }
        case "release": {
          const r = await prisma.releases.findFirst({
            where: {
              id: idNum,
              organization_id: organizationId,
              is_deleted: false,
            },
            select: { title: true },
          });
          return r?.title ?? null;
        }
        case "work": {
          const r = await prisma.works.findFirst({
            where: {
              id: idNum,
              organization_id: organizationId,
              is_deleted: false,
            },
            select: { title: true },
          });
          return r?.title ?? null;
        }
        case "track": {
          const r = await prisma.tracks.findFirst({
            where: { id: idNum },
            select: { title: true },
          });
          return r?.title ?? null;
        }
        case "label": {
          const r = await prisma.labels.findFirst({
            where: { id: idNum },
            select: { name: true },
          });
          return r?.name ?? null;
        }
        case "publisher": {
          const r = await prisma.publishers.findFirst({
            where: { id: idNum },
            select: { name: true },
          });
          return r?.name ?? null;
        }
        case "organization": {
          const r = await prisma.organizations.findFirst({
            where: { id: idNum },
            select: { name: true },
          });
          return r?.name ?? null;
        }
        case "person": {
          const r = await prisma.individuals.findFirst({
            where: { id: idNum },
            select: { first_name: true, last_name: true },
          });
          return r ? `${r.first_name || ""} ${r.last_name || ""}`.trim() : null;
        }
        case "contract": {
          const r = await prisma.contracts.findFirst({
            where: { id: idNum },
            select: { title: true, contract_number: true },
          });
          return r?.title || r?.contract_number || null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
}

export const matchingService = new MatchingService();
