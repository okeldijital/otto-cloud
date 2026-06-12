import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ImportEntity =
  | "artists" | "releases" | "tracks" | "works"
  | "labels" | "publishers" | "contracts"
  | "individuals" | "organizations";

interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "date";
}

const IMPORT_FIELDS: Record<ImportEntity, ImportField[]> = {
  artists: [
    { key: "name", label: "Name", required: true },
    { key: "aka", label: "AKA" },
    { key: "artist_kind", label: "Type" },
    { key: "nationality", label: "Nationality" },
    { key: "ipi_number", label: "IPI" },
    { key: "id_number", label: "ID Number" },
    { key: "contact_email", label: "Email" },
    { key: "contact_phone", label: "Phone" },
  ],
  releases: [
    { key: "title", label: "Title", required: true },
    { key: "upc_code", label: "UPC" },
    { key: "release_type", label: "Type" },
    { key: "release_date", label: "Release Date", type: "date" },
    { key: "catalog_number", label: "Catalog #" },
    { key: "label_id", label: "Label ID", type: "number" },
    { key: "artist_id", label: "Artist ID", type: "number" },
  ],
  tracks: [
    { key: "title", label: "Title", required: true },
    { key: "isrc_code", label: "ISRC" },
    { key: "duration", label: "Duration" },
    { key: "genre", label: "Genre" },
    { key: "release_id", label: "Release ID", type: "number" },
    { key: "work_id", label: "Work ID", type: "number" },
  ],
  works: [
    { key: "title", label: "Title", required: true },
    { key: "iswc_code", label: "ISWC" },
    { key: "publisher_id", label: "Publisher ID", type: "number" },
    { key: "pro_id", label: "PRO ID", type: "number" },
  ],
  labels: [
    { key: "name", label: "Name", required: true },
    { key: "code", label: "Code" },
    { key: "contact_email", label: "Email" },
    { key: "contact_phone", label: "Phone" },
    { key: "website", label: "Website" },
  ],
  publishers: [
    { key: "name", label: "Name", required: true },
    { key: "code", label: "Code" },
    { key: "rights_type", label: "Rights Type" },
    { key: "contact_email", label: "Email" },
  ],
  contracts: [
    { key: "title", label: "Title", required: true },
    { key: "contract_number", label: "Contract #" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "end_date", label: "End Date", type: "date" },
    { key: "territory", label: "Territory" },
    { key: "exclusivity", label: "Exclusivity", type: "boolean" },
  ],
  individuals: [
    { key: "first_name", label: "First Name", required: true },
    { key: "last_name", label: "Last Name", required: true },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
  ],
  organizations: [
    { key: "name", label: "Name", required: true },
    { key: "org_type", label: "Type" },
    { key: "website", label: "Website" },
  ],
};

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

function prismaModel(entity: ImportEntity): any {
  const map: Record<string, string> = {
    artists: "artists", releases: "releases", tracks: "tracks",
    works: "works", labels: "labels", publishers: "publishers",
    contracts: "contracts", individuals: "individuals",
    organizations: "organizations",
  };
  return (prisma as any)[map[entity]];
}

function coerceValue(val: string, field: ImportField): any {
  if (!val || val.trim() === "") return undefined;
  const v = val.trim();
  if (field.type === "number") {
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }
  if (field.type === "boolean") return v.toLowerCase() === "yes" || v.toLowerCase() === "true" || v === "1";
  if (field.type === "date") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return v;
}

export async function importData(
  entity: ImportEntity,
  orgId: string | number,
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [], warnings: [] };
  const fields = IMPORT_FIELDS[entity];
  const model = prismaModel(entity);

  let rows: Record<string, string>[] = [];
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "csv" || mimeType === "text/csv") {
    const parsed = Papa.parse(buffer.toString("utf-8"), { header: true, skipEmptyLines: true });
    rows = parsed.data as any[];
    if (parsed.errors.length) {
      for (const e of parsed.errors) result.warnings.push({ row: (e.row ?? 0) + 1, message: e.message });
    }
  } else if (ext === "xlsx" || ext === "xls" || mimeType.includes("spreadsheet")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
    rows = json as any[];
  } else if (ext === "json" || mimeType === "application/json") {
    const parsed = JSON.parse(buffer.toString("utf-8"));
    rows = Array.isArray(parsed) ? parsed : parsed.items || parsed.data || [];
  } else {
    result.errors.push({ row: 0, message: `Unsupported file format: ${ext || mimeType}` });
    return result;
  }

  if (!rows.length) {
    result.warnings.push({ row: 0, message: "No data rows found in file" });
    return result;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const missing = fields.filter((f) => f.required && (!row[f.label] || String(row[f.label]).trim() === ""));
    if (missing.length) {
      result.errors.push({
        row: rowNum,
        message: `Missing required fields: ${missing.map((f) => f.label).join(", ")}`,
      });
      continue;
    }

    const data: any = {};
    const orgField = ["individuals", "organizations"].includes(entity) ? "organization_id" : "organization_id";

    for (const field of fields) {
      const rawVal = row[field.label];
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
        data[field.key] = coerceValue(String(rawVal), field);
      }
    }

    data[orgField] = orgId;

    if (entity === "contracts") {
      if (!data.contract_number) data.contract_number = `IMP-${Date.now()}-${i}`;
      if (!data.status) data.status = "Draft";
    }

    try {
      await model.create({ data });
      result.imported++;
    } catch (err: any) {
      result.errors.push({
        row: rowNum,
        message: err.message || err.code || "Unknown error",
      });
    }
  }

  return result;
}
