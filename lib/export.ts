import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ExportEntity =
  | "artists" | "releases" | "tracks" | "works"
  | "labels" | "publishers" | "pros" | "contracts"
  | "royalties" | "individuals" | "organizations";

export type ExportFormat = "csv" | "xlsx" | "json";

interface ExportField {
  key: string;
  label: string;
  transform?: (val: any) => string;
}

const EXPORT_FIELDS: Record<ExportEntity, ExportField[]> = {
  artists: [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "aka", label: "AKA" },
    { key: "artist_kind", label: "Type" },
    { key: "nationality", label: "Nationality" },
    { key: "ipi_number", label: "IPI" },
    { key: "id_number", label: "ID Number" },
    { key: "contact_email", label: "Email" },
    { key: "contact_phone", label: "Phone" },
    { key: "label_id", label: "Label ID" },
    { key: "publisher_id", label: "Publisher ID" },
    { key: "pro_id", label: "PRO ID" },
    { key: "created_at", label: "Created", transform: (v) => v ? new Date(v).toISOString() : "" },
  ],
  releases: [
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "upc_code", label: "UPC" },
    { key: "release_type", label: "Type" },
    { key: "release_date", label: "Release Date", transform: (v) => v ? new Date(v).toISOString().split("T")[0] : "" },
    { key: "label_id", label: "Label ID" },
    { key: "artist_id", label: "Artist ID" },
    { key: "catalog_number", label: "Catalog #" },
    { key: "distributor_id", label: "Distributor ID" },
    { key: "streaming_link", label: "Streaming Link" },
  ],
  tracks: [
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "isrc_code", label: "ISRC" },
    { key: "duration", label: "Duration" },
    { key: "genre", label: "Genre" },
    { key: "release_id", label: "Release ID" },
    { key: "work_id", label: "Work ID" },
    { key: "release_date", label: "Release Date", transform: (v) => v ? new Date(v).toISOString().split("T")[0] : "" },
  ],
  works: [
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "iswc_code", label: "ISWC" },
    { key: "publisher_id", label: "Publisher ID" },
    { key: "pro_id", label: "PRO ID" },
  ],
  labels: [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "contact_email", label: "Email" },
    { key: "contact_phone", label: "Phone" },
    { key: "website", label: "Website" },
  ],
  publishers: [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "contact_email", label: "Email" },
    { key: "rights_type", label: "Rights Type" },
  ],
  pros: [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "territory", label: "Territory" },
  ],
  contracts: [
    { key: "id", label: "ID" },
    { key: "contract_number", label: "Contract #" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "type", label: "Type" },
    { key: "start_date", label: "Start Date", transform: (v) => v ? new Date(v).toISOString().split("T")[0] : "" },
    { key: "end_date", label: "End Date", transform: (v) => v ? new Date(v).toISOString().split("T")[0] : "" },
    { key: "territory", label: "Territory" },
    { key: "exclusivity", label: "Exclusivity", transform: (v) => v ? "Yes" : "No" },
  ],
  royalties: [
    { key: "id", label: "ID" },
    { key: "source", label: "Source" },
    { key: "amount", label: "Amount", transform: (v) => v?.toString() ?? "" },
    { key: "currency", label: "Currency" },
    { key: "artist_id", label: "Artist ID" },
    { key: "work_id", label: "Work ID" },
    { key: "track_id", label: "Track ID" },
    { key: "statement_date", label: "Statement Date", transform: (v) => v ? new Date(v).toISOString().split("T")[0] : "" },
  ],
  individuals: [
    { key: "id", label: "ID" },
    { key: "first_name", label: "First Name" },
    { key: "last_name", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
  ],
  organizations: [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "org_type", label: "Type" },
    { key: "website", label: "Website" },
  ],
};

function prismaModel(entity: ExportEntity): any {
  const map: Record<string, string> = {
    artists: "artists", releases: "releases", tracks: "tracks",
    works: "works", labels: "labels", publishers: "publishers",
    pros: "pros", contracts: "contracts", royalties: "royalties",
    individuals: "individuals", organizations: "organizations",
  };
  return (prisma as any)[map[entity]];
}

interface ExportOptions {
  orgId?: string | number;
  query?: string;
  ids?: number[];
}

async function fetchData(entity: ExportEntity, options: ExportOptions): Promise<any[]> {
  const model = prismaModel(entity);
  const where: any = {};
  if (options.orgId !== undefined) {
    if (entity === "individuals" || entity === "organizations") {
      where.organization_id = options.orgId;
    } else if (entity !== "labels" && entity !== "publishers" && entity !== "pros") {
      where.organization_id = options.orgId;
    }
  }
  if (entity !== "labels" && entity !== "publishers" && entity !== "pros") {
    where.is_deleted = false;
  }
  if (options.ids?.length) where.id = { in: options.ids };
  if (options.query) {
    const nameField = ["name", "title", "first_name"].find((f) =>
      ["artists", "releases", "tracks", "works", "labels", "publishers", "pros", "contracts", "individuals"].includes(entity)
    );
    if (nameField) {
      where.OR = [{ [nameField]: { contains: options.query, mode: "insensitive" } }];
    }
  }
  return model.findMany({ where, orderBy: { id: "asc" } });
}

function flattenRow(item: any, fields: ExportField[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (const field of fields) {
    const val = item[field.key];
    row[field.label] = field.transform ? field.transform(val) : val !== null && val !== undefined ? String(val) : "";
  }
  return row;
}

export async function exportData(
  entity: ExportEntity,
  format: ExportFormat,
  options: ExportOptions = {}
): Promise<{ data: any; mime: string; filename: string }> {
  const fields = EXPORT_FIELDS[entity];
  const records = await fetchData(entity, options);
  const rows = records.map((r) => flattenRow(r, fields));

  const filename = `${entity}_${new Date().toISOString().split("T")[0]}`;

  if (format === "json") {
    return {
      data: rows,
      mime: "application/json",
      filename: `${filename}.json`,
    };
  }

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, entity);
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return {
      data: buf,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${filename}.xlsx`,
    };
  }

  const csv = Papa.unparse(rows);
  return {
    data: csv,
    mime: "text/csv",
    filename: `${filename}.csv`,
  };
}
