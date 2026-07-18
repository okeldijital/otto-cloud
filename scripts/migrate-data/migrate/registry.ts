/**
 * Table migrator registry — modular per-domain entry points.
 * Each module documents strategy; the engine performs the actual write.
 */

import { IMPORT_ORDER, type TableMapEntry } from "../table-config";
import type { DataMigrateConfig } from "../config";
import { paths } from "../config";
import { readJson } from "../utils";

export interface MigratorModule {
  /** Logical name */
  name: string;
  /** Tables this module owns (import order subset) */
  tables: string[];
  description: string;
}

export const MIGRATOR_MODULES: MigratorModule[] = [
  {
    name: "organizations",
    tables: ["organizations"],
    description: "Foundation orgs (int PK preserved)",
  },
  {
    name: "users",
    tables: ["users", "roles", "permissions", "role_permissions", "user_roles", "teams", "team_members"],
    description: "Users & RBAC",
  },
  {
    name: "contacts",
    tables: ["individuals", "individual_organizations"],
    description: "CRM individuals / contacts",
  },
  {
    name: "labels",
    tables: ["labels", "pros", "publishers", "platforms"],
    description: "Labels, PROs, publishers, platforms",
  },
  {
    name: "artists",
    tables: ["artists", "artist_memberships"],
    description: "Artists & memberships",
  },
  {
    name: "works",
    tables: ["works"],
    description: "Musical works",
  },
  {
    name: "releases",
    tables: ["releases"],
    description: "Releases",
  },
  {
    name: "tracks",
    tables: ["tracks", "track_releases"],
    description: "Tracks & release links",
  },
  {
    name: "contracts",
    tables: [
      "contracts",
      "contract_parties",
      "contract_assets",
      "contract_documents",
      "contract_track_links",
      "contract_split_groups",
      "contract_splits",
      "contract_songwriter_release_links",
    ],
    description: "Contracts & related",
  },
  {
    name: "documents",
    tables: [
      "documents",
      "office_documents",
      "office_document_links",
      "office_notes",
      "office_note_links",
      "works_admin",
      "works_admin_documents",
    ],
    description: "Documents & office files metadata",
  },
  {
    name: "royalties",
    tables: ["royalties"],
    description: "Royalty lines",
  },
  {
    name: "administration",
    tables: [
      "tasks",
      "status_quo_items",
      "activities",
      "audit_logs",
      "events",
      "notes",
      "playlists",
      "network_relationships",
      "report_definitions",
      "report_runs",
      "report_artifacts",
    ],
    description: "Admin / activity / reports",
  },
];

/** Resolve ordered list of { key, source } for migration, respecting table-map strategies. */
export function resolveMigrationPlan(
  config: DataMigrateConfig,
): Array<{ key: string; source: string; module: string }> {
  const tableMap = readJson<Record<string, TableMapEntry>>(
    paths(config).tableMap,
    {},
  );

  const plan: Array<{ key: string; source: string; module: string }> = [];
  const seen = new Set<string>();

  const moduleFor = (table: string): string => {
    for (const m of MIGRATOR_MODULES) {
      if (m.tables.includes(table)) return m.name;
    }
    return "generic";
  };

  for (const key of IMPORT_ORDER) {
    if (seen.has(key)) continue;
    const entry = tableMap[key];
    if (entry && (entry.strategy === "ignored" || entry.strategy === "deprecated")) {
      continue;
    }
    if (entry?.phase === "attachments") continue;
    seen.add(key);
    plan.push({
      key,
      source: entry?.source ?? key,
      module: moduleFor(key),
    });
  }

  // Any additional direct/transform tables in map not in IMPORT_ORDER
  for (const [key, entry] of Object.entries(tableMap)) {
    if (seen.has(key)) continue;
    if (entry.strategy === "ignored" || entry.strategy === "deprecated") continue;
    if (entry.phase === "attachments" || entry.phase === "ai" || entry.phase === "workspace") {
      continue;
    }
    plan.push({ key, source: entry.source, module: moduleFor(key) });
    seen.add(key);
  }

  return plan;
}
