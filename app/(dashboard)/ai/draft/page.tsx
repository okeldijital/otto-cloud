// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  FileText, AlertCircle, Loader2, RefreshCw, Send, Clock
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

export default function AIDraftPage() {
  const [drafts, setDrafts] = useState([]);
  const [selectedDraft, setSelectedDraft] = useState(null);

  const [label, setLabel] = useState("");
  const [parties, setParties] = useState("");
  const [territory, setTerritory] = useState("Worldwide");
  const [termMonths, setTermMonths] = useState("12");
  const [royaltyRate, setRoyaltyRate] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [drafting, setDrafting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDrafts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ai/draft", { params: { action: "list" } });
      const items = Array.isArray(res.data) ? res.data : res.data?.drafts || [];
      setDrafts(items);
    } catch (err) {
      setError("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrafts(); }, []);

  const handleDraft = async () => {
    if (!label.trim()) return;
    setDrafting(true);
    setError("");
    try {
      const res = await api.post("/ai/draft", {
        label,
        parties: parties || undefined,
        territory: territory || "Worldwide",
        term_months: parseInt(termMonths) || 12,
        royalty_rate: royaltyRate || undefined,
        advance_amount: advanceAmount || undefined,
        notes: notes || undefined,
      }, { params: { action: "draft" } });
      setSelectedDraft(res.data);
      setLabel("");
      setParties("");
      setTerritory("Worldwide");
      setTermMonths("12");
      setRoyaltyRate("");
      setAdvanceAmount("");
      setNotes("");
      fetchDrafts();
    } catch (err) {
      setError(err?.response?.data?.error || "Drafting failed");
    } finally {
      setDrafting(false);
    }
  };

  const viewDraft = async (id) => {
    try {
      const res = await api.get("/ai/draft", { params: { action: "get", id } });
      setSelectedDraft(res.data);
    } catch (err) {
      setError("Failed to load draft");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Contract Drafting"
        subtitle="Draft music recording contracts with AI assistance"
        actions={
          <Button variant="secondary" size="sm" onClick={fetchDrafts}>
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

      {/* Draft Form */}
      <Card title="New Contract Draft">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Label / Working Title <span className="text-danger">*</span></label>
              <input className="input w-full" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Global Music Publishing" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Parties</label>
              <input className="input w-full" value={parties} onChange={(e) => setParties(e.target.value)} placeholder="e.g. Artist Name / Label Name" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Territory</label>
              <input className="input w-full" value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="Worldwide" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Term (months)</label>
              <input type="number" className="input w-full" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Royalty Rate</label>
              <input className="input w-full" value={royaltyRate} onChange={(e) => setRoyaltyRate(e.target.value)} placeholder="e.g. 20% of Net Revenue" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Advance Amount</label>
              <input className="input w-full" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} placeholder="e.g. $5,000" />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Additional Notes</label>
            <textarea className="input w-full h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special terms or notes..." />
          </div>
          <Button variant="primary" onClick={handleDraft} disabled={drafting || !label.trim()}>
            {drafting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {drafting ? "Drafting..." : "Generate Draft"}
          </Button>
          <p className="text-[10px] text-text-secondary">
            AI-generated drafts are for review purposes only. Legal review is required before execution.
          </p>
        </div>
      </Card>

      {/* Draft Result */}
      {selectedDraft?.content && (
        <Card title={`Draft: ${selectedDraft.draft_id?.slice(0, 20) || "Result"}`}>
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 whitespace-pre-wrap text-sm text-text-primary font-mono">
              {selectedDraft.content}
            </div>
            <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-xl p-3">
              <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">{selectedDraft.disclaimer}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Previous Drafts */}
      <Card title="Previous Drafts">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-text-secondary">No drafts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-3 font-bold">ID</th>
                  <th className="p-3 font-bold">File</th>
                  <th className="p-3 font-bold">Source</th>
                  <th className="p-3 font-bold">Created</th>
                  <th className="p-3 font-bold">Size</th>
                  <th className="p-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-sm font-mono text-white truncate max-w-[120px]">{d.id}</td>
                    <td className="p-3 text-sm text-text-secondary truncate max-w-[200px]">{d.file_name}</td>
                    <td className="p-3 text-sm text-text-secondary">{d.source || "\u2014"}</td>
                    <td className="p-3 text-sm text-text-secondary">{formatDate(d.created_at)}</td>
                    <td className="p-3 text-sm text-text-secondary">{(d.size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" onClick={() => viewDraft(d.id)}>
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
    </div>
  );
}
