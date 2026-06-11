// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Trash2, X, Edit } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_VARIANTS = {
  todo: "neutral",
  in_progress: "primary",
  blocked: "critical",
  done: "success",
};

const PRIORITY_VARIANTS = {
  low: "neutral",
  medium: "warn",
  high: "critical",
};

const STATUSES = ["todo", "in_progress", "blocked", "done"];
const PRIORITIES = ["low", "medium", "high"];

export default function OfficeTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", status: "todo", priority: "medium",
    due_date: "", assigned_to_user_id: "", linked_entity_type: "", linked_entity_id: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/office/tasks");
      setTasks(Array.isArray(res.data) ? res.data : res.data?.items || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      const matchesSearch = !q || (t.title || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const openCreate = () => {
    setEditingTask(null);
    setForm({ title: "", description: "", status: "todo", priority: "medium", due_date: "", assigned_to_user_id: "", linked_entity_type: "", linked_entity_id: "" });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
      assigned_to_user_id: task.assigned_to_user_id || "",
      linked_entity_type: task.linked_entity_type || "",
      linked_entity_id: task.linked_entity_id || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.assigned_to_user_id) payload.assigned_to_user_id = Number(payload.assigned_to_user_id);
      if (payload.linked_entity_id) payload.linked_entity_id = Number(payload.linked_entity_id);
      if (editingTask) {
        await api.put(`/office/tasks?id=${editingTask.id}`, payload);
      } else {
        await api.post("/office/tasks", payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/office/tasks?id=${task.id}`);
      fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const quickStatus = async (task, newStatus) => {
    try {
      await api.put(`/office/tasks?id=${task.id}`, { status: newStatus });
      fetchData();
    } catch (err) { alert("Failed to update status"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Manage tasks and track progress."
        actions={
          <Button variant="orange" size="sm" onClick={openCreate}>
            <Plus size={16} /> New Task
          </Button>
        }
      />

      <Card noPadding>
        <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">Status: All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <select className="input w-auto" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="All">Priority: All</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Search size={16} className="text-text-secondary" />
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading tasks…</div>
        ) : error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            {tasks.length === 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">No tasks yet</h3>
                <p className="text-sm">Create your first task to get started.</p>
                <Button variant="orange" size="sm" onClick={openCreate}><Plus size={16} /> New Task</Button>
              </div>
            ) : (
              <p>No tasks match your filters.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">Title</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Priority</th>
                  <th className="p-4 font-bold">Due Date</th>
                  <th className="p-4 font-bold">Assigned To</th>
                  <th className="p-4 font-bold">Linked Entity</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{task.title || "Untitled"}</div>
                      {task.description && <div className="text-xs text-text-secondary mt-0.5 truncate max-w-[200px]">{task.description}</div>}
                    </td>
                    <td className="p-4">
                      <Badge variant={STATUS_VARIANTS[task.status] || "neutral"} size="sm">{task.status?.replace("_", " ") || "todo"}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={PRIORITY_VARIANTS[task.priority] || "neutral"} size="sm">{task.priority || "medium"}</Badge>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{formatDate(task.due_date)}</td>
                    <td className="p-4 text-sm text-text-secondary">{task.assigned_to_user_id || "—"}</td>
                    <td className="p-4 text-sm text-text-secondary">
                      {task.linked_entity_type ? `${task.linked_entity_type}#${task.linked_entity_id}` : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {STATUSES.map((s) => (
                          s !== task.status && (
                            <button
                              key={s}
                              className="text-[10px] uppercase tracking-wider bg-white/5 hover:bg-white/10 rounded px-2 py-0.5 text-text-secondary hover:text-white transition-colors"
                              onClick={() => quickStatus(task, s)}
                              title={`Set ${s.replace("_", " ")}`}
                            >
                              {s === "done" ? "✓" : s === "blocked" ? "!" : s === "in_progress" ? "▶" : "○"}
                            </button>
                          )
                        ))}
                        <button className="ghost-btn p-1.5 hover:bg-white/10 rounded-lg text-text-secondary" onClick={() => openEdit(task)}>
                          <Edit size={14} />
                        </button>
                        <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => handleDelete(task)}>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 sm:p-6">
          <div className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-xl font-black text-white tracking-tight">{editingTask ? "Edit Task" : "New Task"}</h2>
              <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Title *</label>
                <input className="input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Description</label>
                <textarea className="input w-full min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Status</label>
                  <select className="input w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Priority</label>
                  <select className="input w-full" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Due Date</label>
                <input type="date" className="input w-full" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Assigned To (User ID)</label>
                <input type="number" className="input w-full" value={form.assigned_to_user_id} onChange={(e) => setForm({ ...form, assigned_to_user_id: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Linked Entity Type</label>
                  <input className="input w-full" value={form.linked_entity_type} onChange={(e) => setForm({ ...form, linked_entity_type: e.target.value })} placeholder="e.g. contract" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Linked Entity ID</label>
                  <input type="number" className="input w-full" value={form.linked_entity_id} onChange={(e) => setForm({ ...form, linked_entity_id: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
