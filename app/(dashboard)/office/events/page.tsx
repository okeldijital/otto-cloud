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

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_VARIANTS = {
  Planned: "neutral",
  Completed: "success",
  Cancelled: "critical",
  Overdue: "warn",
};

const EVENT_TYPES = ["Release", "Contract Milestone", "Registration", "Deadline", "Meeting", "Reminder", "Other"];
const EVENT_STATUSES = ["Planned", "Completed", "Cancelled"];

export default function OfficeEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", event_type: "Meeting", status: "Planned",
    start_datetime: "", end_datetime: "", all_day: false,
    location: "", category: "", related_entity_type: "", related_entity_id: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/office/events");
      setEvents(Array.isArray(res.data) ? res.data : res.data?.items || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const now = new Date();
    return events.filter((e) => {
      const matchesSearch = !q || (e.title || "").toLowerCase().includes(q);
      const matchesType = typeFilter === "All" || (e.event_type || "") === typeFilter;
      let matchesStatus = statusFilter === "All" || (e.status || "") === statusFilter;
      if (statusFilter === "Overdue" && e.status === "Planned" && e.start_datetime && new Date(e.start_datetime) < now) {
        matchesStatus = true;
      }
      return matchesSearch && matchesType && matchesStatus;
    }).map((e) => {
      const now2 = new Date();
      if (e.status === "Planned" && e.start_datetime && new Date(e.start_datetime) < now2) {
        return { ...e, _computedStatus: "Overdue" };
      }
      return e;
    });
  }, [events, search, typeFilter, statusFilter]);

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ title: "", description: "", event_type: "Meeting", status: "Planned", start_datetime: "", end_datetime: "", all_day: false, location: "", category: "", related_entity_type: "", related_entity_id: "" });
    setShowModal(true);
  };

  const openEdit = (evt) => {
    setEditingEvent(evt);
    setForm({
      title: evt.title || "",
      description: evt.description || "",
      event_type: evt.event_type || "Meeting",
      status: evt.status || "Planned",
      start_datetime: evt.start_datetime ? evt.start_datetime.slice(0, 16) : "",
      end_datetime: evt.end_datetime ? evt.end_datetime.slice(0, 16) : "",
      all_day: evt.all_day || false,
      location: evt.location || "",
      category: evt.category || "",
      related_entity_type: evt.related_entity_type || "",
      related_entity_id: evt.related_entity_id || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.related_entity_id) payload.related_entity_id = Number(payload.related_entity_id);
      if (editingEvent) {
        await api.put(`/office/events?id=${editingEvent.id}`, payload);
      } else {
        await api.post("/office/events", payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (evt) => {
    if (!window.confirm(`Delete "${evt.title}"?`)) return;
    try {
      await api.delete(`/office/events?id=${evt.id}`);
      fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const getStatus = (evt) => evt._computedStatus || evt.status || "Planned";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle="Calendar and event management."
        actions={
          <Button variant="orange" size="sm" onClick={openCreate}>
            <Plus size={16} /> New Event
          </Button>
        }
      />

      <Card noPadding>
        <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="All">Type: All</option>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">Status: All</option>
              {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="Overdue">Overdue</option>
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Search size={16} className="text-text-secondary" />
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading events…</div>
        ) : error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            {events.length === 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">No events yet</h3>
                <p className="text-sm">Create your first event to get started.</p>
                <Button variant="orange" size="sm" onClick={openCreate}><Plus size={16} /> New Event</Button>
              </div>
            ) : (
              <p>No events match your filters.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">Title</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Start</th>
                  <th className="p-4 font-bold">End</th>
                  <th className="p-4 font-bold">Location</th>
                  <th className="p-4 font-bold">Linked Entity</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((evt) => {
                  const status = getStatus(evt);
                  return (
                    <tr key={evt.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-white">{evt.title || "Untitled"}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="neutral" size="sm">{evt.event_type || "—"}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={STATUS_VARIANTS[status] || "neutral"} size="sm">{status}</Badge>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{formatDateTime(evt.start_datetime)}</td>
                      <td className="p-4 text-sm text-text-secondary">{evt.end_datetime ? formatDateTime(evt.end_datetime) : "—"}</td>
                      <td className="p-4 text-sm text-text-secondary">{evt.location || "—"}</td>
                      <td className="p-4 text-sm text-text-secondary">
                        {evt.related_entity_type ? `${evt.related_entity_type}#${evt.related_entity_id}` : "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <button className="ghost-btn p-1.5 hover:bg-white/10 rounded-lg text-text-secondary" onClick={() => openEdit(evt)}>
                            <Edit size={14} />
                          </button>
                          <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => handleDelete(evt)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 sm:p-6">
          <div className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-xl font-black text-white tracking-tight">{editingEvent ? "Edit Event" : "New Event"}</h2>
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
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Event Type</label>
                  <select className="input w-full" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Status</label>
                  <select className="input w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Start *</label>
                  <input type="datetime-local" className="input w-full" value={form.start_datetime} onChange={(e) => setForm({ ...form, start_datetime: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">End</label>
                  <input type="datetime-local" className="input w-full" value={form.end_datetime} onChange={(e) => setForm({ ...form, end_datetime: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 accent-accent" checked={form.all_day} onChange={(e) => setForm({ ...form, all_day: e.target.checked })} />
                <span className="text-sm text-white">All Day</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Location</label>
                  <input className="input w-full" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Category</label>
                  <input className="input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Related Entity Type</label>
                  <input className="input w-full" value={form.related_entity_type} onChange={(e) => setForm({ ...form, related_entity_type: e.target.value })} placeholder="e.g. contract" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Related Entity ID</label>
                  <input type="number" className="input w-full" value={form.related_entity_id} onChange={(e) => setForm({ ...form, related_entity_id: e.target.value })} />
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
