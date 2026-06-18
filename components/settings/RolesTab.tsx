"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Save, Shield } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

export default function RolesTab({ onError }: { onError: (msg: string) => void }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        api.get("/iam/roles"),
        api.get("/iam/permissions"),
      ]);
      setRoles(Array.isArray(rRes.data) ? rRes.data : []);
      setPermissions(pRes.data?.permissions || []);
    } catch { setRoles([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const startEdit = (role: any) => {
    setEditingRole(role);
    setNewName(role.name);
    setNewDesc(role.description || "");
    setSelectedPerms(new Set(role.role_permissions?.map((rp: any) => rp.permission?.id || rp.permission_id) || []));
  };

  const startCreate = () => {
    setCreating(true);
    setEditingRole({ id: null, name: "", description: "", is_system: false });
    setNewName("");
    setNewDesc("");
    setSelectedPerms(new Set());
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const permIds = Array.from(selectedPerms);
      if (editingRole?.id) {
        await api.put("/iam/roles", { id: editingRole.id, name: newName, description: newDesc, permission_ids: permIds });
      } else {
        await api.post("/iam/roles", { name: newName, description: newDesc, permission_ids: permIds });
      }
      setEditingRole(null); setCreating(false);
      fetchData();
    } catch (err: any) { onError(err?.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this role?")) return;
    try {
      await api.delete("/iam/roles", { params: { id } });
      fetchData();
    } catch (err: any) { onError(err?.response?.data?.error || "Failed to delete"); }
  };

  const togglePerm = (pid: number) => {
    const next = new Set(selectedPerms);
    if (next.has(pid)) next.delete(pid); else next.add(pid);
    setSelectedPerms(next);
  };

  const groupedPerms: Record<string, typeof permissions> = {};
  for (const p of permissions) {
    if (!groupedPerms[p.module]) groupedPerms[p.module] = [];
    groupedPerms[p.module].push(p);
  }

  if (loading) return <div className="p-8 text-center text-text-secondary">Loading roles...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={startCreate}>
          <Plus size={14} /> Create Role
        </Button>
      </div>

      {editingRole && (
        <Card title={creating ? "Create Role" : "Edit Role"}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Name</label>
                <input className="input w-full" value={newName} onChange={e => setNewName(e.target.value)} disabled={editingRole?.is_system} />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Description</label>
                <input className="input w-full" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              </div>
            </div>
            {editingRole?.is_system && <p className="text-xs text-warning">System roles cannot be renamed</p>}
            <div>
              <label className="text-xs text-text-secondary block mb-2">Permissions</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {Object.entries(groupedPerms).map(([module, perms]) => (
                  <div key={module} className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">{module}</p>
                    {perms.map(p => (
                      <label key={p.id} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white cursor-pointer">
                        <input type="checkbox" checked={selectedPerms.has(p.id)} onChange={() => togglePerm(p.id)} className="accent-accent" />
                        {p.name}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !newName.trim()}>
                <Save size={14} /> {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditingRole(null); setCreating(false); }}>
                <X size={14} /> Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
              <th className="p-3 font-bold">Role</th>
              <th className="p-3 font-bold">Description</th>
              <th className="p-3 font-bold">Permissions</th>
              <th className="p-3 font-bold">Users</th>
              <th className="p-3 font-bold">Type</th>
              <th className="p-3 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-3 text-sm text-white font-medium">{r.name}</td>
                <td className="p-3 text-sm text-text-secondary">{r.description || "\u2014"}</td>
                <td className="p-3 text-sm text-text-secondary">{r._count?.user_roles || r.user_roles?.length || 0}</td>
                <td className="p-3 text-sm text-text-secondary">{r.role_permissions?.length || 0}</td>
                <td className="p-3"><Badge variant={r.is_system ? "neutral" : "default"} size="sm">{r.is_system ? "System" : "Custom"}</Badge></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(r)}><Edit2 size={12} /></Button>
                    {!r.is_system && <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}><Trash2 size={12} /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
