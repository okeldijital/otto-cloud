// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Pin, PinOff, Trash2, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const CATEGORIES = ["General", "Meeting", "Idea", "Task", "Reference", "Other"];

export default function OfficeNotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "General", color: "", tags: "", pinned: false });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/office/notes");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      setNotes(items);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notes.filter((n) => {
      const matchesSearch = !q || (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "All" || (n.category || "").toLowerCase() === categoryFilter.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [notes, search, categoryFilter]);

  const openCreate = () => {
    setEditingNote(null);
    setForm({ title: "", content: "", category: "General", color: "", tags: "", pinned: false });
    setShowModal(true);
  };

  const openEdit = (note) => {
    setEditingNote(note);
    setForm({
      title: note.title || "",
      content: note.content || "",
      category: note.category || "General",
      color: note.color || "",
      tags: Array.isArray(note.tags) ? note.tags.join(", ") : note.tags || "",
      pinned: note.pinned || false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      if (editingNote) {
        await api.put(`/office/notes?id=${editingNote.id}`, payload);
      } else {
        await api.post("/office/notes", payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm(`Delete "${note.title}"?`)) return;
    try {
      await api.delete(`/office/notes?id=${note.id}`);
      fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const togglePin = async (note) => {
    try {
      await api.put(`/office/notes?id=${note.id}`, { pinned: !note.pinned });
      fetchData();
    } catch (err) { alert("Failed to update pin"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        subtitle="Internal notes and reminders."
        actions={
          <Button variant="orange" size="sm" onClick={openCreate}>
            <Plus size={16} /> New Note
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">Category: All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Search size={16} className="text-text-secondary" />
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-text-secondary">Loading notes…</div>
      ) : error ? (
        <div className="p-12 text-center text-danger">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-text-secondary">
          {notes.length === 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">No notes yet</h3>
              <p className="text-sm">Create your first note to get started.</p>
              <Button variant="orange" size="sm" onClick={openCreate}><Plus size={16} /> New Note</Button>
            </div>
          ) : (
            <p>No notes match your filters.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((note) => (
            <Card
              key={note.id}
              className="cursor-pointer hover:border-white/20 transition-all group"
              contentClassName="p-0"
            >
              <div className="p-5" onClick={() => openEdit(note)}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {note.pinned && <Pin size={14} className="text-accent shrink-0" />}
                    <h3 className="font-semibold text-white truncate">{note.title || "Untitled"}</h3>
                  </div>
                </div>
                <p className="text-sm text-text-secondary line-clamp-3">
                  {note.content ? note.content.substring(0, 100) + (note.content.length > 100 ? "…" : "") : "No content"}
                </p>
              </div>
              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {note.category && <Badge variant="neutral" size="sm">{note.category}</Badge>}
                  {note.color && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: note.color }} />
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="ghost-btn p-1.5 hover:bg-white/10 rounded-lg text-text-secondary" onClick={(e) => { e.stopPropagation(); togglePin(note); }}>
                    {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(note); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="px-5 pb-4 text-xs text-text-secondary">{formatDate(note.created_at)}</div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 sm:p-6">
          <div className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-xl font-black text-white tracking-tight">{editingNote ? "Edit Note" : "New Note"}</h2>
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
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Content</label>
                <textarea className="input w-full min-h-[120px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Category</label>
                <select className="input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Color (hex)</label>
                <input className="input w-full" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. #ff6b6b" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Tags (comma separated)</label>
                <input className="input w-full" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. important, follow-up" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 accent-accent" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                <span className="text-sm text-white">Pinned</span>
              </label>
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
