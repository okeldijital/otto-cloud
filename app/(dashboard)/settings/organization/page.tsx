"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  UserMinus,
  Users,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useOrg } from "@/contexts/OrgContext";
import api from "@/lib/api";

type Section = "overview" | "team" | "roles" | "permissions" | "security";

type Member = {
  id: string;
  identityId: string;
  email: string;
  displayName: string | null;
  status: string;
  isDefault: boolean;
  isOwner: boolean;
  roleKey: string;
  roleName: string;
  membershipVersion: number;
  joinedAt: string;
};

type Role = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissionCount: number;
  memberCount: number;
  permissions: string[];
};

const sections: Array<{ id: Section; label: string; icon: typeof Users }> = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "roles", label: "Roles", icon: Shield },
  { id: "permissions", label: "Permissions", icon: KeyRound },
  { id: "security", label: "Security", icon: LockKeyhole },
];

function normalizeMembers(data: unknown): Member[] {
  const rows = Array.isArray(data) ? data : (data as { members?: unknown[] } | null)?.members;
  return Array.isArray(rows) ? rows as Member[] : [];
}

function normalizeRoles(data: unknown): Role[] {
  const rows = Array.isArray(data) ? data : (data as { roles?: unknown[] } | null)?.roles;
  return Array.isArray(rows) ? rows as Role[] : [];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function OrganizationSettingsPage() {
  const { currentOrg } = useOrg();
  const [section, setSection] = useState<Section>("overview");
  const orgName = (currentOrg as { name?: string } | null)?.name || "Organization";

  return (
    <div className="space-y-6">
      <PageHeader title="Organization" subtitle={`Manage ${orgName}`} />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <Card>
          <nav className="space-y-1">
            {sections.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-white/10 text-white" : "text-text-secondary hover:bg-white/5 hover:text-white"}`}>
                  <Icon size={16} /> <span>{item.label}</span>{active && <ChevronRight size={14} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </Card>
        <div className="min-w-0">
          {section === "overview" && <OverviewPanel orgName={orgName} onNavigate={setSection} />}
          {section === "team" && <TeamPanel />}
          {section === "roles" && <RolesPanel />}
          {section === "permissions" && <PermissionsPanel />}
          {section === "security" && <SecurityPanel />}
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({ orgName, onNavigate }: { orgName: string; onNavigate: (section: Section) => void }) {
  return (
    <div className="space-y-6">
      <Card title="Organization access">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard icon={Users} title="Team" description="Manage members and role assignments." action="Open Team" onClick={() => onNavigate("team")} />
          <SummaryCard icon={Shield} title="Roles" description="Review system roles and their permissions." action="Open Roles" onClick={() => onNavigate("roles")} />
          <SummaryCard icon={KeyRound} title="Permissions" description="Review the available permission framework." action="Open Permissions" onClick={() => onNavigate("permissions")} />
        </div>
      </Card>
      <Card title="Current organization">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center"><Building2 size={18} /></div>
          <div><p className="text-sm font-semibold text-white">{orgName}</p><p className="text-xs text-text-secondary">Active organization context</p></div>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, title, description, action, onClick }: { icon: typeof Users; title: string; description: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface-elevated p-4">
      <Icon size={18} className="text-accent mb-3" />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>
      <button type="button" onClick={onClick} className="mt-4 text-xs font-semibold text-accent hover:underline">{action} →</button>
    </div>
  );
}

function TeamPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("member");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [membersResponse, rolesResponse] = await Promise.all([
        api.get("/organizations/members"),
        api.get("/auth/organizations/roles"),
      ]);
      setMembers(normalizeMembers(membersResponse.data));
      setRoles(normalizeRoles(rolesResponse.data));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load organization members.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filteredMembers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return members;
    return members.filter((member) => `${member.displayName || ""} ${member.email} ${member.roleName}`.toLowerCase().includes(value));
  }, [members, query]);

  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setAdding(true); setError("");
    try {
      await api.post("/organizations/members", { email: email.trim(), role_key: roleKey });
      setEmail(""); await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to add member.");
    } finally { setAdding(false); }
  };

  const changeRole = async (identityId: string, nextRole: string) => {
    setBusyId(identityId); setError("");
    try {
      await api.patch("/organizations/members", { identity_id: identityId, role_key: nextRole });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to change role.");
    } finally { setBusyId(""); }
  };

  const removeMember = async (member: Member) => {
    if (member.isOwner) return;
    if (!window.confirm(`Remove ${member.displayName || member.email} from this organization?`)) return;
    setBusyId(member.identityId); setError("");
    try {
      await api.delete(`/organizations/members?identity_id=${encodeURIComponent(member.identityId)}`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to remove member.");
    } finally { setBusyId(""); }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Team" description="Members of the active organization and their assigned roles." onRefresh={load} loading={loading} />
      {error && <ErrorNotice message={error} />}
      <Card title="Add existing OTTO user">
        <form onSubmit={addMember} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
          <Field label="Email address"><input className="input w-full" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@example.com" /></Field>
          <Field label="Role"><select className="input w-full" value={roleKey} onChange={(event) => setRoleKey(event.target.value)}>{roles.map((role) => <option key={role.id} value={role.key}>{role.name}</option>)}</select></Field>
          <Button type="submit" variant="primary" size="sm" disabled={adding || !email.trim()}><Plus size={15} /> {adding ? "Adding..." : "Add member"}</Button>
        </form>
        <p className="mt-3 text-xs text-text-secondary">This IAM endpoint adds an existing OTTO account. New-account invitations are a separate workflow.</p>
      </Card>
      <Card title={`Members · ${members.length}`}>
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/5 bg-surface-elevated px-3">
          <Search size={15} className="text-text-secondary" />
          <input className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-text-secondary" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" />
        </div>
        {loading && members.length === 0 ? <LoadingState label="Loading members..." /> : filteredMembers.length === 0 ? <EmptyState label={query ? "No matching members." : "No members are assigned to this organization."} /> : (
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full">
              <thead><tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wider text-text-secondary"><th className="px-6 py-3">Member</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Joined</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
              <tbody>{filteredMembers.map((member) => (
                <tr key={member.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{(member.displayName || member.email).slice(0, 1).toUpperCase()}</div><div><p className="text-sm font-medium text-white">{member.displayName || "Unnamed user"}</p><p className="text-xs text-text-secondary">{member.email}</p></div></div></td>
                  <td className="px-6 py-4"><div className="flex items-center gap-2"><select className="input h-8 min-w-[150px] text-xs" value={member.roleKey} disabled={member.isOwner || busyId === member.identityId} onChange={(event) => void changeRole(member.identityId, event.target.value)}>{roles.map((role) => <option key={role.id} value={role.key}>{role.name}</option>)}</select>{member.isOwner && <Badge variant="primary" size="sm">Owner</Badge>}</div></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-success"><CheckCircle2 size={13} /> {member.status}</span></td>
                  <td className="px-6 py-4 text-xs text-text-secondary">{formatDate(member.joinedAt)}</td>
                  <td className="px-6 py-4 text-right"><button type="button" disabled={member.isOwner || busyId === member.identityId} onClick={() => void removeMember(member)} className="rounded-md p-2 text-text-secondary hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30" title={member.isOwner ? "Owner cannot be removed" : "Remove member"}><UserMinus size={15} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function RolesPanel() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get("/auth/organizations/roles");
      const next = normalizeRoles(response.data);
      setRoles(next);
      setSelected((current) => current && next.some((role) => role.id === current) ? current : next[0]?.id || null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load roles.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const selectedRole = roles.find((role) => role.id === selected) || null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Roles" description="System roles available to the active organization." onRefresh={load} loading={loading} />
      {error && <ErrorNotice message={error} />}
      {loading && roles.length === 0 ? <LoadingState label="Loading roles..." /> : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <Card title={`Roles · ${roles.length}`}>
            <div className="divide-y divide-white/5">{roles.map((role) => (
              <button key={role.id} type="button" onClick={() => setSelected(role.id)} className={`w-full flex items-center gap-4 py-4 text-left transition-colors ${selected === role.id ? "bg-white/5 -mx-2 px-2 rounded-lg" : "hover:bg-white/[0.03]"}`}>
                <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center"><Shield size={16} /></div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-medium text-white">{role.name}</p>{role.isSystem && <Badge variant="neutral" size="sm">System</Badge>}</div><p className="mt-1 text-xs text-text-secondary">{role.key}</p></div>
                <div className="hidden sm:block text-right"><p className="text-sm font-semibold text-white">{role.memberCount}</p><p className="text-[10px] uppercase tracking-wider text-text-secondary">members</p></div>
                <div className="hidden sm:block text-right"><p className="text-sm font-semibold text-white">{role.permissionCount}</p><p className="text-[10px] uppercase tracking-wider text-text-secondary">permissions</p></div>
                <ChevronRight size={15} className="text-text-secondary" />
              </button>
            ))}</div>
          </Card>
          <Card title={selectedRole?.name || "Role details"}>
            {!selectedRole ? <EmptyState label="Select a role to inspect its permissions." /> : <>
              <div className="flex items-center gap-2 mb-4">{selectedRole.isSystem && <Badge variant="neutral" size="sm">System role</Badge>}<span className="text-xs text-text-secondary">{selectedRole.memberCount} member{selectedRole.memberCount === 1 ? "" : "s"}</span></div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">{selectedRole.permissions.map((permission) => <div key={permission} className="flex items-center gap-2 rounded-md bg-surface-elevated px-3 py-2"><CheckCircle2 size={13} className="text-success shrink-0" /><code className="text-xs text-text-secondary">{permission}</code></div>)}</div>
            </>}
          </Card>
        </div>
      )}
    </div>
  );
}

function PermissionsPanel() {
  return <div className="space-y-6"><SectionHeader title="Permissions" description="The permission model is defined centrally by OTTO IAM." /><Card title="Permission management"><div className="flex gap-3 rounded-lg border border-white/5 bg-surface-elevated p-4"><Settings2 size={18} className="text-accent shrink-0" /><div><p className="text-sm font-medium text-white">Role-based permissions</p><p className="mt-1 text-xs leading-5 text-text-secondary">Permissions are assigned through roles. Select a role under Roles to inspect its current permission set.</p></div></div></Card></div>;
}

function SecurityPanel() {
  return <div className="space-y-6"><SectionHeader title="Security" description="Organization-level access is governed by OTTO IAM." /><Card title="IAM status"><div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-4"><CheckCircle2 size={18} className="text-success" /><div><p className="text-sm font-medium text-white">Identity and organization access are active</p><p className="mt-1 text-xs text-text-secondary">Memberships and roles are resolved from the active IAM organization context.</p></div></div></Card></div>;
}

function SectionHeader({ title, description, onRefresh, loading = false }: { title: string; description: string; onRefresh?: () => void; loading?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-text-secondary">{description}</p></div>{onRefresh && <Button type="button" variant="secondary" size="sm" onClick={() => void onRefresh()} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</Button>}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="mb-1 block text-xs font-semibold text-text-secondary">{label}</label>{children}</div>; }
function LoadingState({ label }: { label: string }) { return <Card><div className="p-10 text-center text-sm text-text-secondary">{label}</div></Card>; }
function EmptyState({ label }: { label: string }) { return <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-text-secondary">{label}</div>; }
function ErrorNotice({ message }: { message: string }) { return <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/10 p-4"><AlertCircle size={17} className="mt-0.5 shrink-0 text-danger" /><p className="text-sm text-text-secondary">{message}</p></div>; }
