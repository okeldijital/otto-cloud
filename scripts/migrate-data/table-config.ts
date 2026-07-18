/**
 * Per-table transform configuration + import order.
 * Driven by migration/table-map.json strategies; detailed field rules live here.
 */

import type { IdMapper } from "./mapping";
import { ENTITY_KEYS } from "./mapping";
import type { Json } from "./utils";

export type Strategy =
  | "direct"
  | "transform"
  | "merge"
  | "split"
  | "deprecated"
  | "ignored";

export interface TableMapEntry {
  source: string;
  target: string;
  /** Prisma client delegate key when different from target (e.g. user → users table) */
  prismaDelegate?: string;
  strategy: Strategy;
  phase:
    | "foundation"
    | "crm"
    | "catalog"
    | "contracts"
    | "administration"
    | "financial"
    | "attachments"
    | "ai"
    | "workspace"
    | "system";
  notes?: string;
  identityEntity?: string;
}

export interface TableConfig {
  jsonFields?: string[];
  dateFields?: string[];
  boolFields?: string[];
  renameFields?: Record<string, string>;
  dropFields?: string[];
  staticFields?: Record<string, Json | (() => Json)>;
  /**
   * FK column → entity key in IdMapper.
   * required=true skips row if unmapped.
   */
  fk?: Record<string, { entity: string; required?: boolean }>;
  /** Preserve source id via upsert(where: { id }) when true (default). */
  preserveId?: boolean;
  transform?: (
    row: Record<string, unknown>,
    ctx: { idMapper: IdMapper; cloudOrgUuid: string },
  ) => Record<string, unknown> | null;
}

/** Models whose organization_id is INTEGER (not cloud UUID string). */
export const INT_ORG_MODELS = new Set<string>([
  "contracts",
  "audit_logs",
  "individuals",
  "ai_core_write_proposal_runs",
  "ai_core_write_proposal_items",
  "ai_core_write_apply_events",
  "admin_backup_artifacts",
  "admin_restore_audit",
  "contract_assets",
  "contract_documents",
  "contract_parties",
  "contract_track_links",
  "contract_splits",
  "contract_split_groups",
  "contract_songwriter_release_links",
  "report_runs",
  "report_artifacts",
]);

