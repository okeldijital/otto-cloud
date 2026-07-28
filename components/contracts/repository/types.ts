/** Shared types for Contract Center Document Repository UI (M2.2). */

export interface RepositoryDocument {
  relationshipId: string;
  relationshipType: string;
  linkedAt: string;
  linkedBy: number | null;
  document: {
    id: string;
    originalFilename: string;
    extension: string | null;
    mimeType: string;
    fileSize: number;
    checksum: string;
    uploadedBy: number | null;
    uploadedByName?: string | null;
    uploadedAt: string;
    deletedAt: string | null;
    status: "active" | "deleted";
    storageProvider: string;
  };
}

export type SortOption =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "size_desc"
  | "size_asc"
  | "uploader";

export interface RepositoryFilters {
  filename: string;
  type: string;
  status: "all" | "active" | "deleted";
  uploadedFrom: string;
  uploadedTo: string;
  uploadedBy: string;
}

export type UploadItemStatus =
  | "queued"
  | "uploading"
  | "success"
  | "error"
  | "cancelled";

export interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: UploadItemStatus;
  error?: string;
  abortController?: AbortController;
}

export const DEFAULT_FILTERS: RepositoryFilters = {
  filename: "",
  type: "",
  status: "active",
  uploadedFrom: "",
  uploadedTo: "",
  uploadedBy: "",
};

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  name_asc: "Filename A–Z",
  name_desc: "Filename Z–A",
  size_desc: "Largest",
  size_asc: "Smallest",
  uploader: "Uploaded By",
};
