"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props {
  contractId: string | number;
}

/**
 * Relationships tab — suggestions + linked entities + manual link (Milestone 4.0).
 * AI suggests; only users create links.
 */
export default function ContractRelationshipsSection({ contractId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [relationships, setRelationships] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [canManage, setCanManage] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);

  // Manual link form
  const [searchQ, setSearchQ] = useState("");
  const [searchType, setSearchType] = useState("artist");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [relType, setRelType] = useState("represents");
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const [relRes, sugRes] = await Promise.all([
        api.get(`/contracts/${contractId}/relationships?includeHistory=true`),
        api.get(`/contracts/${contractId}/relationship-suggestions`),
      ]);
      setRelationships(relRes.data?.data?.relationships || []);
      setHistory(relRes.data?.data?.history || []);
      setMeta(relRes.data?.data?.meta || null);
      setCanManage(relRes.data?.data?.permissions?.canManage !== false);
      setSuggestions(sugRes.data?.data?.suggestions || []);
      if (relRes.data?.data?.meta?.relationshipTypes?.[0] && !relType) {
        setRelType(relRes.data.data.meta.relationshipTypes[0].value);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Unable to load relationships."
      );
    } finally {
      setLoading(false);
    }
  }, [contractId, relType]);

  useEffect(() => {
    void load();
  }, [load]);

  const discover = async () => {
    setDiscovering(true);
    setError("");
    try {
      const res = await api.post(
        `/contracts/${contractId}/relationship-suggestions`,
        {}
      );
      setSuccess(
        res.data?.data?.message ||
          `Generated ${(res.data?.data?.suggestions || []).length} suggestion(s).`
      );
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to generate suggestions. Ensure a verified contract exists."
      );
    } finally {
      setDiscovering(false);
    }
  };

  const accept = async (suggestionId: string) => {
    setBusyId(suggestionId);
    setError("");
    try {
      await api.post(`/contracts/${contractId}/relationships`, {
        action: "accept_suggestion",
        suggestionId,
      });
      setSuccess("Relationship created from suggestion.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to accept suggestion.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (suggestionId: string) => {
    setBusyId(suggestionId);
    setError("");
    try {
      await api.post(`/contracts/${contractId}/relationships`, {
        action: "reject_suggestion",
        suggestionId,
      });
      setSuccess("Suggestion rejected.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to reject suggestion.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (relationshipId: string) => {
    if (!window.confirm("Remove this relationship?")) return;
    setBusyId(relationshipId);
    setError("");
    try {
      await api.delete(
        `/contracts/${contractId}/relationships/${relationshipId}`
      );
      setSuccess("Relationship removed.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to remove relationship.");
    } finally {
      setBusyId(null);
    }
  };

  const runSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await api.post(
        `/contracts/${contractId}/relationship-suggestions`,
        { action: "search", q: searchQ.trim(), entityType: searchType }
      );
      setSearchResults(res.data?.data?.results || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const createManual = async (target: any) => {
    setBusyId(`${target.entityType}:${target.entityId}`);
    setError("");
    try {
      await api.post(`/contracts/${contractId}/relationships`, {
        relationshipType: relType,
        targetEntityType: target.entityType,
        targetEntityId: target.entityId,
        targetEntityName: target.entityName,
      });
      setSuccess(`Linked ${target.entityName}.`);
      setSearchResults([]);
      setSearchQ("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to create link.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = suggestions.filter((s) => s.status === "pending");
  const decided = suggestions.filter((s) => s.status !== "pending");

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-text-secondary gap-2 items-center">
        <Loader2 className="animate-spin" size={18} /> Loading relationships…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Relationships
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Suggestions come from the verified contract. Only users create links.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={discover}
            disabled={discovering}
          >
            {discovering ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}{" "}
            Discover
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? "Hide history" : "History"}
          </Button>
        </div>
      </div>

      {!canManage && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary">
          View-only: you can inspect relationships but cannot create or remove them.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
          <button
            type="button"
            className="ml-3 underline text-xs"
            onClick={() => setSuccess("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Suggestions */}
      <Card title="Suggested relationships">
        {pending.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No pending suggestions. Run Discover after a verified contract exists, or
            link manually below.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((s) => (
              <li
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm text-white">
                      {s.targetEntityName || s.targetEntityId}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {s.targetEntityType}
                    </Badge>
                    <Badge variant="primary" size="sm">
                      {s.relationshipType}
                    </Badge>
                    <Badge
                      variant={
                        s.confidence >= 0.9
                          ? "success"
                          : s.confidence >= 0.8
                            ? "warn"
                            : "critical"
                      }
                      size="sm"
                    >
                      {Math.round((s.confidence || 0) * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {s.reason || s.matchStrategy} · source “{s.sourceText}”
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busyId === s.id}
                      onClick={() => accept(s.id)}
                    >
                      <Check size={14} /> Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === s.id}
                      onClick={() => reject(s.id)}
                    >
                      <X size={14} /> Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {decided.length > 0 && (
          <p className="text-xs text-text-secondary mt-3">
            {decided.filter((s) => s.status === "accepted").length} accepted ·{" "}
            {decided.filter((s) => s.status === "rejected").length} rejected earlier
          </p>
        )}
      </Card>

      {/* Linked */}
      <Card title="Linked entities">
        {relationships.length === 0 ? (
          <p className="text-sm text-text-secondary">No active relationships.</p>
        ) : (
          <ul className="space-y-2">
            {relationships.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-success/20 bg-success/5 p-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link2 size={14} className="text-success" />
                    <span className="font-medium text-sm">
                      {r.targetEntityName || r.targetEntityId}
                    </span>
                    <Badge variant="success" size="sm">
                      {r.targetEntityType}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      {r.relationshipTypeLabel || r.relationshipType}
                    </Badge>
                    <Badge variant="ghost" size="sm">
                      {r.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString()
                      : ""}
                    {r.confidence != null
                      ? ` · was ${Math.round(r.confidence * 100)}% suggestion`
                      : ""}
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 size={14} /> Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Manual link */}
      {canManage && (
        <Card title="Search & link manually">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              aria-label="Entity type"
            >
              {(meta?.targetEntityTypes || [
                "artist",
                "release",
                "track",
                "work",
                "label",
                "publisher",
                "organization",
                "person",
              ]).map((t: string) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white"
              aria-label="Relationship type"
            >
              {(meta?.relationshipTypes || []).map((t: any) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
              {!meta?.relationshipTypes?.length && (
                <>
                  <option value="represents">Represents</option>
                  <option value="applies_to">Applies To</option>
                  <option value="governs">Governs</option>
                  <option value="licenses">Licenses</option>
                  <option value="references">References</option>
                </>
              )}
            </select>
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void runSearch()}
                placeholder="Search entities…"
                className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={runSearch}
              disabled={searching}
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : "Search"}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map((r) => (
                <li
                  key={`${r.entityType}:${r.entityId}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="text-white font-medium">{r.entityName}</span>
                    <span className="text-text-secondary text-xs ml-2">
                      {r.entityType} · {r.strategy} ·{" "}
                      {Math.round(r.confidence * 100)}%
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busyId === `${r.entityType}:${r.entityId}`}
                    onClick={() => createManual(r)}
                  >
                    Link
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {showHistory && history.length > 0 && (
        <Card title="Relationship history">
          <ul className="space-y-1.5 text-xs text-text-secondary max-h-48 overflow-y-auto">
            {history.map((h) => (
              <li key={h.id}>
                <span className="text-white">{h.action}</span>
                {h.createdAt
                  ? ` · ${new Date(h.createdAt).toLocaleString()}`
                  : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