export const TABLE_CONFIG: Record<string, TableConfig> = {
  organizations: {
    transform: (row) => {
      row.organization_id = row.id;
      return row;
    },
  },
  users: {
    renameFields: { full_name: "name" },
  },
  user: {
    renameFields: { full_name: "name" },
  },
  labels: { jsonFields: ["artist_ids"] },
  pros: {},
  publishers: { jsonFields: ["artist_ids"] },
  platforms: {},
  individuals: {},
  individual_organizations: {
    fk: {
      individual_id: { entity: ENTITY_KEYS.individuals, required: true },
      organization_id: { entity: ENTITY_KEYS.organizations },
    },
  },
  artists: {
    jsonFields: ["banking_details", "streaming_links", "social_media"],
    fk: {
      label_id: { entity: ENTITY_KEYS.labels },
      publisher_id: { entity: ENTITY_KEYS.publishers },
      pro_id: { entity: ENTITY_KEYS.pros },
    },
    /**
     * Unique-name collisions (smoke/test duplicates) are resolved in the engine
     * by mapping source id → existing cloud row with the same name.
     */
  },
  works: {
    jsonFields: ["composers", "arrangers"],
    fk: {
      publisher_id: { entity: ENTITY_KEYS.publishers },
      pro_id: { entity: ENTITY_KEYS.pros },
    },
  },
  releases: {
    jsonFields: ["artist_ids", "credits"],
    fk: {
      label_id: { entity: ENTITY_KEYS.labels },
      artist_id: { entity: ENTITY_KEYS.artists },
      distributor_id: { entity: ENTITY_KEYS.organizations },
    },
    transform: (row) => {
      // Detect column-shifted / corrupt desktop rows (e.g. contract JSON in date field)
      const corrupt =
        row.organization_id === "CREATE" ||
        typeof row.is_deleted === "string" ||
        (row.artist_id != null && typeof row.artist_id === "string" && /[-:]/.test(String(row.artist_id))) ||
        (typeof row.release_date === "string" && row.release_date.trim().startsWith("{"));
      if (corrupt) {
        row.title =
          row.title && String(row.title).trim()
            ? String(row.title).slice(0, 255)
            : `Legacy corrupt release #${row.id ?? "?"}`;
        row.is_deleted = true;
        row.artist_id = null;
        row.label_id = null;
        row.distributor_id = null;
        row.upc_code = null;
        row.catalog_number = null;
        row.release_id = null;
        row.release_date = null;
        row.release_type = null;
        row.cover_art_url = null;
        row.streaming_link = null;
        row.artist_ids = null;
        row.credits = null;
        return row;
      }

      // Unique columns: empty string and placeholder junk → null
      for (const col of ["upc_code", "catalog_number", "release_id"] as const) {
        const v = row[col];
        if (v === "" || v === "0" || v === 0) row[col] = null;
        // Oversize numeric "upc" values from bad data
        if (typeof v === "number" && v > Number.MAX_SAFE_INTEGER) row[col] = null;
        if (typeof v === "string" && v.length > 50) row[col] = null;
      }
      if (row.artist_id != null && !Number.isFinite(Number(row.artist_id))) {
        row.artist_id = null;
      }
      if (typeof row.title === "string" && row.title.length > 255) {
        row.title = row.title.slice(0, 255);
      }
      if (!row.title || String(row.title).trim() === "") {
        row.title = `Untitled Release ${row.id ?? ""}`.trim();
      }
      return row;
    },
  },
  tracks: {
    jsonFields: ["artist_ids", "credits"],
    dateFields: ["duration", "release_date"],
    fk: {
      release_id: { entity: ENTITY_KEYS.releases },
      work_id: { entity: ENTITY_KEYS.works },
    },
  },
  track_releases: {
    fk: {
      track_id: { entity: ENTITY_KEYS.tracks, required: true },
      release_id: { entity: ENTITY_KEYS.releases, required: true },
    },
  },
  contracts: {
    // organization_id handled in engine with fallback for orphan / oversize org ids
    fk: {
      created_by: { entity: ENTITY_KEYS.users },
    },
    transform: (row) => {
      if (!row.contract_number || String(row.contract_number).trim() === "") {
        row.contract_number = `MIG-${row.id ?? Date.now()}`;
      }
      if (!row.title || String(row.title).trim() === "") {
        row.title = `Contract ${row.contract_number}`;
      }
      if (!row.status) row.status = "Draft";
      // ensure unique contract_number within org when smoke tests reuse numbers
      return row;
    },
  },
  contract_parties: {
    fk: {
      contract_id: { entity: ENTITY_KEYS.contracts, required: true },
      // organization_id uses INT_ORG fallback in engine
    },
  },
  contract_assets: {
    fk: {
      contract_id: { entity: ENTITY_KEYS.contracts, required: true },
      organization_id: { entity: ENTITY_KEYS.organizations },
    },
  },
  contract_documents: {
    fk: {
      contract_id: { entity: ENTITY_KEYS.contracts, required: true },
      organization_id: { entity: ENTITY_KEYS.organizations },
      uploaded_by: { entity: ENTITY_KEYS.users },
    },
  },
  contract_track_links: {
    fk: {
      contract_id: { entity: ENTITY_KEYS.contracts, required: true },
      track_id: { entity: ENTITY_KEYS.tracks, required: true },
    },
  },
  documents: { jsonFields: ["tags"] },
  tasks: {
    fk: {
      assigned_to_user_id: { entity: ENTITY_KEYS.users },
      created_by_user_id: { entity: ENTITY_KEYS.users },
    },
  },
  status_quo_items: {},
  activities: { fk: { user_id: { entity: ENTITY_KEYS.users } } },
  audit_logs: { jsonFields: ["changes"] },
  royalties: {
    fk: {
      artist_id: { entity: ENTITY_KEYS.artists },
      work_id: { entity: ENTITY_KEYS.works },
      track_id: { entity: ENTITY_KEYS.tracks },
    },
  },
  events: {},
  notes: { jsonFields: ["tags", "attachments"] },
  office_documents: {
    fk: { uploaded_by_user_id: { entity: ENTITY_KEYS.users } },
  },
  office_document_links: {},
  office_notes: { fk: { created_by_user_id: { entity: ENTITY_KEYS.users } } },
  office_note_links: {},
  playlists: {
    jsonFields: ["track_ids"],
    fk: { created_by: { entity: ENTITY_KEYS.users } },
  },
  network_relationships: {},
  artist_memberships: {
    fk: {
      group_id: { entity: ENTITY_KEYS.artists, required: true },
      member_id: { entity: ENTITY_KEYS.artists, required: true },
    },
  },
  roles: {},
  permissions: {},
  role_permissions: {},
  user_roles: {
    fk: {
      user_id: { entity: ENTITY_KEYS.users },
    },
  },
  teams: {},
  team_members: {
    fk: { user_id: { entity: ENTITY_KEYS.users } },
  },
  works_admin: {
    fk: {
      work_id: { entity: ENTITY_KEYS.works },
      created_by: { entity: ENTITY_KEYS.users },
    },
  },
  works_admin_documents: {
    fk: { uploaded_by: { entity: ENTITY_KEYS.users } },
  },
  report_definitions: {
    fk: { created_by_user_id: { entity: ENTITY_KEYS.users } },
  },
  report_runs: {
    fk: { requested_by_user_id: { entity: ENTITY_KEYS.users } },
  },
  report_artifacts: {},
  alembic_version: { preserveId: false },
};

