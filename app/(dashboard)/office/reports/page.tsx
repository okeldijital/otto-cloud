// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, FileText, ListTodo, Calendar, BarChart3, Activity, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

const reportTypes = [
  { icon: FileText, label: "Contract Status Report", desc: "View contract completeness status", color: "text-emerald-400" },
  { icon: ShieldCheck, label: "Governance Dashboard", desc: "View status quo items", color: "text-blue-400" },
  { icon: Activity, label: "Activity Report", desc: "Recent activity history", color: "text-purple-400" },
  { icon: ListTodo, label: "Task Completion", desc: "Task completion status", color: "text-amber-400" },
];

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function OfficeReportsPage() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ totalTasks: 0, pendingTasks: 0, upcomingEvents: 0, activeStatusQuo: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [statusQuoCounts, setStatusQuoCounts] = useState({ red: 0, amber: 0, green: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes, activityRes, sqRes] = await Promise.allSettled([
        api.get("/office/tasks"),
        api.get("/office/events?action=upcoming"),
        api.get("/office/activities"),
        api.get("/office/status-quo"),
      ]);

      if (tasksRes.status === "fulfilled") {
        const tasks = Array.isArray(tasksRes.value.data) ? tasksRes.value.data : tasksRes.value.data?.items || [];
        setCounts((c) => ({ ...c, totalTasks: tasks.length, pendingTasks: tasks.filter((t) => t.status !== "done").length }));
      }

      if (eventsRes.status === "fulfilled") {
        const events = Array.isArray(eventsRes.value.data) ? eventsRes.value.data : eventsRes.value.data?.items || [];
        setCounts((c) => ({ ...c, upcomingEvents: events.length }));
      }

      if (activityRes.status === "fulfilled") {
        const acts = Array.isArray(activityRes.value.data) ? activityRes.value.data : activityRes.value.data?.items || [];
        setRecentActivity(acts.slice(0, 10));
      }

      if (sqRes.status === "fulfilled") {
        const sq = Array.isArray(sqRes.value.data) ? sqRes.value.data : sqRes.value.data?.items || [];
        const activeSq = sq.filter((s) => !s.resolved_at);
        setCounts((c) => ({ ...c, activeStatusQuo: activeSq.length }));
        setStatusQuoCounts({
          red: sq.filter((s) => s.severity === "RED" && !s.resolved_at).length,
          amber: sq.filter((s) => s.severity === "AMBER" && !s.resolved_at).length,
          green: sq.filter((s) => s.severity === "GREEN" && !s.resolved_at).length,
        });
      }
    } catch (err) {
      console.error("Failed to load report data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Office reports and analytics overview."
        actions={
          <Button variant="orange" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-text-secondary">Loading report data…</div>
      ) : (
        <>
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
              <Card title="Report Types">
                <div className="space-y-3">
                  {reportTypes.map(({ icon: Icon, label, desc, color }) => (
                    <div key={label} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                      <div className={`p-3 bg-white/5 rounded-xl ${color}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white">{label}</h4>
                        <p className="text-sm text-text-secondary mt-0.5">{desc}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {}}>View</Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div>
              <Card title="Recent Activity">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-text-secondary py-4 text-center">No recent activity recorded.</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {recentActivity.map((act, i) => (
                      <div key={act.id || i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{act.action || act.description || "Activity"}</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {act.entity_type && <Badge variant="neutral" size="sm">{act.entity_type}</Badge>}
                            {" "}{formatDate(act.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
