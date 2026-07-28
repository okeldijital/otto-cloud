import type { RepositoryDocument, RepositoryFilters, SortOption } from "./types";

export function mimeLabel(mime: string | null | undefined, ext: string | null): string {
  if (mime === "application/pdf" || ext === ".pdf") return "PDF";
  if (mime?.startsWith("image/")) return "Image";
  if (mime?.includes("word")) return "Word";
  if (ext) return ext.replace(".", "").toUpperCase();
  return mime || "File";
}

export function friendlyUploadError(err: unknown): string {
  const any = err as any;
  const code = any?.response?.data?.code as string | undefined;
  const message = any?.response?.data?.message as string | undefined;
  const errors = any?.response?.data?.errors as string[] | undefined;
  const status = any?.response?.status as number | undefined;

  if (status === 401 || status === 403 || code === "UNAUTHORIZED") {
    return "Permission denied.";
  }
  if (code === "CONTRACT_NOT_FOUND" || status === 404) {
    return "Contract not found.";
  }
  if (code === "VALIDATION_FAILED" || status === 400) {
    const detail = Array.isArray(errors) ? errors.join(" ") : message;
    if (detail?.toLowerCase().includes("mime") || detail?.toLowerCase().includes("extension")) {
      return "Unsupported file type. Please upload a PDF.";
    }
    if (detail?.toLowerCase().includes("size") || detail?.toLowerCase().includes("maximum")) {
      return "Maximum size exceeded. Files must be 50 MB or smaller.";
    }
    return detail || "Upload validation failed.";
  }
  if (any?.code === "ERR_CANCELED" || any?.name === "CanceledError") {
    return "Upload cancelled.";
  }
  return message || "Unable to upload. Please try again.";
}

export function filterDocuments(
  items: RepositoryDocument[],
  filters: RepositoryFilters
): RepositoryDocument[] {
  return items.filter((item) => {
    const d = item.document;
    if (filters.status !== "all" && d.status !== filters.status) return false;

    if (filters.filename.trim()) {
      const q = filters.filename.trim().toLowerCase();
      if (!d.originalFilename.toLowerCase().includes(q)) return false;
    }

    if (filters.type.trim()) {
      const t = filters.type.trim().toLowerCase();
      const label = mimeLabel(d.mimeType, d.extension).toLowerCase();
      const mime = (d.mimeType || "").toLowerCase();
      const ext = (d.extension || "").toLowerCase();
      if (!label.includes(t) && !mime.includes(t) && !ext.includes(t)) return false;
    }

    if (filters.uploadedBy.trim()) {
      const q = filters.uploadedBy.trim().toLowerCase();
      const name = (d.uploadedByName || "").toLowerCase();
      const id = d.uploadedBy != null ? String(d.uploadedBy) : "";
      if (!name.includes(q) && !id.includes(q)) return false;
    }

    if (filters.uploadedFrom) {
      const from = new Date(filters.uploadedFrom).getTime();
      if (!Number.isNaN(from) && new Date(d.uploadedAt).getTime() < from) return false;
    }
    if (filters.uploadedTo) {
      const to = new Date(filters.uploadedTo);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        if (new Date(d.uploadedAt).getTime() > to.getTime()) return false;
      }
    }

    return true;
  });
}

export function sortDocuments(
  items: RepositoryDocument[],
  sort: SortOption
): RepositoryDocument[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const da = a.document;
    const db = b.document;
    switch (sort) {
      case "oldest":
        return new Date(da.uploadedAt).getTime() - new Date(db.uploadedAt).getTime();
      case "name_asc":
        return da.originalFilename.localeCompare(db.originalFilename, undefined, {
          sensitivity: "base",
        });
      case "name_desc":
        return db.originalFilename.localeCompare(da.originalFilename, undefined, {
          sensitivity: "base",
        });
      case "size_desc":
        return db.fileSize - da.fileSize;
      case "size_asc":
        return da.fileSize - db.fileSize;
      case "uploader": {
        const ua = da.uploadedByName || String(da.uploadedBy ?? "");
        const ub = db.uploadedByName || String(db.uploadedBy ?? "");
        return ua.localeCompare(ub, undefined, { sensitivity: "base" });
      }
      case "newest":
      default:
        return new Date(db.uploadedAt).getTime() - new Date(da.uploadedAt).getTime();
    }
  });
  return copy;
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
