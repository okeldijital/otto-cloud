"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Save, Users, UserPlus } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

export default function TeamsTab({ onError }: { onError: (msg: string) => void }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const [tRes, uRes] = await Promise.all([
        api.get("/iam/teams"),
        api.get("/iam/users"),
      ]);
      setTeams(Array.isArray(tRes.data) ? tRes.data : []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
    } catch { setTeams([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const fetchMembers = async (teamId: number) => {
    try {
      const res = await api.get("/iam/teams", { params: { action: "members", team_id: teamId } });
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch { setMembers([]); }
  };

  const toggleExpand = (teamId: number) => {
    if (expandedTeam === teamId) { setExpandedTeam(null); return; }
    setExpandedTeam(teamId);
    fetchMembers(teamId);
  };

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    setSaving(true);
    try {
      await api.post("/iam/teams", { name: teamName, description: teamDesc || undefined });
      setTeamName(""); setTeamDesc(""); setCreating(false);
      fetchTeams();
    } catch (err: any) { onError(err?.response?.data?.error || "Failed"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!teamName.trim() || !editingTeam) return;
    setSaving(true);
    try {
      await api.put("/iam/teams", { id: editingTeam.id, name: teamName, description: teamDesc });
      setEditingTeam(null); setTeamName(""); setTeamDesc("");
      fetchTeams();
    } catch (err: any) { onError(err?.response?.data?.error || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this team?")) return;
    try {
      await api.delete("/iam/teams", { params: { id } });
      fetchTeams();
    } catch (err: any) { onError(err?.response?.data?.error || "Failed"); }
  };

  const handleAddMember = async (teamId: number, userId: number) => {
    try {
      await api.post("/iam/teams", { action: "add-member", team_id: teamId, user_id: userId });
      fetchMembers(teamId);
    } catch (err: any) { onError(err?.response?.data?.error || "Failed"); }
  };

  const handleRemoveMember = async (teamId: number, userId: number) => {
    try {
      await api.put("/iam/teams", { action: "remove-member", id: teamId, user_id: userId });
      fetchMembers(teamId);
    } catch (err: any) { onError(err?.response?.data?.error || "Failed"); }
  };

  if (loading) return <div className="p-8 text-center text-text-secondary">Loading teams...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> Create Team
        </Button>
      </div>

      {creating && (
        <Card title="Create Team">
          <div className="space-y-3">
            <input className="input w-full" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name *" />
            <input className="input w-full" value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description (optional)" />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleCreate} disabled={saving || !teamName.trim()}><Save size={14} /> Create</Button>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}><X size={14} /> Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {editingTeam && (
        <Card title="Edit Team">
          <div className="space-y-3">
            <input className="input w-full" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name *" />
            <input className="input w-full" value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="Description" />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleUpdate} disabled={saving || !teamName.trim()}><Save size={14} /> Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingTeam(null)}><X size={14} /> Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {teams.map(t => (
        <div key={t.id}>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-2 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => toggleExpand(t.id)}>
            <div>
              <p className="text-sm text-white font-medium">{t.name}</p>
              <p className="text-xs text-text-secondary">{t.description || `${t._count?.team_members || 0} members`}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">{t._count?.team_members || 0} members</Badge>
              <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditingTeam(t); setTeamName(t.name); setTeamDesc(t.description || ""); }}>
                <Edit2 size={12} />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDelete(t.id); }}>
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
          {expandedTeam === t.id && (
            <div className="ml-4 p-3 bg-white/5 rounded-xl mb-2 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  className="input text-xs flex-1"
                  value=""
                  onChange={e => { if (e.target.value) handleAddMember(t.id, parseInt(e.target.value)); }}
                >
                  <option value="">Add member...</option>
                  {users.filter((u: any) => !members.some((m: any) => m.user_id === u.id || m.users?.id === u.id)).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
                <UserPlus size={14} className="text-text-secondary" />
              </div>
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{m.users?.name || m.users?.email}</span>
                  <button onClick={() => handleRemoveMember(t.id, m.user_id)} className="text-danger hover:text-danger/80"><X size={12} /></button>
                </div>
              ))}
              {members.length === 0 && <p className="text-xs text-text-secondary">No members yet</p>}
            </div>
          )}
        </div>
      ))}
      {teams.length === 0 && <p className="text-center text-text-secondary py-8">No teams created yet.</p>}
    </div>
  );
}
