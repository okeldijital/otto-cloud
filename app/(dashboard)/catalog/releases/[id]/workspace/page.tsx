"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Layout, Plus, Bot } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
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

import ReleaseMetadataSection from "@/components/workspace-sections/release/MetadataSection";
import DistributionSection from "@/components/workspace-sections/release/DistributionSection";
import CalendarSection from "@/components/workspace-sections/release/CalendarSection";
import PlaybookSection from "@/components/workspace-sections/release/PlaybookSection";

registerSection({ key: "overview", label: "Overview", component: OverviewSection, icon: "overview" });
registerSection({ key: "metadata", label: "Metadata", component: ReleaseMetadataSection, icon: "metadata", templates: ["release"] });
registerSection({ key: "playbook", label: "Playbook", component: PlaybookSection, icon: "playbook", templates: ["release"] });
registerSection({ key: "deliverables", label: "Deliverables", component: DeliverablesSection, icon: "deliverables" });
registerSection({ key: "milestones", label: "Milestones", component: MilestonesSection, icon: "milestones" });
registerSection({ key: "approvals", label: "Approvals", component: ApprovalsSection, icon: "approvals" });
registerSection({ key: "publications", label: "Publications", component: PublicationsSection, icon: "publications" });
registerSection({ key: "videos", label: "Videos", component: VideosSection, icon: "videos" });
registerSection({ key: "marketing", label: "Marketing", component: MarketingSection, icon: "marketing" });
registerSection({ key: "distribution", label: "Distribution", component: DistributionSection, icon: "distribution", templates: ["release"] });
registerSection({ key: "files", label: "Files", component: FilesSection, icon: "files" });
registerSection({ key: "calendar", label: "Calendar", component: CalendarSection, icon: "calendar" });
registerSection({ key: "timeline", label: "Timeline", component: TimelineSection, icon: "timeline" });
registerSection({ key: "discussions", label: "Discussions", component: DiscussionsSection, icon: "discussions" });
registerSection({ key: "readiness", label: "Readiness", component: ReadinessSection, icon: "readiness" });
registerSection({ key: "ai", label: "AI Assistant", component: AISection, icon: "ai" });
registerSection({ key: "reports", label: "Reports", component: ReportsSection, icon: "reports" });
registerSection({ key: "settings", label: "Settings", component: SettingsSection, icon: "settings" });

export default function ReleaseWorkspacePage() {
  const { id: releaseId } = useParams<{ id: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [release, setRelease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!releaseId) return;
    try {
      const { data } = await api.get(`/release-workspace?release_id=${releaseId}`);
      setWorkspace(data);
      setError(null);
      try {
        const { data: releaseData } = await api.get(`/releases?id=${releaseId}`);
        setRelease(releaseData);
      } catch { /* optional */ }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        await createWorkspace();
        return;
      }
      setError("Failed to load release workspace");
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  const createWorkspace = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/release-workspace", { release_id: parseInt(releaseId) });
      setWorkspace(data);
      try {
        const { data: releaseData } = await api.get(`/releases?id=${releaseId}`);
        setRelease(releaseData);
      } catch { /* optional */ }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create workspace");
    } finally {
      setCreating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sections = getSectionsForTemplate("release");
  const activeSectionPlugin = sections.find((s) => s.key === activeSection);

  if (loading || creating) {
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
        <Button variant="secondary" onClick={() => router.push(`/catalog/releases/${releaseId}`)}>
          Back to Release
        </Button>
      </div>
    );
  }

  if (!workspace) return null;

  const mergedWorkspace = {
    ...workspace,
    release: workspace.release || release,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push(`/catalog/releases/${releaseId}`)} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title={workspace.name}
          subtitle="Release Workspace"
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={fetchData}>
                Refresh
              </Button>
            </div>
          }
        />
      </div>

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
          workspace={mergedWorkspace}
          workspaceId={workspace.id}
          onRefresh={fetchData}
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
