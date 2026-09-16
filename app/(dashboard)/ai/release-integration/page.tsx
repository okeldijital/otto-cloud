// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Cpu, AlertCircle, Loader2, RefreshCw, Link2, Plus
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

const ENTITY_TYPES = ["artist", "work", "track", "organization", "individual"];

export default function AIReleaseIntegrationPage() {
  const [health, setHealth] = useState(null);
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [integrationLinks, setIntegrationLinks] = useState([]);

  const [releaseId, setReleaseId] = useState("");
  const [contractId, setContractId] = useState("");
  const [plannerVersion, setPlannerVersion] = useState("v1");
  const [planning, setPlanning] = useState(false);

  const [entityType, setEntityType] = useState("artist");
  const [entityId, setEntityId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confidence, setConfidence] = useState("high");
  const [attaching, setAttaching] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [healthRes, runsRes] = await Promise.all([
        api.get("/ai/release-integration", { params: { action: "health" } }).catch(() => null),
        api.get("/ai/release-integration", { params: { action: "runs" } }).catch(() => null),
      ]);
      if (healthRes) setHealth(healthRes.data);
      if (runsRes) {
        const items = Array.isArray(runsRes.data) ? runsRes.data : runsRes.data?.runs || [];
        setRuns(items);
      }
    } catch (err) {
      setError("Failed to load release integration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreatePlan = async () => {
    if (!releaseId) return;
    setPlanning(true);
    setError("");
    try {
      await api.post("/ai/release-integration", null, {
        params: { action: "plan" },
        data: {
          release_id: Number(releaseId),
          contract_id: contractId ? Number(contractId) : undefined,
          planner_version: plannerVersion,
        },
      });
      setReleaseId("");
      setContractId("");
      fetchAll();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create plan");
    } finally {
      setPlanning(false);
    }
  };

  const selectRun = async (run) => {
    setSelectedRun(run);
    try {
      const res = await api.get("/ai/release-integration", { params: { action: "links", run_id: run.id } });
      const items = Array.isArray(res.data) ? res.data : res.data?.links || [];
      setIntegrationLinks(items);
    } catch {
      setIntegrationLinks([]);
    }
  };

  const handleAttach = async () => {
    if (!entityId.trim()) return;
    setAttaching(true);
    try {
      await api.post("/ai/release-integration", null, {
        params: { action: "attach" },
        data: {
          run_id: selectedRun.id,
          entity_type: entityType,
          entity_id: Number(entityId),
          display_name: displayName || undefined,
          confidence: confidence,
        },
      });
      setEntityId("");
      setDisplayName("");
      const res = await api.get("/ai/release-integration", { params: { action: "links", run_id: selectedRun.id } });
      const items = Array.isArray(res.data) ? res.data : res.data?.links || [];
      setIntegrationLinks(items);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to attach entity");
    } finally {
      setAttaching(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Release Integration"
        subtitle="AI-powered release entity linking"
        actions={
          <Button variant="secondary" size="sm" onClick={fetchAll}>
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

      {/* Health Status */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Cpu size={20} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Release Integration {health?.status === "ok" ? "Online" : "Unknown"}
            </h3>
            {health?.version && (
              <p className="text-xs text-text-secondary mt-0.5">Version {health.version}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Plan Form */}
      <Card title="Create Integration Plan">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Release ID <span className="text-danger">*</span></label>
              <input type="number" className="input w-full" value={releaseId} onChange={(e) => setReleaseId(e.target.value)} placeholder="e.g. 7" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Contract ID (optional)</label>
              <input type="number" className="input w-full" value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="e.g. 42" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Planner Version</label>
              <select className="input w-full" value={plannerVersion} onChange={(e) => setPlannerVersion(e.target.value)}>
                <option value="v1">v1</option>
              </select>
            </div>
          </div>
          <Button variant="primary" onClick={handleCreatePlan} disabled={planning || !releaseId}>
            {planning ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />}
            {planning ? "Creating..." : "Create Plan"}
          </Button>
        </div>
      </Card>

      {/* Integration Runs List */}
      <Card title="Integration Runs">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-text-secondary">No integration runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-3 font-bold">ID</th>
                  <th className="p-3 font-bold">Release ID</th>
                  <th className="p-3 font-bold">Contract ID</th>
                  <th className="p-3 font-bold">Planner</th>
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
                    <td className="p-3 text-sm font-mono text-text-secondary">{run.release_id}</td>
                    <td className="p-3 text-sm text-text-secondary">{run.contract_id ?? "\u2014"}</td>
                    <td className="p-3 text-sm text-text-secondary">{run.planner_version || "\u2014"}</td>
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

      {/* Attach Form */}
      {selectedRun && (
        <Card title={`Attach Entities — Run #${selectedRun.id}`}>
          <div className="space-y-4">
            {integrationLinks.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                      <th className="p-2 font-bold">Entity Type</th>
                      <th className="p-2 font-bold">Entity ID</th>
                      <th className="p-2 font-bold">Display Name</th>
                      <th className="p-2 font-bold">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrationLinks.map((link, idx) => (
                      <tr key={link.id || idx} className="border-b border-white/5">
                        <td className="p-2 text-sm text-text-primary">{link.entity_type}</td>
                        <td className="p-2 text-sm font-mono text-text-secondary">{link.entity_id}</td>
                        <td className="p-2 text-sm text-text-secondary">{link.display_name || "\u2014"}</td>
                        <td className="p-2">
                          <Badge variant={link.confidence === "high" ? "success" : link.confidence === "medium" ? "warn" : "neutral"} size="sm">
                            {link.confidence || "\u2014"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-sm font-bold text-white mb-3">Attach New Entity</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Entity Type</label>
                  <select className="input w-full" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Entity ID</label>
                  <input type="number" className="input w-full" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="e.g. 42" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Display Name</label>
                  <input className="input w-full" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Artist Name" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Confidence</label>
                  <select className="input w-full" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Button variant="primary" size="sm" onClick={handleAttach} disabled={attaching || !entityId.trim()}>
                  {attaching ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  {attaching ? "Attaching..." : "Attach Entity"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
