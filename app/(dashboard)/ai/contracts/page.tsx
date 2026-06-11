// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  FileText, Search, Link2, AlertCircle, Loader2, RefreshCw, Plus
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

function formatDate(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AIContractsPage() {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [links, setLinks] = useState([]);

  const [contractHash, setContractHash] = useState("");
  const [extractorVersion, setExtractorVersion] = useState("v1");
  const [linkerVersion, setLinkerVersion] = useState("v1");
  const [extracting, setExtracting] = useState(false);

  const [entityType, setEntityType] = useState("artist");
  const [entityId, setEntityId] = useState("");
  const [linkAction, setLinkAction] = useState("create");
  const [confidence, setConfidence] = useState("high");
  const [rationale, setRationale] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const [suggestHash, setSuggestHash] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRuns = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ai/contracts", { params: { action: "runs" } });
      const items = Array.isArray(res.data) ? res.data : res.data?.runs || [];
      setRuns(items);
    } catch (err) {
      setError("Failed to load extraction runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRuns(); }, []);

  const handleExtract = async () => {
    if (!contractHash.trim()) return;
    setExtracting(true);
    setError("");
    try {
      await api.post("/ai/contracts", null, {
        params: { action: "extract" },
        data: {
          contract_hash: contractHash,
          extractor_version: extractorVersion,
          linker_version: linkerVersion,
        },
      });
      setContractHash("");
      fetchRuns();
    } catch (err) {
      setError(err?.response?.data?.error || "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const selectRun = async (run) => {
    setSelectedRun(run);
    try {
      const res = await api.get("/ai/contracts", { params: { action: "links", run_id: run.id } });
      const items = Array.isArray(res.data) ? res.data : res.data?.links || [];
      setLinks(items);
    } catch {
      setLinks([]);
    }
  };

  const handleAddLink = async () => {
    if (!entityId.trim()) return;
    setAddingLink(true);
    try {
      await api.post("/ai/contracts", null, {
        params: { action: "resolve" },
        data: {
          run_id: selectedRun.id,
          entity_type: entityType,
          entity_id: Number(entityId),
          action: linkAction,
          confidence: confidence,
          rationale: rationale,
        },
      });
      setEntityId("");
      setRationale("");
      const res = await api.get("/ai/contracts", { params: { action: "links", run_id: selectedRun.id } });
      const items = Array.isArray(res.data) ? res.data : res.data?.links || [];
      setLinks(items);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to add link");
    } finally {
      setAddingLink(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!suggestHash.trim()) return;
    setFetchingSuggestions(true);
    try {
      const res = await api.get("/ai/contracts", { params: { action: "link_suggest", q: suggestHash } });
      const items = Array.isArray(res.data) ? res.data : res.data?.suggestions || [];
      setSuggestions(items);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to get suggestions");
    } finally {
      setFetchingSuggestions(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Contract Extraction"
        subtitle="AI-powered contract analysis"
        actions={
          <Button variant="secondary" size="sm" onClick={fetchRuns}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {error && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4">
          <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      )}

      {/* Extract Form */}
      <Card title="Run Extraction">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Contract Hash</label>
            <input
              className="input w-full font-mono"
              placeholder="Enter contract hash..."
              value={contractHash}
              onChange={(e) => setContractHash(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Extractor Version</label>
              <select
                className="input w-full"
                value={extractorVersion}
                onChange={(e) => setExtractorVersion(e.target.value)}
              >
                <option value="v1">v1</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Linker Version</label>
              <select
                className="input w-full"
                value={linkerVersion}
                onChange={(e) => setLinkerVersion(e.target.value)}
              >
                <option value="v1">v1</option>
              </select>
            </div>
          </div>
          <Button variant="primary" onClick={handleExtract} disabled={extracting || !contractHash.trim()}>
            {extracting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {extracting ? "Extracting..." : "Run Extraction"}
          </Button>
        </div>
      </Card>

      {/* Extraction Runs List */}
      <Card title="Extraction Runs">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-text-secondary">No extraction runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-3 font-bold">ID</th>
                  <th className="p-3 font-bold">Contract Hash</th>
                  <th className="p-3 font-bold">Extractor</th>
                  <th className="p-3 font-bold">Created</th>
                  <th className="p-3 font-bold">Links</th>
                  <th className="p-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${selectedRun?.id === run.id ? "bg-accent/5" : ""}`}
                    onClick={() => selectRun(run)}
                  >
                    <td className="p-3 text-sm font-mono text-white">{run.id}</td>
                    <td className="p-3 text-sm font-mono text-text-secondary max-w-[200px] truncate">{run.contract_hash || "\u2014"}</td>
                    <td className="p-3 text-sm text-text-secondary">{run.extractor_version || "\u2014"}</td>
                    <td className="p-3 text-sm text-text-secondary">{formatDate(run.created_at)}</td>
                    <td className="p-3 text-sm text-text-secondary">{run.links_count ?? run._count?.links ?? 0}</td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); selectRun(run); }}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Resolve Form */}
      {selectedRun && (
        <Card title={`Resolve Links — Run #${selectedRun.id}`}>
          <div className="space-y-4">
            {links.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                      <th className="p-2 font-bold">Entity Type</th>
                      <th className="p-2 font-bold">Entity ID</th>
                      <th className="p-2 font-bold">Action</th>
                      <th className="p-2 font-bold">Confidence</th>
                      <th className="p-2 font-bold">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link, idx) => (
                      <tr key={link.id || idx} className="border-b border-white/5">
                        <td className="p-2 text-sm text-text-primary">{link.entity_type}</td>
                        <td className="p-2 text-sm font-mono text-text-secondary">{link.entity_id}</td>
                        <td className="p-2">
                          <Badge variant={link.action === "create" ? "success" : "neutral"} size="sm">
                            {link.action}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm text-text-secondary">{link.confidence || "\u2014"}</td>
                        <td className="p-2 text-sm text-text-secondary max-w-[200px] truncate">{link.rationale || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-sm font-bold text-white mb-3">Add New Link</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Entity Type</label>
                  <select className="input w-full" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                    <option value="artist">Artist</option>
                    <option value="work">Work</option>
                    <option value="track">Track</option>
                    <option value="release">Release</option>
                    <option value="organization">Organization</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Entity ID</label>
                  <input type="number" className="input w-full" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="e.g. 42" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Action</label>
                  <select className="input w-full" value={linkAction} onChange={(e) => setLinkAction(e.target.value)}>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="skip">Skip</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Confidence</label>
                  <select className="input w-full" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="text-xs text-text-secondary block mb-1">Rationale</label>
                  <input className="input w-full" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why this link?" />
                </div>
              </div>
              <div className="mt-3">
                <Button variant="primary" size="sm" onClick={handleAddLink} disabled={addingLink || !entityId.trim()}>
                  {addingLink ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  {addingLink ? "Adding..." : "Add Link"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Link Suggestions */}
      <Card title="Link Suggestions">
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-secondary block mb-1">Contract Hash</label>
              <input
                className="input w-full font-mono"
                placeholder="Enter contract hash for suggestions..."
                value={suggestHash}
                onChange={(e) => setSuggestHash(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={handleGetSuggestions} disabled={fetchingSuggestions || !suggestHash.trim()}>
              {fetchingSuggestions ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Get Suggestions
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.map((s, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Link2 size={14} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{s.entity_type || "Entity"}</p>
                      <p className="text-xs text-text-secondary mt-0.5">ID: {s.entity_id ?? "\u2014"}</p>
                      {s.confidence && (
                        <Badge variant={s.confidence === "high" ? "success" : s.confidence === "medium" ? "warn" : "neutral"} size="sm" className="mt-2">
                          {s.confidence}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {s.rationale && (
                    <p className="text-xs text-text-secondary mt-2">{s.rationale}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