/** Dependency-safe import order (table keys = SQLite / Prisma model names). */
export const IMPORT_ORDER: string[] = [
  // Foundation
  "organizations",
  "users",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
  "teams",
  "team_members",
  // CRM
  "individuals",
  "individual_organizations",
  // Catalog
  "labels",
  "pros",
  "publishers",
  "platforms",
  "artists",
  "artist_memberships",
  "works",
  "releases",
  "tracks",
  "track_releases",
  // Contracts
  "contracts",
  "contract_parties",
  "contract_assets",
  "contract_documents",
  "contract_track_links",
  "contract_split_groups",
  "contract_splits",
  "contract_songwriter_release_links",
  // Admin / docs
  "documents",
  "tasks",
  "status_quo_items",
  "activities",
  "audit_logs",
  "events",
  "notes",
  "office_documents",
  "office_document_links",
  "office_notes",
  "office_note_links",
  "playlists",
  "network_relationships",
  "works_admin",
  "works_admin_documents",
  "report_definitions",
  "report_runs",
  "report_artifacts",
  // Financial
  "royalties",
  // System
  "alembic_version",
];

export function identityEntityFor(table: string): string | undefined {
  const map: Record<string, string> = {
    organizations: ENTITY_KEYS.organizations,
    users: ENTITY_KEYS.users,
    user: ENTITY_KEYS.users,
    labels: ENTITY_KEYS.labels,
    publishers: ENTITY_KEYS.publishers,
    pros: ENTITY_KEYS.pros,
    artists: ENTITY_KEYS.artists,
    individuals: ENTITY_KEYS.individuals,
    works: ENTITY_KEYS.works,
    releases: ENTITY_KEYS.releases,
    tracks: ENTITY_KEYS.tracks,
    contracts: ENTITY_KEYS.contracts,
    documents: ENTITY_KEYS.documents,
    platforms: ENTITY_KEYS.platforms,
  };
  return map[table];
}

export function prismaDelegateFor(table: string): string {
  // Prisma client: model User → prisma.user; others match model name
  if (table === "users") return "user";
  return table;
}
