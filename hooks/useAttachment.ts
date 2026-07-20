"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";

export type AttachmentInfo = {
  attachmentId: string;
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  category: string;
  downloadUrl: string;
  expiresIn: number;
};

type CacheEntry = {
  artwork: AttachmentInfo | null;
  fetchedAt: number;
  expiresIn: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<AttachmentInfo | null>>();

function cacheKey(entityType: string, entityId: string | number) {
  return `${String(entityType).toLowerCase()}:${String(entityId)}`;
}

function isFresh(entry: CacheEntry): boolean {
  // Refresh 60s before signed URL expiry (default ~15 min)
  const ttlMs = Math.max(30_000, (entry.expiresIn - 60) * 1000);
  return Date.now() - entry.fetchedAt < ttlMs;
}

export async function fetchEntityArtwork(
  entityType: string,
  entityId: string | number
): Promise<AttachmentInfo | null> {
  const key = cacheKey(entityType, entityId);
  const cached = cache.get(key);
  if (cached && isFresh(cached)) return cached.artwork;

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data } = await api.get("/storage/entity", {
        params: { entityType, entityId: String(entityId) },
      });
      const artwork = (data?.artwork as AttachmentInfo | null) ?? null;
      cache.set(key, {
        artwork,
        fetchedAt: Date.now(),
        expiresIn: artwork?.expiresIn ?? 300,
      });
      return artwork;
    } catch {
      cache.set(key, { artwork: null, fetchedAt: Date.now(), expiresIn: 60 });
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export async function fetchEntityArtworkBatch(
  entityType: string,
  entityIds: Array<string | number>
): Promise<Record<string, AttachmentInfo>> {
  const ids = [...new Set(entityIds.map(String).filter(Boolean))];
  if (!ids.length) return {};

  const missing: string[] = [];
  const result: Record<string, AttachmentInfo> = {};

  for (const id of ids) {
    const key = cacheKey(entityType, id);
    const cached = cache.get(key);
    if (cached && isFresh(cached)) {
      if (cached.artwork) result[id] = cached.artwork;
    } else {
      missing.push(id);
    }
  }

  if (missing.length) {
    try {
      const { data } = await api.get("/storage/entity", {
        params: { entityType, ids: missing.join(",") },
      });
      const items = (data?.items || {}) as Record<string, AttachmentInfo>;
      for (const id of missing) {
        const artwork = items[id] ?? null;
        cache.set(cacheKey(entityType, id), {
          artwork,
          fetchedAt: Date.now(),
          expiresIn: artwork?.expiresIn ?? 300,
        });
        if (artwork) result[id] = artwork;
      }
    } catch {
      for (const id of missing) {
        cache.set(cacheKey(entityType, id), {
          artwork: null,
          fetchedAt: Date.now(),
          expiresIn: 60,
        });
      }
    }
  }

  return result;
}

/**
 * Resolve a signed download URL for an entity's primary attachment.
 * Returns null when none exists (use placeholder).
 */
export function useAttachment(
  entityType: string | null | undefined,
  entityId: string | number | null | undefined
) {
  const [artwork, setArtwork] = useState<AttachmentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gen = useRef(0);

  const refresh = useCallback(async () => {
    if (!entityType || entityId === null || entityId === undefined || entityId === "") {
      setArtwork(null);
      setLoading(false);
      return;
    }
    const my = ++gen.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEntityArtwork(entityType, entityId);
      if (my === gen.current) setArtwork(result);
    } catch (e: any) {
      if (my === gen.current) {
        setArtwork(null);
        setError(e?.message || "Failed to load media");
      }
    } finally {
      if (my === gen.current) setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const url = useMemo(() => artwork?.downloadUrl ?? null, [artwork]);

  return { artwork, url, loading, error, refresh };
}

/**
 * Batch hook for lists: returns map of entityId → downloadUrl
 */
export function useAttachmentMap(
  entityType: string,
  entityIds: Array<string | number>
) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const idsKey = entityIds.map(String).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const ids = entityIds.map(String).filter(Boolean);
    if (!ids.length) {
      setUrls({});
      return;
    }
    setLoading(true);
    fetchEntityArtworkBatch(entityType, ids)
      .then((map) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const [id, art] of Object.entries(map)) {
          next[id] = art.downloadUrl;
        }
        setUrls(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, idsKey]);

  return { urls, loading };
}
