"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Building2, Users, Shield, Key, Globe, Bell, CreditCard, Lock } from "lucide-react";

type Tab = "general" | "team" | "roles" | "permissions" | "integrations" | "notifications" | "billing" | "security";
type Organization = { id: string; name: string; slug?: string | null; status?: string | null; role?: string | null; isDefault?: boolean; isOwner?: boolean; membershipStatus?: string | null; ownerIdentityId?: string | null; mfaPolicy?: string | null; roleVersion?: number | string | null };
type Member = { identityId: string; email?: string; displayName?: string | null; membershipStatus: string; role?: string | null; roleName?: string | null; isDefault?: boolean; isOwner?: boolean };
type Role = { id: string; key: string; name: string; isSystem?: boolean; permissionCount?: number; memberCount?: number };
type OrgContextValue = { organizations: Organization[]; currentOrg: Organization | null; loading: boolean };
type AuthUser = { full_name?: string | null; email?: string | null; role?: string | null };

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "general", label: "General", icon: Building2 }, { id: "team", label: "Team", icon: Users }, { id: "roles", label: "Roles", icon: Shield }, { id: "permissions", label: "Permissions", icon: Key }, { id: "integrations", label: "Integrations", icon: Globe }, { id: "notifications", label: "Notifications", icon: Bell }, { id: "billing", label: "Billing", icon: CreditCard }, { id: "security", label: "Security", icon: Lock },
];

export default function OrganizationIamSettingsPage() {
  const { user } = useAuth() as unknown as { user: AuthUser | null };
  const orgContext = useOrg() as unknown as OrgContextValue;
  const currentOrg = orgContext.currentOrg;
  const organizations = orgContext.organizations;
  const loading = orgContext.loading;
  const [tab, setTab] = useState<Tab>("general");
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentOrg?.id) return;
    const headers: Record<string, string> = { "x-organization-id": currentOrg.id };
    setError("");
    Promise.all([
      fetch("/api/auth/organizations/members", { credentials: "include", cache: "no-store", headers }),
      fetch("/api/auth/organizations/roles", { credentials: "include", cache: "no-store", headers }),
    ])
      .then(async ([membersRes, rolesRes]) => {
        const membersData = await membersRes.json().catch(() => ({}));
        const rolesData = await rolesRes.json().catch(() => ({}));
        if (!membersRes.ok) throw new Error(membersData.error || `Failed to load members (${membersRes.status})`);
        if (!rolesRes.ok) throw new Error(rolesData.error || `Failed to load roles (${rolesRes.status})`);
        setMembers(Array.isArray(membersData) ? membersData : membersData.members || []);
        setRoles(Array.isArray(rolesData) ? rolesData : rolesData.roles || []);
      })
      .catch((err) => setError(err.message || "Failed to load organization data"));
  }, [currentOrg?.id]);

  const role = user?.role || currentOrg?.role || "user";
  if (loading) return <div className="p-12 text-center text-text-secondary">Loading organization...</div>;
  if (!currentOrg) return <div className="p-12 text-center text-text-secondary">No active organization.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Organization Settings" subtitle={`Manage ${currentOrg.name}`} />
      <div className="flex gap-1 border-b border-white/5 overflow-x-auto">
        {tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap px-4 py-2 text-sm font-bold transition-colors ${tab === item.id ? "text-white border-b-2 border-accent" : "text-text-secondary hover:text-white"}`}><Icon size={14} className="inline mr-1" /> {item.label}</button>; })}
      </div>
      {error && <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-text-secondary">{error}</div>}
      {tab === "general" && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Organization Identity"><div className="space-y-3"><Row label="Name" value={currentOrg.name} /><Row label="Slug" value={currentOrg.slug || "—"} /><Row label="Status" value={currentOrg.status || "—"} /><Row label="Organization ID" value={currentOrg.id} mono /></div></Card>
        <Card title="Your Membership"><div className="space-y-3"><Row label="User" value={user?.full_name || user?.email || "—"} /><Row label="Role" value={role} /><Row label="Membership" value={currentOrg.membershipStatus || "active"} /><Row label="Owner" value={currentOrg.isOwner ? "Yes" : "No"} /></div></Card>
        <Card title="Organization Context"><div className="space-y-3"><Row label="Available organizations" value={String(organizations.length)} /><Row label="Members" value={String(members.length)} /><Row label="Active organization" value={currentOrg.name} /><p className="text-xs text-text-secondary pt-2">This surface is sourced from the canonical IAM organisation and membership context.</p></div></Card>
      </div>}
      {tab === "team" && <Card title={`Team Members (${members.length})`}><div className="flex justify-end mb-4"><Link href="/settings/organization/invitations" className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">Manage invitations</Link></div>{members.length === 0 ? <p className="text-sm text-text-secondary">No members returned by the canonical IAM membership service.</p> : <div className="space-y-2">{members.map((member) => <div key={member.identityId} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10"><div><div className="font-medium">{member.displayName || member.email || member.identityId}</div><div className="text-xs text-text-secondary">{member.email || "—"} · {member.membershipStatus}</div></div><Badge variant="primary" size="sm">{member.isOwner ? "Owner" : member.roleName || member.role || "member"}</Badge></div>)}</div>}</Card>}
      {tab === "roles" && <Card title={`Organization Roles (${roles.length})`}><div className="space-y-2">{roles.length === 0 ? <p className="text-sm text-text-secondary">No roles returned by IAM.</p> : roles.map((item) => <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"><div><span className="font-medium">{item.name}</span><span className="ml-2 text-xs text-text-secondary">{item.key}</span></div><span className="text-xs text-text-secondary">{item.isSystem ? "System" : "Custom"} · {item.memberCount ?? 0} members</span></div>)}</div></Card>}
      {tab === "permissions" && <Placeholder title="Permissions" text="Permission evaluation is owned by the canonical IAM authorization layer. A dedicated settings editor is not exposed here yet." />}
      {tab === "integrations" && <Placeholder title="Integrations" text="Integration management is not part of the IAM organization boundary yet." />}
      {tab === "notifications" && <Placeholder title="Notifications" text="Organization notification preferences are not part of the IAM organization boundary yet." />}
      {tab === "billing" && <Placeholder title="Billing" text="Subscription and billing data is not provided by the IAM organization service." />}
      {tab === "security" && <Card title="Organization Security"><div className="space-y-3"><Row label="Owner identity" value={currentOrg.ownerIdentityId || "—"} mono /><Row label="Organization ID" value={currentOrg.id} mono /><Row label="MFA policy" value={currentOrg.mfaPolicy || "—"} /><Row label="Role version" value={String(currentOrg.roleVersion ?? "—")} /></div></Card>}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-4 p-3 bg-surface-elevated rounded-lg"><span className="text-sm text-text-secondary">{label}</span><span className={`text-sm text-white text-right ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</span></div>; }
function Placeholder({ title, text }: { title: string; text: string }) { return <Card title={title}><div className="p-8 text-center text-text-secondary text-sm">{text}</div></Card>; }
