"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FileCheck2, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props { contractId: string | number; }

const TYPES = [
  { key: "artist", label: "Artist" },
  { key: "label", label: "Label" },
  { key: "publisher", label: "Publisher" },
  { key: "release", label: "Release" },
  { key: "work", label: "Works" },
  { key: "track", label: "Tracks" },
] as const;

const TYPE_LABELS = Object.fromEntries(TYPES.map((item) => [item.key, item.label]));

export default function ContractRelationshipsSection({ contractId }: Props) {
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState<(typeof TYPES)[number]["key"]>("artist");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/contracts/${contractId}/relationships`);
      setRelationships(res.data?.data?.relationships || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load contract connections.");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!adding) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError("");
      return;
    }
    if (trimmed.length < 2) {
      setResults([]);
      setError("");
      return;
    }

    const timer = window.setTimeout(() => {
      void search(trimmed);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [adding, query, searchType]);

  const visibleRelationships = useMemo(
    () => relationships.filter((item) => TYPES.some((type) => type.key === String(item.targetEntityType).toLowerCase())),
    [relationships]
  );

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const type of TYPES) map[type.key] = [];
    for (const item of visibleRelationships) {
      const key = String(item.targetEntityType || "").toLowerCase();
      if (map[key]) map[key].push(item);
    }
    return map;
  }, [visibleRelationships]);

  const searchCatalogFallback = async (type: string, q: string) => {
    const needle = q.trim().toLowerCase();
    const limit = needle ? 50 : 100;

    const normalize = (items: any[], nameKey: string) =>
      items
        .map((item: any) => ({
          entityType: type,
          entityId: String(item.id),
          entityName: item[nameKey] || item.name || item.title || `#${item.id}`,
          confidence: 0.99,
          strategy: "catalog",
          reason: "Existing catalogue record",
        }))
        .filter((item: any) => !needle || String(item.entityName).toLowerCase().includes(needle))
        .slice(0, 10);

    if (type === "artist") {
      const res = await api.get(`/artists?q=${encodeURIComponent(q)}&limit=${limit}`);
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return normalize(items, "name");
    }

    if (type === "track") {
      const res = await api.get(`/tracks?q=${encodeURIComponent(q)}&limit=${limit}`);
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return normalize(items, "title");
    }

    // These catalogue endpoints currently expose list pagination rather than
    // a dedicated q parameter, so filter the returned organization-scoped
    // records locally. This keeps the contract search behavior consistent.
    if (type === "release") {
      const res = await api.get(`/releases?limit=${limit}`);
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return normalize(items, "title");
    }

    if (type === "work") {
      const res = await api.get(`/works?limit=${limit}`);
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return normalize(items, "title");
    }

    if (type === "label") {
      const res = await api.get(`/labels?limit=${limit}`);
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return normalize(items, "name");
    }

    if (type === "publisher") {
      const res = await api.get(`/publishers?limit=${limit}`);
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return normalize(items, "name");
    }

    return [];
  };

  const search = async (value = query) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(trimmed ? "Enter at least 2 characters to search." : "");
      return;
    }

    try {
      setSearching(true);
      setError("");

      let nextResults: any[] = [];
      try {
        const res = await api.post(`/contracts/${contractId}/relationship-suggestions`, {
          action: "search",
          q: trimmed,
          entityType: searchType,
        });
        nextResults = res.data?.data?.results || [];
      } catch {
        // The catalog APIs below remain the fallback source of truth for
        // manually linking existing records.
      }

      if (nextResults.length === 0) {
        nextResults = await searchCatalogFallback(searchType, trimmed);
      }

      const deduped = nextResults.filter((result: any, index: number, list: any[]) =>
        list.findIndex(
          (item: any) =>
            String(item.entityType).toLowerCase() === String(result.entityType).toLowerCase() &&
            String(item.entityId) === String(result.entityId)
        ) === index
      );

      setResults(deduped.slice(0, 10));
      if (deduped.length === 0) {
        setError(`No ${TYPE_LABELS[searchType].toLowerCase()} records matched "${trimmed}".`);
      }
    } catch (err: any) {
      setResults([]);
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        `Unable to search ${TYPE_LABELS[searchType].toLowerCase()} records.`
      );
    } finally {
      setSearching(false);
    }
  };

  const link = async (target: any) => {
    const key = `${target.entityType}:${target.entityId}`;
    try {
      setBusy(key);
      setError("");
      await api.post(`/contracts/${contractId}/relationships`, {
        relationshipType: "references",
        targetEntityType: target.entityType,
        targetEntityId: target.entityId,
        targetEntityName: target.entityName,
      });
      setResults([]);
      setQuery("");
      setAdding(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to connect record.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (relationshipId: string) => {
    if (!window.confirm("Remove this connection from the contract?")) return;
    try {
      setBusy(relationshipId);
      setError("");
      await api.delete(`/contracts/${contractId}/relationships/${relationshipId}`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to remove connection.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-10 text-text-secondary"><Loader2 size={17} className="animate-spin" /> Loading connections…</div>;
  }

  return (
    <Card
      title="Connected Records"
      subtitle="Link the people and catalogue records this agreement applies to."
      headerAction={
        <Button variant="primary" size="sm" onClick={() => setAdding((current) => !current)}>
          {adding ? <X size={14} /> : <Plus size={14} />}
          {adding ? "Close" : "Add Connection"}
        </Button>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        {adding && (
          <div className="rounded-2xl border border-border bg-surface-elevated p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <select
                className="input w-full"
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value as typeof searchType);
                  setResults([]);
                  setError("");
                }}
                aria-label="Record type"
              >
                {TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
              </select>

              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  className="input w-full pl-9 pr-20"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void search();
                    }
                  }}
                  placeholder={`Search ${TYPE_LABELS[searchType].toLowerCase()}...`}
                  aria-label={`Search ${TYPE_LABELS[searchType].toLowerCase()}`}
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      setError("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                {searching && (
                  <Loader2 size={14} className="absolute right-9 top-1/2 -translate-y-1/2 animate-spin text-accent" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-xs text-text-secondary">
                {query.trim().length >= 2
                  ? searching ? `Searching ${TYPE_LABELS[searchType].toLowerCase()} records...` : `${results.length} result${results.length === 1 ? "" : "s"}`
                  : `Type at least 2 characters to search ${TYPE_LABELS[searchType].toLowerCase()} records.`}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void search()}
                disabled={searching || query.trim().length < 2}
              >
                <Search size={14} />
                Search
              </Button>
            </div>

            {results.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="divide-y divide-border">
                  {results.map((result) => {
                    const key = `${result.entityType}:${result.entityId}`;
                    const alreadyLinked = visibleRelationships.some(
                      (item) =>
                        String(item.targetEntityType).toLowerCase() === String(result.entityType).toLowerCase() &&
                        String(item.targetEntityId) === String(result.entityId)
                    );

                    return (
                      <div key={key} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-surface-elevated">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{result.entityName}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                            <span>{TYPE_LABELS[String(result.entityType).toLowerCase()] || result.entityType}</span>
                            {result.reason && <span className="truncate">· {result.reason}</span>}
                          </div>
                        </div>

                        <Button
                          variant={alreadyLinked ? "secondary" : "primary"}
                          size="sm"
                          disabled={alreadyLinked || busy === key}
                          onClick={() => void link(result)}
                        >
                          {busy === key ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : alreadyLinked ? (
                            <><Check size={14} /> Connected</>
                          ) : (
                            <><Plus size={14} /> Connect</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {visibleRelationships.length === 0 ? (
          <div className="rounded-xl border border-accent/20 bg-accent/[0.04] px-5 py-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <FileCheck2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary">Connect this contract to its records</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Start with the artist and release, then add any label, publisher, work or track covered by the agreement.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {TYPES.map((type) => (
                    <span key={type.key} className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-2xs font-semibold text-text-secondary">
                      {type.label}
                    </span>
                  ))}
                </div>
                <Button variant="primary" size="sm" className="mt-4" onClick={() => setAdding(true)}>
                  <Plus size={14} /> Add first connection
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {TYPES.map((type) => (
              <div key={type.key} className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">{type.label}</span>
                  <span className="text-xs text-text-secondary">{grouped[type.key].length}</span>
                </div>
                <div className="divide-y divide-white/5">
                  {grouped[type.key].length === 0 ? (
                    <div className="px-4 py-4 text-sm text-text-secondary/60">None connected.</div>
                  ) : grouped[type.key].map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{item.targetEntityName || `#${item.targetEntityId}`}</p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:text-danger hover:bg-danger/10"
                        aria-label={`Remove ${item.targetEntityName || "connection"}`}
                        onClick={() => void remove(item.id)}
                        disabled={busy === item.id}
                      >
                        {busy === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
