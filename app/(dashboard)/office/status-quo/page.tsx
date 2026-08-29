// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Trash2, X, Eye, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const SEVERITY_VARIANTS = {
  RED: "critical",
  AMBER: "warn",
  GREEN: "success",
};

export default function OfficeStatusQuoPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [severityFilter, setSeverityFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("");
  const [issueFilter, setIssueFilter] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/office/status-quo");
      setItems(Array.isArray(res.data) ? res.data : res.data?.items || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load status quo items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const redCount = items.filter((i) => i.severity === "RED" && !i.resolved_at).length;
  const amberCount = items.filter((i) => i.severity === "AMBER" && !i.resolved_at).length;
  const greenCount = items.filter((i) => i.severity === "GREEN" && !i.resolved_at).length;
  const totalCount = items.length;

  const filtered = useMemo(() => {
    const q = issueFilter.toLowerCase();
    const eq = entityFilter.toLowerCase();
    return items.filter((i) => {
      const matchesSeverity = severityFilter === "All" || i.severity === severityFilter;
      const matchesIssue = !q || (i.summary || "").toLowerCase().includes(q) || (i.issue_type || "").toLowerCase().includes(q);
      const matchesEntity = !eq || (i.entity_type || "").toLowerCase().includes(eq);
      return matchesSeverity && matchesIssue && matchesEntity;
    });
  }, [items, severityFilter, entityFilter, issueFilter]);

  const handleResolve = async (item) => {
    if (!window.confirm(`Resolve "${item.summary}"?`)) return;
    try {
      await api.post(`/office/status-quo?action=resolve`, { id: item.id });
      if (selectedItem?.id === item.id) setSelectedItem(null);
      fetchData();
    } catch (err) { alert("Failed to resolve"); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.summary}"?`)) return;
    try {
      await api.delete(`/office/status-quo?id=${item.id}`);
      if (selectedItem?.id === item.id) setSelectedItem(null);
      fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleView = async (item) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/office/status-quo?id=${item.id}`);
      setSelectedItem(res.data?.item || res.data);
    } catch (err) { alert("Failed to load details"); }
    finally { setDetailLoading(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Status Quo"
        subtitle="Governance dashboard showing open issues and their resolution status."
        actions={
          <Button variant="primary" size="sm" onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-danger/10 rounded-xl"><AlertTriangle size={20} className="text-danger" /></div>
            <div>
              <p className="text-2xl font-extrabold text-text-primary">{redCount}</p>
              <p className="text-xs text-text-secondary">Red</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-warning/10 rounded-xl"><AlertTriangle size={20} className="text-warning" /></div>
            <div>
              <p className="text-2xl font-extrabold text-text-primary">{amberCount}</p>
              <p className="text-xs text-text-secondary">Amber</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-xl"><ShieldCheck size={20} className="text-success" /></div>
            <div>
              <p className="text-2xl font-extrabold text-text-primary">{greenCount}</p>
              <p className="text-xs text-text-secondary">Green</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-surface-raised rounded-xl"><AlertTriangle size={20} className="text-text-secondary" /></div>
            <div>
              <p className="text-2xl font-extrabold text-text-primary">{totalCount}</p>
              <p className="text-xs text-text-secondary">Total</p>
            </div>
          </div>
        </Card>
      </div>

      <Card noPadding>
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-text-secondary" />
            <select className="input w-auto" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="All">Severity: All</option>
              <option value="RED">RED</option>
              <option value="AMBER">AMBER</option>
              <option value="GREEN">GREEN</option>
            </select>
            <input className="input w-auto" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} placeholder="Entity type..." />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Search size={16} className="text-text-secondary" />
            <input className="input" value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)} placeholder="Search issues..." />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading status quo items…</div>
        ) : error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            {items.length === 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-primary">No status quo items</h3>
                <p className="text-sm">All governance issues appear resolved.</p>
              </div>
            ) : (
              <p>No items match your filters.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-border">
                  <th className="p-4 font-bold">Issue</th>
                  <th className="p-4 font-bold">Entity Type</th>
                  <th className="p-4 font-bold">Entity ID</th>
                  <th className="p-4 font-bold">Severity</th>
                  <th className="p-4 font-bold">Created</th>
                  <th className="p-4 font-bold">Resolved</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-raised transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-text-primary truncate max-w-[250px]">{item.summary || "Untitled"}</div>
                      {item.issue_type && <div className="text-xs text-text-secondary mt-0.5">{item.issue_type}</div>}
                    </td>
                    <td className="p-4">
                      <Badge variant="neutral" size="sm">{item.entity_type || "—"}</Badge>
                    </td>
                    <td className="p-4 text-sm text-text-secondary font-mono">{item.entity_id || "—"}</td>
                    <td className="p-4">
                      <Badge variant={SEVERITY_VARIANTS[item.severity] || "neutral"} size="sm">{item.severity}</Badge>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{formatDate(item.created_at)}</td>
                    <td className="p-4 text-sm text-text-secondary">
                      {item.resolved_at ? formatDate(item.resolved_at) : <Badge variant="warn" size="sm">Open</Badge>}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleView(item)}><Eye size={14} /></Button>
                        {!item.resolved_at && (
                          <Button variant="ghost" size="sm" onClick={() => handleResolve(item)}><CheckCircle size={14} className="text-success" /></Button>
                        )}
                        <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => handleDelete(item)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0f1115]/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-xl bg-surface border-l border-border shadow-glass overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border bg-surface-raised sticky top-0 z-10">
              <h2 className="text-xl font-black text-text-primary tracking-tight truncate">Issue Detail</h2>
              <button className="w-8 h-8 rounded-full bg-surface-raised hover:bg-border flex items-center justify-center text-text-secondary hover:text-text-primary" onClick={() => setSelectedItem(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Summary</p>
                <p className="text-sm text-text-primary">{selectedItem.summary || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Severity</p>
                  <Badge variant={SEVERITY_VARIANTS[selectedItem.severity] || "neutral"}>{selectedItem.severity}</Badge>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Issue Type</p>
                  <p className="text-sm text-text-primary">{selectedItem.issue_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Entity Type</p>
                  <p className="text-sm text-text-primary">{selectedItem.entity_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Entity ID</p>
                  <p className="text-sm text-text-primary font-mono">{selectedItem.entity_id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Created</p>
                  <p className="text-sm text-text-primary">{formatDate(selectedItem.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Resolved</p>
                  <p className="text-sm text-text-primary">{selectedItem.resolved_at ? formatDate(selectedItem.resolved_at) : "Open"}</p>
                </div>
              </div>
              {selectedItem.details_json && (
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Details</p>
                  <pre className="text-xs text-text-secondary bg-surface-raised rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono">
                    {typeof selectedItem.details_json === "string"
                      ? selectedItem.details_json
                      : JSON.stringify(selectedItem.details_json, null, 2)}
                  </pre>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                {!selectedItem.resolved_at && (
                  <Button variant="primary" onClick={() => handleResolve(selectedItem)} fullWidth>
                    <CheckCircle size={14} /> Mark Resolved
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelectedItem(null)} fullWidth>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
