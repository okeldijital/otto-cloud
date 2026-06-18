"use client";
import { useState, useEffect } from "react";
import { Mail, Shield, UserX, UserCheck, Key, Users, Plus, X, Trash2, Link } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

export default function UsersTab({ onError }: { onError: (msg: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<"direct" | "link">("direct");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [resetPassUserId, setResetPassUserId] = useState<number | null>(null);
  const [resetPass, setResetPass] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        api.get("/iam/users"),
        api.get("/iam/roles"),
      ]);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setRoles(Array.isArray(rRes.data) ? rRes.data : []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (inviteMethod === "direct" && !invitePassword.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      if (inviteMethod === "link") {
        const res = await api.post("/invitations", { email: inviteEmail, message: inviteMessage || undefined });
        setInviteResult(`Invite link: ${res.data.invite_url}`);
      } else {
        await api.post("/users", { email: inviteEmail, password: invitePassword, name: inviteName || undefined }, { params: { action: "invite" } });
        setInviteEmail(""); setInvitePassword(""); setInviteName(""); setInviteMessage("");
        setShowInvite(false);
        fetchUsers();
      }
    } catch (err: any) { onError(err?.response?.data?.error || "Failed to invite"); }
    finally { setInviting(false); }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      await api.post("/iam/users", { action: "suspend", user_id: userId });
      fetchUsers();
    } catch { onError("Failed to toggle status"); }
  };

  const handleResetPassword = async () => {
    if (!resetPassUserId || !resetPass) return;
    try {
      await api.post("/iam/users", { action: "reset-password", user_id: resetPassUserId, password: resetPass });
      setResetPassUserId(null); setResetPass("");
    } catch (err: any) { onError(err?.response?.data?.error || "Failed"); }
  };

  const handleAssignRole = async (userId: number, roleId: number) => {
    try {
      await api.post("/iam/users", { action: "assign-role", user_id: userId, role_id: roleId });
      fetchUsers();
    } catch (err: any) { onError(err?.response?.data?.error || "Failed to assign role"); }
  };

  const handleRemoveRole = async (userId: number, roleId: number) => {
    try {
      await api.post("/iam/users", { action: "remove-role", user_id: userId, role_id: roleId });
      fetchUsers();
    } catch (err: any) { onError(err?.response?.data?.error || "Failed to remove role"); }
  };

  if (loading) return <div className="p-8 text-center text-text-secondary">Loading users...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={() => setShowInvite(!showInvite)}>
          <Plus size={14} /> Invite User
        </Button>
      </div>
      {showInvite && (
        <Card title="Invite User" subtitle="Add a new user to your organization">
          <div className="flex gap-2 mb-4">
            <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${inviteMethod === "link" ? "bg-accent text-black" : "bg-white/5 text-text-secondary"}`} onClick={() => setInviteMethod("link")}><Link size={12} className="inline mr-1" /> Invite by Link</button>
            <button className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${inviteMethod === "direct" ? "bg-accent text-black" : "bg-white/5 text-text-secondary"}`} onClick={() => setInviteMethod("direct")}><Mail size={12} className="inline mr-1" /> Direct Invite</button>
          </div>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className="input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email *" required />
              {inviteMethod === "direct" && <input className="input" type="text" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Password *" required />}
              {inviteMethod === "direct" && <input className="input" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Full name" />}
            </div>
            {inviteMethod === "link" && (
              <input className="input w-full" value={inviteMessage} onChange={e => setInviteMessage(e.target.value)} placeholder="Personal message (optional)" />
            )}
            {inviteResult && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3">
                <p className="text-xs text-accent break-all">{inviteResult}</p>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(inviteResult?.replace("Invite link: ", "") || "")} className="mt-1">Copy Link</Button>
              </div>
            )}
            <Button variant="primary" size="sm" type="submit" disabled={inviting}>
              {inviteMethod === "link" ? <Link size={14} /> : <Mail size={14} />}
              {inviting ? "Sending..." : inviteMethod === "link" ? "Generate Invite Link" : "Send Invite"}
            </Button>
          </form>
        </Card>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
              <th className="p-3 font-bold">Name</th>
              <th className="p-3 font-bold">Email</th>
              <th className="p-3 font-bold">Roles</th>
              <th className="p-3 font-bold">Teams</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">Last Login</th>
              <th className="p-3 font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-3 text-sm text-white font-medium">{u.name || u.email}</td>
                <td className="p-3 text-sm text-text-secondary">{u.email}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1 items-center">
                    {u.roles?.map((r: any) => (
                      <span key={r.id} className="inline-flex items-center gap-1 bg-white/5 text-text-secondary border border-white/10 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold">
                        {r.name}
                        <button onClick={() => handleRemoveRole(u.id, r.id)} className="hover:text-danger transition-colors"><X size={10} /></button>
                      </span>
                    ))}
                    <select
                      className="text-xs bg-white/5 border border-white/10 rounded px-1 py-0.5 text-text-secondary"
                      value=""
                      onChange={e => { if (e.target.value) handleAssignRole(u.id, parseInt(e.target.value)); }}
                    >
                      <option value="">+ Add</option>
                      {roles.filter((r: any) => !u.roles?.some((ur: any) => ur.id === r.id)).map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.teams?.map((t: any) => (
                      <Badge key={t.id} variant="default" size="sm">{t.name}</Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={u.is_active ? "success" : "critical"} size="sm">{u.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="p-3 text-sm text-text-secondary">{u.last_login ? new Date(u.last_login).toLocaleDateString() : "\u2014"}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(u.id)} title={u.is_active ? "Suspend" : "Activate"}>
                      {u.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setResetPassUserId(u.id)} title="Reset Password">
                      <Key size={12} />
                    </Button>
                  </div>
                  {resetPassUserId === u.id && (
                    <div className="mt-2 flex gap-2">
                      <input className="input text-xs flex-1" type="text" value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="New password" />
                      <Button variant="primary" size="sm" onClick={handleResetPassword}>Set</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setResetPassUserId(null); setResetPass(""); }}><X size={12} /></Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
