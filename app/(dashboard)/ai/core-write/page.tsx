// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  PenTool, AlertCircle, Loader2, RefreshCw, CheckCircle, Clock
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

export default function AICoreWritePage() {
  const [health, setHealth] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalItems, setProposalItems] = useState([]);
  const [applyEvents, setApplyEvents] = useState([]);

  const [contractId, setContractId] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [contractDocId, setContractDocId] = useState("");
  const [generating, setGenerating] = useState(false);

  const [applyingId, setApplyingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [healthRes, proposalsRes] = await Promise.all([
        api.get("/ai/core-write", { params: { action: "health" } }).catch(() => null),
        api.get("/ai/core-write", { params: { action: "proposals" } }).catch(() => null),
      ]);
      if (healthRes) setHealth(healthRes.data);
      if (proposalsRes) {
        const items = Array.isArray(proposalsRes.data) ? proposalsRes.data : proposalsRes.data?.proposals || [];
        setProposals(items);
      }
    } catch (err) {
      setError("Failed to load core write data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleGenerate = async () => {
    if (!contractId) return;
    setGenerating(true);
    setError("");
    try {
      await api.post("/ai/core-write", null, {
        params: { action: "propose" },
        data: {
          contract_id: Number(contractId),
          release_id: releaseId ? Number(releaseId) : undefined,
          contract_document_id: contractDocId ? Number(contractDocId) : undefined,
        },
      });
      setContractId("");
      setReleaseId("");
      setContractDocId("");
      fetchAll();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to generate proposal");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async (proposalId) => {
    setApplyingId(proposalId);
    try {
      await api.post("/ai/core-write", null, {
        params: { action: "apply" },
        data: { proposal_id: proposalId },
      });
      fetchAll();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to apply proposal");
    } finally {
      setApplyingId(null);
    }
  };

  const selectProposal = async (proposal) => {
    setSelectedProposal(proposal);
    try {
      const [itemsRes, eventsRes] = await Promise.all([
        api.get("/ai/core-write", { params: { action: "items", proposal_id: proposal.id } }).catch(() => null),
        api.get("/ai/core-write", { params: { action: "events", proposal_id: proposal.id } }).catch(() => null),
      ]);
      setProposalItems(Array.isArray(itemsRes?.data) ? itemsRes.data : itemsRes?.data?.items || []);
      setApplyEvents(Array.isArray(eventsRes?.data) ? eventsRes.data : eventsRes?.data?.events || []);
    } catch {
      setProposalItems([]);
      setApplyEvents([]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Core Write"
        subtitle="AI-assisted data proposals"
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
            <PenTool size={20} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Core Write {health?.status === "ok" ? "Online" : "Unknown"}
            </h3>
            {health?.version && (
              <p className="text-xs text-text-secondary mt-0.5">Version {health.version}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Propose Form */}
      <Card title="Generate Proposal">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Contract ID <span className="text-danger">*</span></label>
              <input type="number" className="input w-full" value={contractId} onChange={(e) => setContractId(e.target.value)} placeholder="e.g. 42" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Release ID (optional)</label>
              <input type="number" className="input w-full" value={releaseId} onChange={(e) => setReleaseId(e.target.value)} placeholder="e.g. 7" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Contract Document ID (optional)</label>
              <input type="number" className="input w-full" value={contractDocId} onChange={(e) => setContractDocId(e.target.value)} placeholder="e.g. 3" />
            </div>
          </div>
          <Button variant="primary" onClick={handleGenerate} disabled={generating || !contractId}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <PenTool size={14} />}
            {generating ? "Generating..." : "Generate Proposal"}
          </Button>
        </div>
      </Card>

      {/* Proposals List */}
      <Card title="Proposals">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-text-secondary">No proposals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-3 font-bold">ID</th>
                  <th className="p-3 font-bold">Contract ID</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold">Created</th>
                  <th className="p-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${selectedProposal?.id === p.id ? "bg-accent/5" : ""}`}
                    onClick={() => selectProposal(p)}
                  >
                    <td className="p-3 text-sm font-mono text-white">{p.id}</td>
                    <td className="p-3 text-sm font-mono text-text-secondary">{p.contract_id}</td>
                    <td className="p-3">
                      <Badge variant={p.status === "applied" ? "success" : p.status === "pending" ? "warn" : "neutral"} size="sm">
                        {p.status || "draft"}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-text-secondary">{formatDate(p.created_at)}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); selectProposal(p); }}>
                          View
                        </Button>
                        {p.status !== "applied" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleApply(p.id); }}
                            disabled={applyingId === p.id}
                          >
                            {applyingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Apply
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Proposal Detail */}
      {selectedProposal && (
        <>
          <Card title={`Proposal #${selectedProposal.id} — Items`}>
            {proposalItems.length === 0 ? (
              <p className="text-sm text-text-secondary">No items in this proposal.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                      <th className="p-3 font-bold">Entity Type</th>
                      <th className="p-3 font-bold">Entity ID</th>
                      <th className="p-3 font-bold">Operation</th>
                      <th className="p-3 font-bold">Requires Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposalItems.map((item, idx) => (
                      <tr key={item.id || idx} className="border-b border-white/5">
                        <td className="p-3 text-sm text-text-primary">{item.entity_type}</td>
                        <td className="p-3 text-sm font-mono text-text-secondary">{item.entity_id}</td>
                        <td className="p-3">
                          <Badge variant={item.operation === "create" ? "success" : item.operation === "update" ? "warn" : "neutral"} size="sm">
                            {item.operation}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {item.requires_user_review ? (
                            <Badge variant="warn" size="sm">Yes</Badge>
                          ) : (
                            <Badge variant="success" size="sm">No</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Apply Events">
            {applyEvents.length === 0 ? (
              <p className="text-sm text-text-secondary">No apply events yet.</p>
            ) : (
              <div className="space-y-2">
                {applyEvents.map((evt, idx) => (
                  <div key={evt.id || idx} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <Clock size={14} className="text-text-secondary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{evt.event || evt.action || "Event"}</p>
                      <p className="text-xs text-text-secondary">{formatDate(evt.created_at)}</p>
                    </div>
                    {evt.status && (
                      <Badge variant={evt.status === "success" ? "success" : evt.status === "failed" ? "critical" : "neutral"} size="sm">
                        {evt.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
