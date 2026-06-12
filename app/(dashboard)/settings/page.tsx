"use client";

import { useState, useEffect } from "react";
import { User, Save, Key, Copy, Eye, EyeOff, X, Plus, Trash2, Users, Mail, Shield, Clock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

function formatDate(d: string | null) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [tab, setTab] = useState<"profile" | "api-keys" | "team">("profile");

  const [keys, setKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState("catalog:read,royalties:read,contracts:read");
  const [keyExpiry, setKeyExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [team, setTeam] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");

  useEffect(() => {
    api.get("/users").then(r => {
      setUser(r.data);
      setName(r.data?.name || "");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await api.get("/api-keys");
      setKeys(Array.isArray(res.data) ? res.data : []);
    } catch { setKeys([]); }
    finally { setLoadingKeys(false); }
  };

  useEffect(() => { if (tab === "api-keys") fetchKeys(); }, [tab]);

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await api.get("/users", { params: { action: "team" } });
      setTeam(Array.isArray(res.data) ? res.data : []);
    } catch { setTeam([]); }
    finally { setLoadingTeam(false); }
  };

  useEffect(() => { if (tab === "team") fetchTeam(); }, [tab]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !invitePassword.trim()) return;
    setInviting(true);
    setError("");
    setInviteSuccess("");
    try {
      await api.post("/users", { email: inviteEmail, password: invitePassword, name: inviteName || undefined, role: inviteRole }, { params: { action: "invite" } });
      setInviteSuccess(`Invited ${inviteEmail}`);
      setInviteEmail("");
      setInvitePassword("");
      setInviteName("");
      setInviteRole("user");
      fetchTeam();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to invite");
    } finally { setInviting(false); }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/users", { full_name: name });
      setUser(res.data);
    } catch {
      setError("Failed to save");
    } finally { setSaving(false); }
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/api-keys", {
        name: keyName,
        scopes: keyScopes || undefined,
        expires_in_days: keyExpiry || undefined,
      });
      setShowNewKey(res.data.api_key);
      setKeyName("");
      fetchKeys();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create key");
    } finally { setCreating(false); }
  };

  const handleRevokeKey = async (id: number) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await api.delete("/api-keys", { params: { id } });
      fetchKeys();
    } catch { setError("Failed to revoke key"); }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account and application settings" />

      <div className="flex gap-1 border-b border-white/5 mb-6">
        <button
          className={`px-4 py-2 text-sm font-bold transition-colors ${tab === "profile" ? "text-white border-b-2 border-accent" : "text-text-secondary hover:text-white"}`}
          onClick={() => setTab("profile")}
        >
          <User size={14} className="inline mr-1" /> Profile
        </button>
        <button
          className={`px-4 py-2 text-sm font-bold transition-colors ${tab === "api-keys" ? "text-white border-b-2 border-accent" : "text-text-secondary hover:text-white"}`}
          onClick={() => setTab("api-keys")}
        >
          <Key size={14} className="inline mr-1" /> API Keys
        </button>
        <button
          className={`px-4 py-2 text-sm font-bold transition-colors ${tab === "team" ? "text-white border-b-2 border-accent" : "text-text-secondary hover:text-white"}`}
          onClick={() => setTab("team")}
        >
          <Users size={14} className="inline mr-1" /> Team
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      )}

      {tab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Profile" subtitle="Manage your account details">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Name</label>
                <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Email</label>
                <input className="input w-full" value={user?.email || ""} disabled />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Role</label>
                <input className="input w-full" value={user?.role || (user?.is_superuser ? "Admin" : "User")} disabled />
              </div>
              <Button variant="primary" size="sm" type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Card>
          <Card title="Preferences" subtitle="Application preferences">
            <p className="text-sm text-text-secondary">Additional settings will appear here as the platform evolves.</p>
          </Card>
        </div>
      )}

      {tab === "api-keys" && (
        <div className="space-y-6">
          <Card title="Create API Key">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Key Name <span className="text-danger">*</span></label>
                  <input className="input w-full" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. Production Integration" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Expires In (days, optional)</label>
                  <input type="number" className="input w-full" value={keyExpiry} onChange={(e) => setKeyExpiry(e.target.value)} placeholder="Leave empty = never" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Scopes (comma-separated)</label>
                <input className="input w-full font-mono text-xs" value={keyScopes} onChange={(e) => setKeyScopes(e.target.value)} placeholder="catalog:read,royalties:read" />
                <p className="text-[10px] text-text-secondary mt-1">
                  Available: catalog:read, catalog:write, royalties:read, contracts:read, reports:read
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={handleCreateKey} disabled={creating || !keyName.trim()}>
                {creating ? "Creating..." : <><Plus size={14} /> Create API Key</>}
              </Button>
            </div>
          </Card>

          {showNewKey && (
            <Card title="New API Key Created">
              <div className="space-y-3">
                <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
                  <p className="text-xs text-danger font-bold mb-2">Save this key now. It will not be shown again.</p>
                  <code className="text-sm font-mono text-white break-all select-all bg-white/5 p-2 rounded block">{showNewKey}</code>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(showNewKey); }}>
                  <Copy size={14} /> Copy Key
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowNewKey(null)}>
                  <X size={14} /> Dismiss
                </Button>
              </div>
            </Card>
          )}

          <Card title="Your API Keys">
            {loadingKeys ? (
              <div className="p-8 text-center text-text-secondary">Loading...</div>
            ) : keys.length === 0 ? (
              <p className="text-sm text-text-secondary">No API keys created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold">Key</th>
                      <th className="p-3 font-bold">Scopes</th>
                      <th className="p-3 font-bold">Last Used</th>
                      <th className="p-3 font-bold">Expires</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-sm text-white font-medium">{k.name}</td>
                        <td className="p-3">
                          <code className="text-xs font-mono text-text-secondary">{k.prefix}...{k.key_last_four}</code>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(k.scopes || "").split(",").filter(Boolean).map((s: string) => (
                              <Badge key={s} variant="neutral" size="sm">{s.trim()}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-text-secondary">{formatDate(k.last_used_at)}</td>
                        <td className="p-3 text-sm text-text-secondary">{formatDate(k.expires_at)}</td>
                        <td className="p-3">
                          <Badge variant={k.is_active ? "success" : "critical"} size="sm">
                            {k.is_active ? "Active" : "Revoked"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {k.is_active && (
                            <Button variant="ghost" size="sm" onClick={() => handleRevokeKey(k.id)}>
                              <Trash2 size={12} /> Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "team" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Invite Member" subtitle="Add a new user to your organization">
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Email <span className="text-danger">*</span></label>
                <input className="input w-full" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com" required />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Temporary Password <span className="text-danger">*</span></label>
                <input className="input w-full" type="text" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="Set an initial password" required />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Full Name</label>
                <input className="input w-full" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold block mb-1">Role</label>
                <select className="input w-full" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button variant="primary" size="sm" type="submit" disabled={inviting || !inviteEmail.trim() || !invitePassword.trim()}>
                {inviting ? "Inviting..." : <><Mail size={14} /> Send Invite</>}
              </Button>
              {inviteSuccess && <p className="text-xs text-success mt-2">{inviteSuccess}</p>}
            </form>
          </Card>
          <Card title="Team Members">
            {loadingTeam ? (
              <div className="p-8 text-center text-text-secondary">Loading...</div>
            ) : team.length === 0 ? (
              <p className="text-sm text-text-secondary">No team members yet.</p>
            ) : (
              <div className="space-y-3">
                {team.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div>
                      <p className="text-sm text-white font-medium">{m.name || m.email}</p>
                      <p className="text-xs text-text-secondary">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.is_active ? "success" : "critical"} size="sm">{m.is_active ? "Active" : "Inactive"}</Badge>
                      <Badge variant={m.role === "admin" ? "neutral" : "default"} size="sm">
                        {m.role || "user"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
