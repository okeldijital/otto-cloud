"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  Edit3,
  KeyRound,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";

type Section = "overview" | "members" | "roles" | "security";

type Member = {
  identityId: string;
  email?: string;
  displayName?: string | null;
  membershipStatus: string;
  role?: string | null;
  roleName?: string | null;
  isOwner: boolean;
  joinedAt?: string | null;
};

type Role = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissionCount: number;
  memberCount: number;
  permissions: string[];
};

type Permission = {
  key: string;
  name: string;
  module: string;
};

const SECTION_ITEMS: Array<{ key: Section; label: string; icon: typeof Users; description: string }> = [
  { key: "overview", label: "Overview", icon: Building2, description: "Understand this organization's access model." },
  { key: "members", label: "Members", icon: Users, description: "People who can access this organization." },
  { key: "roles", label: "Roles", icon: Shield, description: "Permission bundles assigned to members." },
  { key: "security", label: "Security", icon: KeyRound, description: "Organization access guardrails." },
];

export default function OrganizationSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { currentOrg: organization } = useOrg();
  const [section, setSection] = useState<Section>("overview");
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", permissions: [] as string[] });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [busyMember, setBusyMember] = useState("");
  const [resettingPasswordMember, setResettingPasswordMember] = useState("");

  const canManageRoles = user?.permissions?.includes("roles.manage") ?? false;
  const canManageUsers = user?.permissions?.includes("users.manage") || user?.permissions?.includes("organizations.manage") || false;

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      (groups[permission.module] ??= []).push(permission);
      return groups;
    }, {});
  }, [permissions]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [membersResponse, rolesResponse, permissionsResponse] = await Promise.all([
        fetch("/api/auth/organizations/members", { credentials: "include", cache: "no-store" }),
        fetch("/api/auth/organizations/roles", { credentials: "include", cache: "no-store" }),
        fetch("/api/auth/organizations/permissions", { credentials: "include", cache: "no-store" }),
      ]);

      const [membersData, rolesData, permissionsData] = await Promise.all([
        membersResponse.json().catch(() => ({})),
        rolesResponse.json().catch(() => ({})),
        permissionsResponse.json().catch(() => ({})),
      ]);

      if (!membersResponse.ok) throw new Error(membersData.error || "Unable to load organization members.");
      if (!rolesResponse.ok) throw new Error(rolesData.error || "Unable to load organization roles.");
      if (!permissionsResponse.ok) throw new Error(permissionsData.error || "Unable to load permission catalog.");

      setMembers(Array.isArray(membersData.members) ? membersData.members : []);
      setRoles(Array.isArray(rolesData.roles) ? rolesData.roles : []);
      setPermissions(Array.isArray(permissionsData.permissions) ? permissionsData.permissions : []);

      if (!selectedRoleId && rolesData.roles?.[0]?.id) setSelectedRoleId(rolesData.roles[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organization access settings.");
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "", permissions: [] });
    setShowRoleForm(true);
  };

  const openEditRole = (role: Role) => {
    if (role.isSystem) return;
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description ?? "",
      permissions: [...role.permissions],
    });
    setSelectedRoleId(role.id);
    setShowRoleForm(true);
  };

  const togglePermission = (key: string) => {
    setRoleForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((permission) => permission !== key)
        : [...current.permissions, key],
    }));
  };

  const saveRole = async () => {
    if (!roleForm.name.trim()) return;
    setSavingRole(true);
    setError("");
    try {
      const response = await fetch(
        editingRole
          ? `/api/auth/organizations/roles/${editingRole.id}`
          : "/api/auth/organizations/roles",
        {
          method: editingRole ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(roleForm),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save role.");
      setShowRoleForm(false);
      await load();
      if (data.role?.id) setSelectedRoleId(data.role.id);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save role.");
    } finally {
      setSavingRole(false);
    }
  };

  const deleteRole = async (role: Role) => {
    if (role.isSystem) return;
    if (!window.confirm(`Delete the custom role "${role.name}"?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/auth/organizations/roles/${role.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to delete role.");
      setSelectedRoleId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete role.");
    }
  };

  const changeMemberRole = async (member: Member, roleKey: string) => {
    if (!roleKey || roleKey === member.role || member.isOwner) return;
    setBusyMember(member.identityId);
    setError("");
    try {
      const response = await fetch("/api/auth/organizations/members", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityId: member.identityId, roleKey }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to change member role.");
      await load();
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change member role.");
    } finally {
      setBusyMember("");
    }
  };

  const resetMemberPassword = async (member: Member) => {
    if (!canManageUsers || busyMember || resettingPasswordMember) return;
    const name = member.displayName || member.email || "this member";
    const confirmed = window.confirm(
      `Reset the password for ${name}? They will be signed out and required to choose a new password at their next sign-in.`
    );
    if (!confirmed) return;

    setResettingPasswordMember(member.identityId);
    setError("");
    try {
      const response = await fetch("/api/auth/password/force-reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityId: member.identityId,
          reason: "admin_member_reset",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to reset member password.");
      window.alert(`Password reset required for ${name}. The member must choose a new password at next sign-in.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset member password.");
    } finally {
      setResettingPasswordMember("");
    }
  };

  const addExistingMember = async () => {
    if (!inviteEmail.trim()) return;
    setBusyMember("invite");
    setError("");
    try {
      const response = await fetch("/api/auth/organizations/members", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), roleKey: inviteRole }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to add member.");
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add member.");
    } finally {
      setBusyMember("");
    }
  };

  return (
    <div className="min-h-full bg-[#08080a] text-white">
      <div className="mx-auto max-w-[1220px] px-8 py-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Organization</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{organization?.name ?? "Organization"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Manage who can access this organization and what they are allowed to do. Access is organization-scoped.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav className="h-fit rounded-2xl border border-white/10 bg-[#121216] p-2">
            {SECTION_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = section === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    active ? "bg-white/[0.06] text-white" : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-cyan-400" : ""}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-600">{item.description}</span>
                  </span>
                  {active && <ChevronRight className="h-4 w-4 text-zinc-600" />}
                </button>
              );
            })}
          </nav>

          <main className="min-w-0">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-[#121216] px-6 py-16 text-center text-sm text-zinc-500">
                Loading organization access…
              </div>
            ) : section === "overview" ? (
              <Overview
                members={members}
                roles={roles}
                onMembers={() => setSection("members")}
                onRoles={() => setSection("roles")}
              />
            ) : section === "members" ? (
              <Members
                members={members}
                roles={roles}
                canManageUsers={canManageUsers}
                inviteEmail={inviteEmail}
                inviteRole={inviteRole}
                setInviteEmail={setInviteEmail}
                setInviteRole={setInviteRole}
                addExistingMember={addExistingMember}
                busyMember={busyMember}
                resettingPasswordMember={resettingPasswordMember}
                changeMemberRole={changeMemberRole}
                resetMemberPassword={resetMemberPassword}
              />
            ) : section === "roles" ? (
              <Roles
                roles={roles}
                selectedRole={selectedRole}
                permissions={permissions}
                groupedPermissions={groupedPermissions}
                canManageRoles={canManageRoles}
                showRoleForm={showRoleForm}
                editingRole={editingRole}
                roleForm={roleForm}
                setSelectedRoleId={setSelectedRoleId}
                openCreateRole={openCreateRole}
                openEditRole={openEditRole}
                deleteRole={deleteRole}
                setShowRoleForm={setShowRoleForm}
                setRoleForm={setRoleForm}
                togglePermission={togglePermission}
                saveRole={saveRole}
                savingRole={savingRole}
              />
            ) : (
              <Security />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121216]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Overview({
  members,
  roles,
  onMembers,
  onRoles,
}: {
  members: Member[];
  roles: Role[];
  onMembers: () => void;
  onRoles: () => void;
}) {
  const activeMembers = members.filter((member) => member.membershipStatus === "active").length;
  const customRoles = roles.filter((role) => !role.isSystem).length;
  return (
    <div className="space-y-6">
      <Panel title="Access model">
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {[
            { label: "Active members", value: activeMembers, icon: Users },
            { label: "Available roles", value: roles.length, icon: Shield },
            { label: "Custom roles", value: customRoles, icon: Edit3 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <Icon className="h-4 w-4 text-cyan-400" />
                <p className="mt-4 text-2xl font-semibold">{item.value}</p>
                <p className="mt-1 text-xs text-zinc-500">{item.label}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <ActionCard
          icon={Users}
          title="Manage members"
          description="Invite people, review membership status and assign an organization role."
          action="Open Members"
          onClick={onMembers}
        />
        <ActionCard
          icon={Shield}
          title="Manage roles"
          description="See exactly what each role can do. Custom roles bundle only permissions you already hold."
          action="Open Roles"
          onClick={onRoles}
        />
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-5">
        <p className="text-sm font-medium text-cyan-200">How access works</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          A person becomes a member of this organization, receives one organization-scoped role, and inherits that role’s permissions.
          The API enforces these permissions server-side; hiding a button in the interface is never the security boundary.
        </p>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, action, onClick }: { icon: typeof Users; title: string; description: string; action: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-white/10 bg-[#121216] p-5 text-left transition hover:border-white/20">
      <Icon className="h-5 w-5 text-cyan-400" />
      <h3 className="mt-5 text-base font-semibold">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-5 text-zinc-500">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-cyan-400">{action} <ChevronRight className="h-4 w-4" /></span>
    </button>
  );
}

function Members({
  members,
  roles,
  canManageUsers,
  inviteEmail,
  inviteRole,
  setInviteEmail,
  setInviteRole,
  addExistingMember,
  busyMember,
  resettingPasswordMember,
  changeMemberRole,
  resetMemberPassword,
}: {
  members: Member[];
  roles: Role[];
  canManageUsers: boolean;
  inviteEmail: string;
  inviteRole: string;
  setInviteEmail: (value: string) => void;
  setInviteRole: (value: string) => void;
  addExistingMember: () => void;
  busyMember: string;
  resettingPasswordMember: string;
  changeMemberRole: (member: Member, roleKey: string) => void;
  resetMemberPassword: (member: Member) => void;
}) {
  return (
    <div className="space-y-6">
      <Panel title="Members">
        <div className="border-b border-white/10 p-5">
          <div className="mb-3">
            <p className="text-sm font-medium">Add an existing Otto account</p>
            <p className="mt-1 text-xs text-zinc-600">New accounts use the separate invitation workflow.</p>
          </div>
          {canManageUsers ? (
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="person@example.com"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm outline-none placeholder:text-zinc-700 focus:border-cyan-500/50"
              />
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#18181d] px-4 py-2.5 text-sm outline-none"
              >
                {roles.filter((role) => role.key !== "owner").map((role) => <option key={role.id} value={role.key}>{role.name}</option>)}
              </select>
              <button
                onClick={addExistingMember}
                disabled={busyMember === "invite"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add member
              </button>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">You can view members, but your current role cannot change organization access.</p>
          )}
          <a href="/settings/organization/invitations" className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300">
            Invite a new account →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                {canManageUsers && <th className="px-5 py-3 font-medium">Password</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.identityId} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] text-sm font-medium">{(member.displayName || member.email || "?").slice(0, 1).toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-medium">{member.displayName || "Unnamed member"}</p>
                        <p className="text-xs text-zinc-600">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {canManageUsers && !member.isOwner ? (
                      <select
                        value={member.role ?? "member"}
                        disabled={busyMember === member.identityId}
                        onChange={(event) => changeMemberRole(member, event.target.value)}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs outline-none"
                      >
                        {roles.filter((role) => role.key !== "owner").map((role) => <option key={role.id} value={role.key}>{role.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm text-zinc-300">{member.isOwner ? "Owner" : member.roleName || member.role || "Member"}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{member.membershipStatus}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-600">{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "—"}</td>
                  {canManageUsers && (
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => resetMemberPassword(member)}
                        disabled={busyMember !== "" || resettingPasswordMember === member.identityId}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 hover:border-cyan-500/40 hover:text-white disabled:opacity-50"
                        title="Force this member to choose a new password"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {resettingPasswordMember === member.identityId ? "Resetting…" : "Reset password"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!members.length && <div className="px-5 py-10 text-center text-sm text-zinc-600">No active members found.</div>}
        </div>
      </Panel>
    </div>
  );
}

function Roles({
  roles,
  selectedRole,
  permissions,
  groupedPermissions,
  canManageRoles,
  showRoleForm,
  editingRole,
  roleForm,
  setSelectedRoleId,
  openCreateRole,
  openEditRole,
  deleteRole,
  setShowRoleForm,
  setRoleForm,
  togglePermission,
  saveRole,
  savingRole,
}: {
  roles: Role[];
  selectedRole: Role | null;
  permissions: Permission[];
  groupedPermissions: Record<string, Permission[]>;
  canManageRoles: boolean;
  showRoleForm: boolean;
  editingRole: Role | null;
  roleForm: { name: string; description: string; permissions: string[] };
  setSelectedRoleId: (value: string) => void;
  openCreateRole: () => void;
  openEditRole: (role: Role) => void;
  deleteRole: (role: Role) => void;
  setShowRoleForm: (value: boolean) => void;
  setRoleForm: (value: { name: string; description: string; permissions: string[] }) => void;
  togglePermission: (key: string) => void;
  saveRole: () => void;
  savingRole: boolean;
}) {
  return (
    <div className="space-y-6">
      <Panel
        title="Roles & permissions"
        action={canManageRoles ? (
          <button onClick={openCreateRole} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-black">
            <Plus className="h-3.5 w-3.5" /> Create custom role
          </button>
        ) : undefined}
      >
        <div className="grid min-h-[520px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-3 lg:border-b-0 lg:border-r">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`mb-1 w-full rounded-xl p-3 text-left ${selectedRole?.id === role.id ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{role.name}</span>
                  {role.isSystem && <span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-600">System</span>}
                </div>
                <p className="mt-1 text-xs text-zinc-600">{role.memberCount} member{role.memberCount === 1 ? "" : "s"} · {role.permissionCount} permissions</p>
              </button>
            ))}
          </div>

          <div className="p-5">
            {selectedRole ? (
              <>
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{selectedRole.name}</h3>
                      {selectedRole.isSystem && <span className="rounded-full border border-cyan-500/30 px-2 py-0.5 text-[9px] uppercase tracking-wider text-cyan-400">System role</span>}
                    </div>
                    <p className="mt-2 max-w-xl text-sm leading-5 text-zinc-500">{selectedRole.description || "No description provided."}</p>
                  </div>
                  {canManageRoles && !selectedRole.isSystem && (
                    <div className="flex gap-2">
                      <button onClick={() => openEditRole(selectedRole)} className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white" title="Edit role"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => deleteRole(selectedRole)} className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10" title="Delete role"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-5">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <div key={module}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">{module}</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {modulePermissions.map((permission) => {
                          const granted = selectedRole.permissions.includes(permission.key);
                          return (
                            <div key={permission.key} className="flex items-center gap-2 rounded-lg border border-white/5 px-3 py-2.5">
                              <span className={`grid h-5 w-5 place-items-center rounded ${granted ? "bg-cyan-500/15 text-cyan-400" : "bg-white/[0.02] text-zinc-700"}`}>
                                {granted ? <Check className="h-3.5 w-3.5" /> : <span className="h-1 w-1 rounded-full bg-zinc-700" />}
                              </span>
                              <span className={`text-xs ${granted ? "text-zinc-300" : "text-zinc-600"}`}>{permission.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid h-full place-items-center text-sm text-zinc-600">No roles have been provisioned for this organization.</div>
            )}
          </div>
        </div>
      </Panel>

      {showRoleForm && (
        <Panel title={editingRole ? "Edit custom role" : "Create custom role"}>
          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">Role name</span>
                <input value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-cyan-500/50" placeholder="e.g. Release Reviewer" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">Description</span>
                <input value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-cyan-500/50" placeholder="What this role is for" />
              </label>
            </div>

            <div className="mt-6">
              <div className="mb-3">
                <p className="text-sm font-medium">Permissions</p>
                <p className="mt-1 text-xs text-zinc-600">You can only grant permissions that your current role already has. Platform administration is never grantable here.</p>
              </div>
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                  <div key={module}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">{module}</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {modulePermissions.map((permission) => {
                        const checked = roleForm.permissions.includes(permission.key);
                        return (
                          <label key={permission.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 ${checked ? "border-cyan-500/30 bg-cyan-500/[0.04]" : "border-white/5"}`}>
                            <input type="checkbox" checked={checked} onChange={() => togglePermission(permission.key)} className="accent-cyan-500" />
                            <span className="text-xs text-zinc-400">{permission.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
              <button onClick={() => setShowRoleForm(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button onClick={saveRole} disabled={savingRole || !roleForm.name.trim()} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">{savingRole ? "Saving…" : editingRole ? "Save changes" : "Create role"}</button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Security() {
  return (
    <div className="space-y-6">
      <Panel title="Organization security">
        <div className="divide-y divide-white/5">
          {[
            ["Organization-scoped access", "Every permission decision is evaluated against the active organization.", "Enforced"],
            ["Role-based authorization", "Permissions come from the member's organization role, not from client-side UI state.", "Enforced"],
            ["Owner protection", "Owner membership cannot be suspended or removed through ordinary member administration.", "Enforced"],
            ["Tenant-scoped roles", "A membership cannot reference a role owned by another organization.", "Enforced"],
          ].map(([label, description, status]) => (
            <div key={label} className="flex items-center justify-between gap-5 px-5 py-4">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-1 text-xs text-zinc-600">{description}</p>
              </div>
              <span className="shrink-0 rounded-full border border-cyan-500/30 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-400">{status}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="rounded-2xl border border-white/10 bg-[#121216] p-5">
        <p className="text-sm font-medium">Security model</p>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          The interface is intentionally descriptive. The server remains authoritative for organization scope, role assignment and permission checks.
          Sensitive access changes should be reviewed through the organization's audit trail.
        </p>
      </div>
    </div>
  );
}
