// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Shield, AlertCircle, Loader2, RefreshCw, CheckCircle, ChevronDown, ChevronRight
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

const SEVERITY_VARIANTS = { RED: "critical", AMBER: "warn", GREEN: "success" };

export default function AIAuditPage() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState("");

  const fetchAudits = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ai/audit", { params: { action: "summary" } });
      const items = Array.isArray(res.data?.audits) ? res.data.audits : [];
      setAudits(items);
      const init = {};
      items.forEach((a) => { init[a.type] = true; });
      setExpanded(init);
    } catch (err) {
      setError("Failed to load audit data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAudits(); }, []);

  const handleRun = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await api.post("/ai/audit", { scope: "all", post_to_status_quo: true }, { params: { action: "run" } });
      const items = Array.isArray(res.data?.audits) ? res.data.audits : [];
      setAudits(items);
    } catch (err) {
      setError(err?.response?.data?.error || "Audit run failed");
    } finally {
      setRunning(false);
    }
  };

  const toggleExpanded = (type) => {
    setExpanded((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Audit"
        subtitle="Automated catalog consistency, release quality, royalty anomaly, and contract checks"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={fetchAudits}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={handleRun} disabled={running}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              {running ? "Running..." : "Run Full Audit"}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4">
          <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 size={32} className="text-accent animate-spin" />
        </div>
      ) : audits.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">No audit data available. Click "Run Full Audit" to check your catalog.</p>
        </Card>
      ) : (
        audits.map((audit) => (
          <Card key={audit.type}>
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleExpanded(audit.type)}
            >
              <div className="flex items-center gap-3">
                {expanded[audit.type] ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
                <h3 className="text-sm font-bold text-white">{audit.label}</h3>
              </div>
              <div className="flex items-center gap-2">
                {audit.summary?.red > 0 && <Badge variant="critical" size="sm">{audit.summary.red} critical</Badge>}
                {audit.summary?.amber > 0 && <Badge variant="warn" size="sm">{audit.summary.amber} warnings</Badge>}
                {audit.summary?.green > 0 && <Badge variant="success" size="sm">{audit.summary.green} info</Badge>}
              </div>
            </div>

            {expanded[audit.type] && (
              <div className="mt-4 space-y-2">
                {audit.findings && audit.findings.length > 0 ? (
                  audit.findings.map((f, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        f.severity === "RED" ? "bg-danger" : f.severity === "AMBER" ? "bg-warning" : "bg-success"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{f.summary}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={SEVERITY_VARIANTS[f.severity] || "neutral"} size="sm">{f.severity}</Badge>
                          <span className="text-xs text-text-secondary">{f.entity_type} #{f.entity_id}</span>
                        </div>
                        {f.details && (
                          <p className="text-xs text-text-secondary mt-1">{f.details}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-secondary">No findings. All checks passed.</p>
                )}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
