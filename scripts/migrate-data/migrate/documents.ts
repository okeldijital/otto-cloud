/** Documents / office metadata — see registry + engine + table-config. */
export const MODULE = "documents" as const;
export const TABLES = [
  "documents",
  "office_documents",
  "office_document_links",
  "office_notes",
  "office_note_links",
  "works_admin",
  "works_admin_documents",
] as const;
