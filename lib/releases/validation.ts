export const RELEASE_TYPES = ["Single", "EP", "Album", "Compilation", "Mixtape"] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

export function isReleaseType(value: unknown): value is ReleaseType {
  return typeof value === "string" && (RELEASE_TYPES as readonly string[]).includes(value);
}

const CATALOG_NUMBER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,31}$/;
const UPC_RE = /^(?:\d{12}|\d{13})$/;

export function validateReleaseMetadata(input: Record<string, unknown>, mode: "create" | "update" = "create") {
  const errors: Record<string, string> = {};

  if (mode === "create" || input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim()) errors.title = "Title is required.";
    else if (input.title.trim().length > 255) errors.title = "Title must be 255 characters or fewer.";
  }

  if (mode === "create" || input.release_type !== undefined) {
    if (!isReleaseType(input.release_type)) errors.release_type = "Release type must be Single, EP, Album, Compilation, or Mixtape.";
  }

  if (input.catalog_number !== undefined && input.catalog_number !== null && input.catalog_number !== "") {
    if (typeof input.catalog_number !== "string" || !CATALOG_NUMBER_RE.test(input.catalog_number.trim())) {
      errors.catalog_number = "Catalog number must be 2–32 characters using letters, numbers, dots, underscores, or hyphens.";
    }
  }

  if (input.upc_code !== undefined && input.upc_code !== null && input.upc_code !== "") {
    if (typeof input.upc_code !== "string" || !UPC_RE.test(input.upc_code)) {
      errors.upc_code = "UPC must contain exactly 12 or 13 digits.";
    }
  }

  if (input.release_date !== undefined && input.release_date !== null && input.release_date !== "") {
    if (typeof input.release_date !== "string" || Number.isNaN(Date.parse(input.release_date))) {
      errors.release_date = "Release date must be a valid ISO date.";
    }
  }

  if (input.artwork_url !== undefined && input.artwork_url !== null && input.artwork_url !== "") {
    if (typeof input.artwork_url !== "string" || input.artwork_url.length > 1000) errors.artwork_url = "Artwork URL must be 1000 characters or fewer.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
