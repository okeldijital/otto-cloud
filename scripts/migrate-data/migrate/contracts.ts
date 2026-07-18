/** Contracts domain migrator — see registry + engine + table-config. */
export const MODULE = "contracts" as const;
export const TABLES = [
  "contracts",
  "contract_parties",
  "contract_assets",
  "contract_documents",
  "contract_track_links",
  "contract_split_groups",
  "contract_splits",
  "contract_songwriter_release_links",
] as const;
