"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import DeleteDialog from "./DeleteDialog";
import DocumentList, { DocumentListSkeleton } from "./DocumentList";
import ReplaceDialog from "./ReplaceDialog";
import RepositoryEmptyState from "./RepositoryEmptyState";
import RepositoryFilters from "./RepositoryFilters";
import RepositoryToolbar from "./RepositoryToolbar";
import UploadDialog from "./UploadDialog";
import UploadDropzone from "./UploadDropzone";
import UploadProgress from "./UploadProgress";
import {
  filterDocuments,
  friendlyUploadError,
  paginate,
  sortDocuments,
} from "./repositoryUtils";
import {
  DEFAULT_FILTERS,
  type RepositoryDocument,
  type RepositoryFilters as Filters,
  type SortOption,
  type UploadQueueItem,
} from "./types";

const PAGE_SIZE = 25;

interface Props {
  contractId: string | number;
}

function newUploadId() {
  return `up_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Contract Center Document Repository (Milestone 2.2).
 * Consumes ContractDocumentService HTTP APIs only — never StorageProvider.
 */
export default function DocumentRepository({ contractId }: Props) {
  const [items, setItems] = useState<RepositoryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [replaceTarget, setReplaceTarget] = useState<RepositoryDocument | null>(null);
  const [replaceQueue, setReplaceQueue] = useState<UploadQueueItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<RepositoryDocument | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      try {
        if (opts?.soft) setRefreshing(true);
        else setLoading(true);
        setError("");
        const res = await api.get(
          `/contracts/${contractId}/documents?includeDeleted=true`
        );
        const list = res.data?.data?.items ?? res.data?.items ?? [];
        setItems(Array.isArray(list) ? list : []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Unable to load repository."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contractId]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  const filteredSorted = useMemo(() => {
    return sortDocuments(filterDocuments(items, filters), sort);
  }, [items, filters, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => paginate(filteredSorted, Math.min(page, pageCount), PAGE_SIZE),
    [filteredSorted, page, pageCount]
  );

  const uploading =
    uploadQueue.some((q) => q.status === "uploading" || q.status === "queued") ||
    replaceQueue.some((q) => q.status === "uploading" || q.status === "queued");

  const runUpload = async (
    item: UploadQueueItem,
    setQueue: Dispatch<SetStateAction<UploadQueueItem[]>>
  ) => {
    const controller = new AbortController();
    setQueue((prev) =>
      prev.map((q) =>
        q.id === item.id
          ? { ...q, status: "uploading", progress: 5, abortController: controller, error: undefined }
          : q
      )
    );

    try {
      const fd = new FormData();
      fd.append("file", item.file);
      await api.post(`/contracts/${contractId}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
        onUploadProgress: (evt: any) => {
          if (evt.total) {
            const pct = Math.min(95, Math.round((evt.loaded / evt.total) * 95));
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: pct } : q))
            );
          }
        },
      });
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "success", progress: 100 } : q
        )
      );
      setSuccessMsg("Document uploaded successfully.");
      await load({ soft: true });
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "cancelled", error: "Upload cancelled." } : q
          )
        );
        return;
      }
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "error", error: friendlyUploadError(err) }
            : q
        )
      );
    }
  };

  const enqueueUploads = (
    files: File[],
    setQueue: Dispatch<SetStateAction<UploadQueueItem[]>>
  ) => {
    const next: UploadQueueItem[] = files.map((file) => ({
      id: newUploadId(),
      file,
      progress: 0,
      status: "queued" as const,
    }));
    setQueue((prev) => [...prev, ...next]);
    // Sequential processing (future-ready for multiple)
    void (async () => {
      for (const item of next) {
        await runUpload(item, setQueue);
      }
    })();
  };

  const cancelUpload = (
    id: string,
    setQueue: Dispatch<SetStateAction<UploadQueueItem[]>>
  ) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      item?.abortController?.abort();
      return prev.map((q) =>
        q.id === id ? { ...q, status: "cancelled", error: "Upload cancelled." } : q
      );
    });
  };

  const retryUpload = (
    id: string,
    queue: UploadQueueItem[],
    setQueue: Dispatch<SetStateAction<UploadQueueItem[]>>
  ) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;
    void runUpload(item, setQueue);
  };

  const onDownload = async (item: RepositoryDocument) => {
    setActionBusyId(item.document.id);
    setError("");
    try {
      const res = await api.get(
        `/contracts/${contractId}/documents/${item.document.id}/download`
      );
      const url = res.data?.data?.url;
      if (!url) throw new Error("No download URL");
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data?.data?.filename || item.document.originalFilename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccessMsg("Download started.");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to download."
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const onDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setActionBusyId(target.document.id);
    setError("");
    try {
      await api.delete(
        `/contracts/${contractId}/documents/${target.document.id}`
      );
      setSuccessMsg("Document removed.");
      await load({ soft: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to delete."
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const hasActiveFilters =
    filters.filename ||
    filters.type ||
    filters.status !== "active" ||
    filters.uploadedFrom ||
    filters.uploadedTo ||
    filters.uploadedBy;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Document Repository
        </h2>
        <p className="text-sm text-text-secondary">
          Manage immutable signed agreements for this contract. Replace creates a new
          document; originals are preserved.
        </p>
      </div>

      <UploadDropzone
        busy={uploading}
        onFiles={(files) => {
          setUploadOpen(true);
          enqueueUploads(files, setUploadQueue);
        }}
      />

      {uploadQueue.length > 0 && !uploadOpen && (
        <UploadProgress
          items={uploadQueue}
          onRetry={(id) => retryUpload(id, uploadQueue, setUploadQueue)}
          onCancel={(id) => cancelUpload(id, setUploadQueue)}
          onDismiss={(id) =>
            setUploadQueue((prev) => prev.filter((q) => q.id !== id))
          }
        />
      )}

      {error && (
        <div
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              className="mt-1 underline text-xs"
              onClick={() => {
                setError("");
                void load({ soft: true });
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          role="status"
        >
          {successMsg}
          <button
            type="button"
            className="ml-3 underline text-xs"
            onClick={() => setSuccessMsg("")}
          >
            Dismiss
          </button>
        </div>
      )}

      <RepositoryToolbar
        sort={sort}
        onSortChange={setSort}
        onUpload={() => setUploadOpen(true)}
        onRefresh={() => load({ soft: true })}
        refreshing={refreshing}
        total={items.length}
        visible={filteredSorted.length}
      />

      <RepositoryFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {loading ? (
        <DocumentListSkeleton />
      ) : filteredSorted.length === 0 ? (
        <RepositoryEmptyState
          filtered={items.length > 0 || !!hasActiveFilters}
          onUpload={() => setUploadOpen(true)}
        />
      ) : (
        <>
          <DocumentList
            items={pageItems}
            actionBusyId={actionBusyId}
            onDownload={onDownload}
            onReplace={(item) => {
              setReplaceTarget(item);
              setReplaceQueue([]);
            }}
            onDelete={setDeleteTarget}
          />

          {pageCount > 1 && (
            <nav
              className="flex items-center justify-between gap-3 pt-2"
              aria-label="Repository pagination"
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} /> Previous
              </Button>
              <span className="text-xs text-text-secondary">
                Page {Math.min(page, pageCount)} of {pageCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Next page"
              >
                Next <ChevronRight size={14} />
              </Button>
            </nav>
          )}
        </>
      )}

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        queue={uploadQueue}
        busy={uploading}
        onFiles={(files) => enqueueUploads(files, setUploadQueue)}
        onRetry={(id) => retryUpload(id, uploadQueue, setUploadQueue)}
        onCancel={(id) => cancelUpload(id, setUploadQueue)}
        onDismiss={(id) =>
          setUploadQueue((prev) => prev.filter((q) => q.id !== id))
        }
      />

      <ReplaceDialog
        document={replaceTarget}
        queue={replaceQueue}
        busy={replaceQueue.some(
          (q) => q.status === "uploading" || q.status === "queued"
        )}
        onClose={() => {
          if (!replaceQueue.some((q) => q.status === "uploading")) {
            setReplaceTarget(null);
            setReplaceQueue([]);
          }
        }}
        onFile={(file) => {
          enqueueUploads([file], setReplaceQueue);
        }}
        onRetry={(id) => retryUpload(id, replaceQueue, setReplaceQueue)}
        onCancel={(id) => cancelUpload(id, setReplaceQueue)}
        onDismiss={(id) =>
          setReplaceQueue((prev) => prev.filter((q) => q.id !== id))
        }
      />

      <DeleteDialog
        document={deleteTarget}
        onConfirm={onDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
