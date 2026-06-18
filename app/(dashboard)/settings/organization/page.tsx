"use client";
import { useState, useEffect } from "react";
import {
  Building2, Palette, Users, Shield, Key, Bell, CreditCard,
  Lock, Clock, Save, Plus, Trash2, RefreshCw, AlertCircle,
  Globe, Mail, Phone, MapPin, Tag, Percent, Brain,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useOrg } from "@/contexts/OrgContext";
import api from "@/lib/api";

type OrgTab = "general" | "branding" | "team" | "roles" | "permissions" | "integrations" | "notifications" | "billing" | "security" | "audit-logs" | "ai";

const ORG_TABS: { id: OrgTab; label: string; icon: any }[] = [
  { id: "general", label: "General", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "team", label: "Team", icon: Users },
  { id: "roles", label: "Roles", icon: Shield },
  { id: "permissions", label: "Permissions", icon: Key },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Lock },
  { id: "audit-logs", label: "Audit Logs", icon: Clock },
  { id: "ai", label: "AI", icon: Brain },
];

export default function OrgSettingsPage() {
  const { currentOrg, refreshOrgs } = useOrg();
  const [tab, setTab] = useState<OrgTab>("general");
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const orgId = (currentOrg as any)?.id;
    if (orgId) {
      api.get("/organizations/current").then(r => {
        setOrg(r.data);
      }).catch(() => setError("Failed to load organization"))
      .finally(() => setLoading(false));
    }
  }, [currentOrg]);

  const handleSave = async (section: string, data: any) => {
    setSaving(true);
    setError("");
    try {
      let res;
      if (section === "branding") {
        res = await api.put("/organizations/branding", data);
      } else if (section === "ai") {
        res = await api.put("/organizations/ai", data);
      } else {
        res = await api.put("/organizations/current", data);
      }
      setOrg((prev: any) => ({ ...prev, ...res.data }));
      await refreshOrgs();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!org) return <div className="p-12 text-center text-text-secondary">Organization not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Settings"
        subtitle={`Manage ${org.display_name || org.name}`}
      />

      <div className="flex gap-1 border-b border-white/5 mb-6 overflow-x-auto">
        {ORG_TABS.map(t => (
          <button
            key={t.id}
            className={`whitespace-nowrap px-4 py-2 text-sm font-bold transition-colors ${
              tab === t.id ? "text-white border-b-2 border-accent" : "text-text-secondary hover:text-white"
            }`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={14} className="inline mr-1" /> {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4 mb-4">
          <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      )}

      {tab === "general" && <GeneralTab org={org} onSave={(d: any) => handleSave("general", d)} saving={saving} />}
      {tab === "branding" && <BrandingTab org={org} onSave={(d: any) => handleSave("branding", d)} saving={saving} />}
      {tab === "team" && <TeamTab />}
      {tab === "roles" && <RolesTab />}
      {tab === "permissions" && <PermissionsTab />}
      {tab === "integrations" && <IntegrationsTab />}
      {tab === "billing" && <BillingTab org={org} />}
      {tab === "security" && <SecurityTab org={org} />}
      {tab === "audit-logs" && <AuditLogTab />}
      {tab === "ai" && <AITab org={org} onSave={(d: any) => handleSave("ai", d)} saving={saving} />}
      {tab === "notifications" && <NotificationsTab />}
    </div>
  );
}

function GeneralTab({ org, onSave, saving }: { org: any; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    name: org?.name || "",
    display_name: org?.display_name || "",
    legal_name: org?.legal_name || "",
    org_type: org?.org_type || "record_label",
    website: org?.website || "",
    email: org?.email || "",
    phone: org?.phone || "",
    physical_address: org?.physical_address || "",
    country: org?.country || "",
    province_state: org?.province_state || "",
    city: org?.city || "",
    currency: org?.currency || "USD",
    timezone: org?.timezone || "America/New_York",
    tax_number: org?.tax_number || "",
    registration_number: org?.registration_number || "",
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Organization Details">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Name *</label>
            <input className="input w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Trading Name</label>
            <input className="input w-full" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Legal Name</label>
            <input className="input w-full" value={form.legal_name} onChange={e => setForm(f => ({ ...f, legal_name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Organization Type</label>
            <select className="input w-full" value={form.org_type} onChange={e => setForm(f => ({ ...f, org_type: e.target.value }))}>
              <option value="record_label">Record Label</option>
              <option value="management">Management Company</option>
              <option value="publisher">Publisher</option>
              <option value="distributor">Distributor</option>
              <option value="church">Church</option>
              <option value="event">Event Company</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Tax Number</label>
            <input className="input w-full" value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Registration Number</label>
            <input className="input w-full" value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} />
          </div>
        </div>
      </Card>

      <Card title="Contact & Location">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1"><Globe size={12} className="inline mr-1" /> Website</label>
            <input className="input w-full" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1"><Mail size={12} className="inline mr-1" /> Email</label>
            <input className="input w-full" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1"><Phone size={12} className="inline mr-1" /> Phone</label>
            <input className="input w-full" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1"><MapPin size={12} className="inline mr-1" /> Physical Address</label>
            <textarea className="input w-full" rows={2} value={form.physical_address} onChange={e => setForm(f => ({ ...f, physical_address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-secondary font-bold block mb-1">Country</label>
              <input className="input w-full" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold block mb-1">State/Province</label>
              <input className="input w-full" value={form.province_state} onChange={e => setForm(f => ({ ...f, province_state: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold block mb-1">City</label>
              <input className="input w-full" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary font-bold block mb-1"><Tag size={12} className="inline mr-1" /> Currency</label>
              <select className="input w-full" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="BRL">BRL - Brazilian Real</option>
                <option value="JPY">JPY - Japanese Yen</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold block mb-1"><Clock size={12} className="inline mr-1" /> Timezone</label>
              <select className="input w-full" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Denver">America/Denver</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2">
        <Button variant="primary" size="sm" onClick={() => onSave(form)} disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function BrandingTab({ org, onSave, saving }: { org: any; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    logo_url: org?.logo_url || "",
    banner_url: org?.banner_url || "",
    brand_color: org?.brand_color || "#6366f1",
    secondary_color: org?.secondary_color || "#8b5cf6",
    accent_color: org?.accent_color || "#06b6d4",
    email_signature: org?.email_signature || "",
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Visual Branding">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Logo URL</label>
            <input className="input w-full" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
            {form.logo_url && (
              <div className="mt-2 p-3 bg-surface-elevated rounded-lg flex items-center gap-3">
                <img src={form.logo_url} alt="Logo preview" className="h-10 w-10 object-contain rounded" />
                <span className="text-xs text-text-secondary">Preview</span>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Banner URL</label>
            <input className="input w-full" value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} />
          </div>
        </div>
      </Card>

      <Card title="Colors">
        <div className="space-y-4">
          {[
            { key: "brand_color", label: "Primary Color" },
            { key: "secondary_color", label: "Secondary Color" },
            { key: "accent_color", label: "Accent Color" },
          ].map(c => (
            <div key={c.key}>
              <label className="text-xs text-text-secondary font-bold block mb-1">{c.label}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-border"
                  value={(form as any)[c.key]}
                  onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value }))}
                />
                <input
                  className="input flex-1 font-mono text-xs"
                  value={(form as any)[c.key]}
                  onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Email Signature">
        <div className="space-y-4">
          <textarea
            className="input w-full font-mono text-xs"
            rows={6}
            value={form.email_signature}
            onChange={e => setForm(f => ({ ...f, email_signature: e.target.value }))}
            placeholder="<div>Your email signature HTML...</div>"
          />
        </div>
      </Card>

      <div className="lg:col-span-2">
        <Button variant="primary" size="sm" onClick={() => onSave(form)} disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save Branding"}
        </Button>
      </div>
    </div>
  );
}

function TeamTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const fetchMembers = async () => {
    try {
      const res = await api.get("/organizations/members");
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch { setMembers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError("");
    try {
      await api.post("/organizations/members", { email: inviteEmail.trim() });
      setInviteEmail("");
      fetchMembers();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to invite");
    } finally { setInviting(false); }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await api.delete(`/organizations/members?user_id=${userId}`);
      fetchMembers();
    } catch { setError("Failed to remove member"); }
  };

  return (
    <div className="space-y-6">
      <Card title="Invite Member">
        <form onSubmit={handleInvite} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-text-secondary font-bold block mb-1">Email Address</label>
            <input className="input w-full" placeholder="colleague@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          </div>
          <Button variant="primary" size="sm" type="submit" disabled={inviting || !inviteEmail.trim()}>
            <Plus size={14} /> {inviting ? "Inviting..." : "Invite"}
          </Button>
        </form>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </Card>

      <Card title={`Team Members (${members.length})`}>
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading...</div>
        ) : members.length === 0 ? (
          <p className="text-sm text-text-secondary">No members yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">User</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold">Roles</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Joined</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-white font-medium">{m.name || "\u2014"}</td>
                    <td className="p-4 text-sm text-text-secondary">{m.email}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {m.roles?.length > 0 ? m.roles.map((r: any) => (
                          <Badge key={r.id} variant="primary" size="sm">{r.name}</Badge>
                        )) : <span className="text-xs text-text-secondary">\u2014</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center font-bold rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        m.is_active ? "bg-success/10 text-success border border-success/30" : "bg-danger/10 text-danger border border-danger/30"
                      }`}>
                        {m.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {m.accepted_at ? new Date(m.accepted_at).toLocaleDateString() : "Pending"}
                    </td>
                    <td className="p-4">
                      <button onClick={() => handleRemove(m.user_id)} className="text-danger hover:bg-danger/10 p-1 rounded transition-all">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function RolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchRoles = async () => {
    try {
      const res = await api.get("/iam/roles");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch { setRoles([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await api.post("/iam/roles", { name: newName.trim(), description: newDesc.trim() || undefined });
      setNewName("");
      setNewDesc("");
      fetchRoles();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create role");
    } finally { setCreating(false); }
  };

  if (loading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <Card title="Create Role">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary font-bold block mb-1">Role Name *</label>
              <input className="input w-full" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Marketing Manager" />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold block mb-1">Description</label>
              <input className="input w-full" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Role description" />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button variant="primary" size="sm" type="submit" disabled={creating || !newName.trim()}>
            {creating ? "Creating..." : "Create Role"}
          </Button>
        </form>
      </Card>

      <Card title={`Roles (${roles.length})`}>
        {roles.length === 0 ? (
          <p className="text-sm text-text-secondary">No roles defined yet.</p>
        ) : (
          <div className="space-y-2">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{role.name}</span>
                    {role.is_system && <Badge variant="neutral" size="sm">System</Badge>}
                  </div>
                  {role.description && <p className="text-xs text-text-secondary mt-0.5">{role.description}</p>}
                </div>
                <Badge variant="primary" size="sm">{role._count?.role_permissions || 0} permissions</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PermissionsTab() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/iam/permissions").then(r => {
      setPermissions(r.data.permissions || []);
      setGrouped(r.data.grouped || {});
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;

  return (
    <Card title="Permissions Framework">
      <p className="text-sm text-text-secondary mb-4">
        Permissions control what users can do within this organization.
      </p>
      <div className="space-y-6">
        {Object.entries(grouped).map(([module, perms]) => (
          <div key={module}>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 capitalize">{module}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {perms.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 p-2 bg-surface-elevated rounded-lg">
                  <code className="text-xs font-mono text-accent">{p.code}</code>
                  <span className="text-xs text-text-secondary">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BillingTab({ org }: { org: any }) {
  const plan = org?.subscriptions?.[0]?.plans;
  return (
    <Card title="Subscription & Billing">
      <div className="space-y-4">
        <div className="p-4 bg-surface-elevated rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Current Plan</p>
              <p className="text-xs text-text-secondary mt-1">
                {plan?.name || "Free"} {plan?.price ? `- $${plan.price}/mo` : ""}
              </p>
            </div>
            <Badge variant="primary" size="sm">{org?.subscription_plan || "Active"}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Team Members", value: org?._count?.tenant_users || 0 },
            { label: "Max Team", value: plan?.max_team_members || "\u2014" },
            { label: "Storage (MB)", value: plan?.max_storage_mb || "\u2014" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-surface-elevated rounded-lg text-center">
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm">Manage Subscription</Button>
      </div>
    </Card>
  );
}

function SecurityTab({ org }: { org: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Organization Security">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Owner</p>
              <p className="text-xs text-text-secondary">Organization ownership</p>
            </div>
            <Badge variant="primary" size="sm">Owner ID: {org?.owner_id || "\u2014"}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">Organization ID</p>
              <p className="text-xs text-text-secondary">Unique identifier</p>
            </div>
            <code className="text-xs font-mono text-text-secondary">{org?.id?.slice(0, 12)}...</code>
          </div>
        </div>
      </Card>
      <Card title="Danger Zone">
        <p className="text-sm text-text-secondary mb-4">
          Transfer ownership or delete this organization. These actions are irreversible.
        </p>
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="text-danger border border-danger/30">
            Transfer Ownership
          </Button>
          <Button variant="ghost" size="sm" className="text-danger border border-danger/30 block">
            Delete Organization
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AuditLogTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/iam/audit").then(r => {
      setLogs(Array.isArray(r.data) ? r.data : []);
    }).catch(() => setLogs([]))
    .finally(() => setLoading(false));
  }, []);

  return (
    <Card title="Audit Logs">
      {loading ? (
        <div className="p-8 text-center text-text-secondary">Loading...</div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-text-secondary">No audit logs yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 -mb-6">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                <th className="p-4 font-bold">Action</th>
                <th className="p-4 font-bold">Entity</th>
                <th className="p-4 font-bold">User</th>
                <th className="p-4 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 50).map((log) => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm"><code className="text-xs font-mono text-accent">{log.action}</code></td>
                  <td className="p-4 text-sm text-text-secondary">{log.entity_type} #{log.entity_id}</td>
                  <td className="p-4 text-sm text-text-secondary">{log.user_id || "\u2014"}</td>
                  <td className="p-4 text-sm text-text-secondary">{log.created_at ? new Date(log.created_at).toLocaleString() : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AITab({ org, onSave, saving }: { org: any; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    ai_model: org?.ai_model || "gpt-4",
    ai_monthly_budget: org?.ai_monthly_budget || 100,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="AI Configuration">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">AI Model</label>
            <select className="input w-full" value={form.ai_model} onChange={e => setForm(f => ({ ...f, ai_model: e.target.value }))}>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold block mb-1">Monthly AI Budget ($)</label>
            <input type="number" className="input w-full" value={form.ai_monthly_budget} onChange={e => setForm(f => ({ ...f, ai_monthly_budget: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
      </Card>
      <Card title="AI Capabilities">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Configure which AI agents and tools are available for this organization.</p>
          <div className="space-y-2">
            {["Contract Analysis", "Release Integration", "Royalty Simulation", "Content Generation", "Data Enrichment"].map(feature => (
              <label key={feature} className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border bg-surface-elevated text-accent focus:ring-accent" defaultChecked />
                <span className="text-sm text-text-primary">{feature}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>
      <div className="lg:col-span-2">
        <Button variant="primary" size="sm" onClick={() => onSave(form)} disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save AI Configuration"}
        </Button>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <Card title="Integrations">
      <p className="text-sm text-text-secondary">Third-party integrations and API connections.</p>
      <div className="mt-4 p-8 text-center text-text-secondary border border-dashed border-border rounded-lg">
        <Globe size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">Integration marketplace coming soon.</p>
      </div>
    </Card>
  );
}

function NotificationsTab() {
  return (
    <Card title="Notification Preferences">
      <p className="text-sm text-text-secondary">Configure how your organization receives notifications.</p>
      <div className="mt-4 p-8 text-center text-text-secondary border border-dashed border-border rounded-lg">
        <Bell size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">Notification settings coming soon.</p>
      </div>
    </Card>
  );
}
