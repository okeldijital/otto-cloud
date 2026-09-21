"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Plus, Search, Trash2, X } from "lucide-react";
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

  const search = async () => {
    if (query.trim().length < 2) return;
    try {
      setSearching(true);
      setError("");
      const res = await api.post(`/contracts/${contractId}/relationship-suggestions`, {
        action: "search",
        q: query.trim(),
        entityType: searchType,
      });
      setResults(res.data?.data?.results || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Search failed.");
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
      subtitle="Connect this contract to the catalogue and network records it governs or references."
      headerAction={
        <Button variant="primary" size="sm" onClick={() => setAdding((current) => !current)}>
          {adding ? <X size={14} /> : <Plus size={14} />}
          {adding ? "Close" : "Add Connection"}
        </Button>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        {adding && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_auto] gap-2">
              <select
                className="input w-full"
                value={searchType}
                onChange={(e) => { setSearchType(e.target.value as typeof searchType); setResults([]); }}
              >
                {TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
              </select>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  className="input w-full pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
                  placeholder={`Search ${TYPE_LABELS[searchType].toLowerCase()}…`}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => void search()} disabled={searching || query.trim().length < 2}>
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </Button>
            </div>

            {results.length > 0 && (
              <div className="divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
                {results.map((result) => {
                  const key = `${result.entityType}:${result.entityId}`;
                  const alreadyLinked = visibleRelationships.some(
                    (item) => String(item.targetEntityType).toLowerCase() === String(result.entityType).toLowerCase()
                      && String(item.targetEntityId) === String(result.entityId)
                  );
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 px-4 py-3 bg-white/[0.02]">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{result.entityName}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{TYPE_LABELS[String(result.entityType).toLowerCase()] || result.entityType}</p>
                      </div>
                      <Button
                        variant={alreadyLinked ? "secondary" : "primary"}
                        size="sm"
                        disabled={alreadyLinked || busy === key}
                        onClick={() => void link(result)}
                      >
                        {busy === key ? <Loader2 size={14} className="animate-spin" /> : alreadyLinked ? "Connected" : "Connect"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {visibleRelationships.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
            <Link2 size={24} className="mx-auto text-text-secondary mb-3" />
            <p className="text-sm text-text-secondary">No catalogue or network records are connected yet.</p>
            <p className="text-xs text-text-secondary/70 mt-1">Add the artist, label, publisher, release, works and tracks related to this contract.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {TYPES.map((type) => (
              <div key={type.key} className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">{type.label}</span>
                  <span className="text-xs text-text-secondary">{grouped[type.key].length}</span>
                </div>
                <div className="divide-y divide-white/5">
                  {grouped[type.key].length === 0 ? (
                    <div className="px-4 py-4 text-sm text-text-secondary/60">None connected.</div>
                  ) : grouped[type.key].map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
