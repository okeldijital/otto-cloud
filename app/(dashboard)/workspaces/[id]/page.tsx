"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Layout, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusKanban from "@/components/workspaces/StatusKanban";
import api from "@/lib/api";
import { registerSection, getSectionsForTemplate, SECTION_ICONS } from "@/lib/workspace-engine";
import type { SectionPlugin } from "@/lib/workspace-engine";

import OverviewSection from "@/components/workspace-sections/OverviewSection";
import DeliverablesSection from "@/components/workspace-sections/DeliverablesSection";
import ApprovalsSection from "@/components/workspace-sections/ApprovalsSection";
import PublicationsSection from "@/components/workspace-sections/PublicationsSection";
import VideosSection from "@/components/workspace-sections/VideosSection";
import MilestonesSection from "@/components/workspace-sections/MilestonesSection";
import MarketingSection from "@/components/workspace-sections/MarketingSection";
import DiscussionsSection from "@/components/workspace-sections/DiscussionsSection";
import FilesSection from "@/components/workspace-sections/FilesSection";
import TimelineSection from "@/components/workspace-sections/TimelineSection";
import ReadinessSection from "@/components/workspace-sections/ReadinessSection";
import SettingsSection from "@/components/workspace-sections/SettingsSection";
import AISection from "@/components/workspace-sections/AISection";
import ReportsSection from "@/components/workspace-sections/ReportsSection";
import DependencySection from "@/components/workspace-sections/DependencySection";
import DynamicFieldsSection from "@/components/workspace-sections/DynamicFieldsSection";

registerSection({ key: "overview", label: "Overview", component: OverviewSection, icon: "layout" });
registerSection({ key: "deliverables", label: "Tasks", component: DeliverablesSection, icon: "checkSquare" });
registerSection({ key: "dependencies", label: "Dependencies", component: DependencySection, icon: "gitBranch" });
registerSection({ key: "fields", label: "Fields", component: DynamicFieldsSection, icon: "settings" });
registerSection({ key: "milestones", label: "Milestones", component: MilestonesSection, icon: "calendar" });
registerSection({ key: "approvals", label: "Approvals", component: ApprovalsSection, icon: "checkCircle" });
registerSection({ key: "publications", label: "Publications", component: PublicationsSection, icon: "share2" });
registerSection({ key: "videos", label: "Videos", component: VideosSection, icon: "video" });
registerSection({ key: "marketing", label: "Marketing", component: MarketingSection, icon: "megaphone" });
registerSection({ key: "discussions", label: "Discussions", component: DiscussionsSection, icon: "messageSquare" });
registerSection({ key: "files", label: "Files", component: FilesSection, icon: "fileText" });
registerSection({ key: "timeline", label: "Timeline", component: TimelineSection, icon: "clock" });
registerSection({ key: "readiness", label: "Readiness", component: ReadinessSection, icon: "activity" });
registerSection({ key: "settings", label: "Settings", component: SettingsSection, icon: "settings" });
registerSection({ key: "ai", label: "AI Assistant", component: AISection, icon: "bot" });
registerSection({ key: "reports", label: "Reports", component: ReportsSection, icon: "barChart" });

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    try {
      const { data } = await api.get(`/workspace/${id}`);
      setWorkspace(data);
      setError(null);
    } catch (err: any) {
      if (err?.response?.status === 404) setError("Workspace not found");
      else setError("Failed to load workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchWorkspace();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.put(`/workspace/${id}`, { status: newStatus });
      fetchWorkspace();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete workspace "${workspace?.name}"?`)) return;
    try {
      await api.delete(`/workspace/${id}`);
      router.push("/workspaces");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete workspace");
    }
  };

  const activeSectionPlugin = workspace
    ? getSectionsForTemplate(workspace.template?.slug).find((s) => s.key === activeSection)
    : undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-white/10 rounded w-64 animate-pulse" />
        <div className="h-4 bg-white/5 rounded w-96 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <Layout size={48} className="mx-auto mb-4 text-text-secondary opacity-30" />
        <h3 className="text-lg font-semibold text-white mb-2">{error}</h3>
        <Button variant="secondary" onClick={() => router.push("/workspaces")}>
          Back to Workspaces
        </Button>
      </div>
    );
  }

  if (!workspace) return null;

  const sections = getSectionsForTemplate(workspace.template?.slug);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/workspaces")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title={workspace.name}
          subtitle={workspace.template ? `${workspace.template.name} Workspace` : "Workspace"}
          actions={
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 size={14} />
                Delete
              </Button>
            </div>
          }
        />
      </div>

      <StatusKanban
        currentStatus={workspace.status}
        statuses={workspace.template?.statuses}
        onStatusChange={handleStatusChange}
      />

      <div className="border-b border-white/5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {sections.map((section) => {
            const Icon = SECTION_ICONS[section.icon as keyof typeof SECTION_ICONS] || Layout;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                  activeSection === section.key
                    ? "border-accent text-accent"
                    : "border-transparent text-text-secondary hover:text-white"
                }`}
              >
                <Icon size={14} />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeSectionPlugin ? (
        <activeSectionPlugin.component
          workspace={workspace}
          workspaceId={parseInt(id)}
          onRefresh={fetchWorkspace}
          onNavigate={(key: string) => setActiveSection(key)}
        />
      ) : (
        <div className="py-16 text-center text-text-secondary">
          <p>Section not found</p>
        </div>
      )}
    </div>
  );
}
