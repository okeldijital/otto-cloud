// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Brain, AlertCircle, Info, RotateCcw, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "\u2014";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));
}

function formatDate(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function AIRoyaltiesPage() {
  const [releases, setReleases] = useState([]);
  const [releaseSearch, setReleaseSearch] = useState("");
  const [releaseResults, setReleaseResults] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [contractDocId, setContractDocId] = useState("");
  const [useLatestContract, setUseLatestContract] = useState(false);
  const [grossRevenue, setGrossRevenue] = useState("");
  const [units, setUnits] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualSplits, setManualSplits] = useState([
    { party: "", percent: "" },
  ]);

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const res = await api.get("/releases?limit=100");
        const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setReleases(items);
      } catch (err) {
        console.error("Failed to fetch releases:", err);
      }
    };
    fetchReleases();
  }, []);

  const searchReleases = async (q) => {
    setReleaseSearch(q);
    if (!q || q.length < 2) {
      setReleaseResults([]);
      return;
    }
    const filtered = releases.filter(
      (r) =>
        (r.title || "").toLowerCase().includes(q.toLowerCase()) ||
        (r.upc_code || "").toLowerCase().includes(q.toLowerCase())
    );
    setReleaseResults(filtered);
    if (filtered.length === 0 && releases.length > 0) {
      try {
        const res = await api.get(`/releases?q=${encodeURIComponent(q)}&limit=10`);
        const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setReleaseResults(items);
      } catch {}
    }
  };

  const selectRelease = (release) => {
    setSelectedRelease(release);
    setReleaseSearch(release.title || release.name);
    setReleaseResults([]);
  };

  const handleSimulate = async () => {
    setError("");
    setResults(null);
    setAiUnavailable(false);
    setManualMode(false);

    if (!grossRevenue) {
      setError("Gross Revenue is required.");
      return;
    }

    setSimulating(true);
    try {
      const payload = {
        release_id: selectedRelease?.id,
        contract_document_id: contractDocId ? Number(contractDocId) : undefined,
        use_latest_contract: useLatestContract,
        gross_revenue: Number(grossRevenue),
        units: units ? Number(units) : undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
      };
      const res = await api.post("/ai/royalty/simulate", payload);
      setResults(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setAiUnavailable(true);
        setManualMode(true);
      } else {
        setError(err?.response?.data?.error || "Simulation failed");
      }
    } finally {
      setSimulating(false);
    }
  };

  const addManualSplit = () => {
    setManualSplits([...manualSplits, { party: "", percent: "" }]);
  };

  const updateManualSplit = (index, field, value) => {
    const updated = [...manualSplits];
    updated[index] = { ...updated[index], [field]: value };
    setManualSplits(updated);
  };

  const removeManualSplit = (index) => {
    setManualSplits(manualSplits.filter((_, i) => i !== index));
  };

  const totalManualPercent = manualSplits.reduce(
    (sum, s) => sum + (parseFloat(s.percent) || 0),
    0
  );

  const renderManualSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Manual Split Entry</h3>
        <Button variant="ghost" size="sm" onClick={addManualSplit}>
          <Plus size={14} /> Add Row
        </Button>
      </div>
      <p className="text-xs text-text-secondary">
        The AI backend is not available. Enter splits manually below.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
              <th className="p-3 font-bold">Party</th>
              <th className="p-3 font-bold">%</th>
              <th className="p-3 font-bold">Amount</th>
              <th className="p-3 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {manualSplits.map((s, idx) => {
              const amt = grossRevenue ? (parseFloat(s.percent) || 0) * 0.01 * Number(grossRevenue) : 0;
              return (
                <tr key={idx} className="border-b border-white/5">
                  <td className="p-3">
                    <input
                      className="input w-full"
                      placeholder="Party name"
                      value={s.party}
                      onChange={(e) => updateManualSplit(idx, "party", e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.1"
                      className="input w-24"
                      placeholder="%"
                      value={s.percent}
                      onChange={(e) => updateManualSplit(idx, "percent", e.target.value)}
                    />
                  </td>
                  <td className="p-3 text-sm font-medium text-white">
                    {formatCurrency(amt)}
                  </td>
                  <td className="p-3">
                    <button
                      className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-text-secondary hover:text-danger transition-colors"
                      onClick={() => removeManualSplit(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">Total:</span>
        <span className={`text-sm font-bold font-mono ${Math.abs(totalManualPercent - 100) < 0.01 ? "text-success" : "text-danger"}`}>
          {totalManualPercent.toFixed(1)}%
        </span>
        {Math.abs(totalManualPercent - 100) < 0.01 ? (
          <Badge variant="success" size="sm"><CheckCircle size={12} className="mr-1" /> Balanced</Badge>
        ) : (
          <Badge variant="warn" size="sm"><XCircle size={12} className="mr-1" /> Not balanced</Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Royalties"
        subtitle="AI-powered royalty simulation and contract split analysis"
      />

      <Card>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Brain size={20} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Simulation Tool</h3>
            <p className="text-sm text-text-secondary mt-1">
              This tool simulates royalty splits based on contract terms, revenue data, and
              release information. Enter the parameters below and run the simulation to see
              computed splits and integrity checks.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Simulation Parameters">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Release</label>
            <input
              className="input w-full"
              placeholder="Search releases..."
              value={releaseSearch}
              onChange={(e) => searchReleases(e.target.value)}
            />
            {releaseResults.length > 0 && (
              <div className="mt-1 border border-white/10 rounded-xl overflow-hidden bg-premium-glass backdrop-blur-xl max-h-48 overflow-y-auto">
                {releaseResults.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                    onClick={() => selectRelease(r)}
                  >
                    <div className="text-sm font-medium text-white">{r.title || r.name}</div>
                    <div className="text-xs text-text-secondary">{r.upc_code || `ID ${r.id}`}</div>
                  </div>
                ))}
              </div>
            )}
            {selectedRelease && (
              <div className="mt-2">
                <Badge variant="primary" size="sm">
                  {selectedRelease.title || `Release #${selectedRelease.id}`}
                </Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Contract Document ID (optional)</label>
              <input
                type="number"
                className="input w-full"
                value={contractDocId}
                onChange={(e) => setContractDocId(e.target.value)}
                placeholder="e.g. 42"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLatestContract}
                  onChange={(e) => setUseLatestContract(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <span className="text-sm text-text-secondary">Use latest attached contract</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Gross Revenue <span className="text-danger">*</span></label>
              <input
                type="number"
                step="0.01"
                className="input w-full"
                value={grossRevenue}
                onChange={(e) => setGrossRevenue(e.target.value)}
                placeholder="e.g. 10000"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Units (optional)</label>
              <input
                type="number"
                className="input w-full"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Period Start</label>
              <input
                type="date"
                className="input w-full"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Period End</label>
              <input
                type="date"
                className="input w-full"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="primary" onClick={handleSimulate} disabled={simulating || !grossRevenue}>
              {simulating ? "Simulating..." : "Simulate"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setResults(null);
                setError("");
                setAiUnavailable(false);
                setManualMode(false);
                setManualSplits([{ party: "", percent: "" }]);
              }}
            >
              <RotateCcw size={14} /> Reset
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4">
              <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
          )}

          {aiUnavailable && (
            <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-xl p-4">
              <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary">
                The AI royalty simulation backend is not currently available. You can use the manual
                split calculator below instead.
              </p>
            </div>
          )}
        </div>
      </Card>

      {results && (
        <Card title="Simulation Results">
          <div className="space-y-6">
            {(results.splits || results.computed_splits || []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                      <th className="p-3 font-bold">Party</th>
                      <th className="p-3 font-bold">%</th>
                      <th className="p-3 font-bold">Amount</th>
                      <th className="p-3 font-bold">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results.splits || results.computed_splits || []).map((s, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="p-3 text-sm text-white">{s.party || s.party_name || `Party #${idx + 1}`}</td>
                        <td className="p-3 text-sm font-mono">{s.percent != null ? `${Number(s.percent).toFixed(1)}%` : "\u2014"}</td>
                        <td className="p-3 text-sm font-medium">{s.amount != null ? formatCurrency(s.amount) : "\u2014"}</td>
                        <td className="p-3 text-sm text-text-secondary">{s.rationale || s.notes || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {results.total_equals_100 && (
                <Badge variant="success" size="md">
                  <CheckCircle size={14} className="mr-1" /> Total = 100%
                </Badge>
              )}
              {results.over_allocated && (
                <Badge variant="critical" size="md">Over-allocated</Badge>
              )}
              {results.under_allocated && (
                <Badge variant="warn" size="md">Under-allocated</Badge>
              )}
            </div>

            {results.warnings?.length > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-warning mb-2">Warnings</h4>
                <ul className="space-y-1">
                  {results.warnings.map((w, idx) => (
                    <li key={idx} className="text-sm text-text-secondary flex items-start gap-2">
                      <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" /> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.missing_flags?.length > 0 && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-danger mb-2">Missing Flags</h4>
                <ul className="space-y-1">
                  {results.missing_flags.map((m, idx) => (
                    <li key={idx} className="text-sm text-text-secondary flex items-start gap-2">
                      <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" /> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.persisted_info && (
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Persisted Info</h4>
                <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">
                  {JSON.stringify(results.persisted_info, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}

      {manualMode && renderManualSection()}
    </div>
  );
}
