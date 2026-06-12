"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck, FileText, ListTodo, Calendar, BarChart3, Activity,
  RefreshCw, TrendingUp, AlertTriangle, Play, Download, Trash2, Loader,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ReportVisualizer from "@/components/office/ReportVisualizer";
import api from "@/lib/api";

const REPORT_TYPES = [
  { type: "status_quo", icon: ShieldCheck, label: "Status Quo Analysis", desc: "Active issues by severity", color: "text-blue-400" },
  { type: "contracts_audit", icon: FileText, label: "Contracts Audit", desc: "Contract completeness & health", color: "text-emerald-400" },
  { type: "catalog_summary", icon: BarChart3, label: "Catalog Summary", desc: "All catalog entities overview", color: "text-purple-400" },
  { type: "royalties_summary", icon: TrendingUp, label: "Royalties Summary", desc: "Revenue by source & artist", color: "text-amber-400" },
  { type: "tasks_progress", icon: ListTodo, label: "Task Progress", desc: "Task status distribution", color: "text-cyan-400" },
  { type: "activity_log", icon: Activity, label: "Activity Log", desc: "Recent activity history", color: "text-pink-400" },
];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function OfficeReportsPage() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [viewingRun, setViewingRun] = useState<any>(null);
  const [counts, setCounts] = useState({ totalTasks: 0, pendingTasks: 0, upcomingEvents: 0, activeStatusQuo: 0 });
  const [statusQuoCounts, setStatusQuoCounts] = useState({ red: 0, amber: 0, green: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes, sqRes, runsRes] = await Promise.allSettled([
        api.get("/office/tasks"),
        api.get("/office/events?action=upcoming"),
        api.get("/office/status-quo"),
        api.get("/reports?limit=20"),
      ]);

      if (tasksRes.status === "fulfilled") {
        const tasks = Array.isArray(tasksRes.value.data) ? tasksRes.value.data : tasksRes.value.data?.items || [];
        setCounts((c) => ({ ...c, totalTasks: tasks.length, pendingTasks: tasks.filter((t: any) => t.status !== "done").length }));
      }
      if (eventsRes.status === "fulfilled") {
        const events = Array.isArray(eventsRes.value.data) ? eventsRes.value.data : eventsRes.value.data?.items || [];
        setCounts((c) => ({ ...c, upcomingEvents: events.length }));
      }
      if (sqRes.status === "fulfilled") {
        const sq = Array.isArray(sqRes.value.data) ? sqRes.value.data : sqRes.value.data?.items || [];
        const activeSq = sq.filter((s: any) => !s.resolved_at);
        setCounts((c) => ({ ...c, activeStatusQuo: activeSq.length }));
        setStatusQuoCounts({
          red: sq.filter((s: any) => s.severity === "RED" && !s.resolved_at).length,
          amber: sq.filter((s: any) => s.severity === "AMBER" && !s.resolved_at).length,
          green: sq.filter((s: any) => s.severity === "GREEN" && !s.resolved_at).length,
        });
      }
      if (runsRes.status === "fulfilled") {
        setRuns(runsRes.value.data?.items || []);
      }
    } catch (err) {
      console.error("Failed to load report data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const runReport = async (type: string) => {
    setRunning(type);
    try {
      await api.post("/reports", { report_type: type });
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to run report");
    } finally {
      setRunning(null);
    }
  };

  const deleteRun = async (id: number) => {
    if (!window.confirm("Delete this report run?")) return;
    try {
      await api.delete(`/reports?id=${id}`);
      setRuns((prev) => prev.filter((r) => r.id !== id));
      if (viewingRun?.id === id) setViewingRun(null);
    } catch { alert("Failed to delete"); }
  };

  const getReportTypeLabel = (paramsJson: string) => {
    try {
      const p = JSON.parse(paramsJson);
      const found = REPORT_TYPES.find((r) => r.type === p.report_type);
      return found?.label || p.report_type || "Unknown";
    } catch { return "Unknown"; }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Run, view, and manage organization reports"
        actions={
          <Button variant="orange" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-white/5 rounded-xl text-amber-400"><ListTodo size={20} /></div>
          </div>
          <p className="text-2xl font-extrabold text-white">{counts.totalTasks}</p>
          <p className="text-sm text-text-secondary mt-1">Total Tasks</p>
          <p className="text-xs text-text-secondary mt-0.5">{counts.pendingTasks} pending</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-white/5 rounded-xl text-purple-400"><Calendar size={20} /></div>
          </div>
          <p className="text-2xl font-extrabold text-white">{counts.upcomingEvents}</p>
          <p className="text-sm text-text-secondary mt-1">Upcoming Events</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-white/5 rounded-xl text-blue-400"><AlertTriangle size={20} /></div>
          </div>
          <p className="text-2xl font-extrabold text-white">{counts.activeStatusQuo}</p>
          <p className="text-sm text-text-secondary mt-1">Active Status Quo</p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs text-danger">{statusQuoCounts.red} Red</span>
            <span className="text-xs text-warning">{statusQuoCounts.amber} Amber</span>
            <span className="text-xs text-success">{statusQuoCounts.green} Green</span>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-white/5 rounded-xl text-cyan-400"><TrendingUp size={20} /></div>
          </div>
          <p className="text-2xl font-extrabold text-white">{counts.pendingTasks}</p>
          <p className="text-sm text-text-secondary mt-1">Pending Tasks</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card title="Run a Report">
            <div className="space-y-3">
              {REPORT_TYPES.map(({ type, icon: Icon, label, desc, color }) => (
                <div key={type} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className={`p-3 bg-white/5 rounded-xl ${color}`}><Icon size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white">{label}</h4>
                    <p className="text-sm text-text-secondary mt-0.5">{desc}</p>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    disabled={running === type}
                    onClick={() => runReport(type)}
                  >
                    {running === type ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                    Run
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {viewingRun ? (
            <Card
              title={getReportTypeLabel(viewingRun.parameters_json)}
              subtitle={`Run #${viewingRun.id} · ${formatDate(viewingRun.created_at)}`}
              headerAction={
                <Button variant="ghost" size="sm" onClick={() => setViewingRun(null)}>
                  Close
                </Button>
              }
            >
              <div className="h-[350px]">
                <ReportVisualizer runId={viewingRun.id} reportType={
                  (() => { try { return JSON.parse(viewingRun.parameters_json || "{}").report_type; } catch { return "status_quo"; } })()
                } />
              </div>
            </Card>
          ) : (
            <Card title="Recent Runs" subtitle={`${runs.length} report runs`}>
              {runs.length === 0 ? (
                <p className="text-sm text-text-secondary py-4 text-center">No report runs yet. Click Run on a report type above.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {runs.map((run) => (
                    <div key={run.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${run.status === "done" ? "bg-success" : run.status === "failed" ? "bg-danger" : "bg-warn"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{getReportTypeLabel(run.parameters_json)}</p>
                        <p className="text-xs text-text-secondary">
                          {run.status} · {run.row_count ?? "?"} rows · {formatDate(run.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => setViewingRun(run)}>
                          View
                        </Button>
                        <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => deleteRun(run.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
