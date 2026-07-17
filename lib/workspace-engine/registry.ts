import { SectionPlugin, SectionProps } from "./types";

const registeredSections = new Map<string, SectionPlugin>();

export function registerSection(plugin: SectionPlugin): void {
  registeredSections.set(plugin.key, plugin);
}

export function getSection(key: string): SectionPlugin | undefined {
  return registeredSections.get(key);
}

export function getSectionsForTemplate(templateSlug?: string, explicitKeys?: string[]): SectionPlugin[] {
  let sections = Array.from(registeredSections.values());

  if (explicitKeys && explicitKeys.length > 0) {
    const keySet = new Set(explicitKeys);
    sections = sections.filter((s) => keySet.has(s.key));
    sections.sort((a, b) => {
      const ai = explicitKeys.indexOf(a.key);
      const bi = explicitKeys.indexOf(b.key);
      return ai - bi;
    });
    return sections;
  }

  if (templateSlug) {
    sections = sections.filter(
      (s) => !s.templates || s.templates.length === 0 || s.templates.includes(templateSlug)
    );
  }

  sections.sort((a, b) => (a.defaultOrder ?? 99) - (b.defaultOrder ?? 99));
  return sections;
}

export function getAllSections(): SectionPlugin[] {
  return Array.from(registeredSections.values()).sort(
    (a, b) => (a.defaultOrder ?? 99) - (b.defaultOrder ?? 99)
  );
}

let lazyInitDone = false;

export async function ensureSectionsLoaded(): Promise<void> {
  if (lazyInitDone) return;
  lazyInitDone = true;

  const sectionModules: Record<string, { default: React.ComponentType<SectionProps> }> = {};

  try {
    const overview = await import("@/components/workspace-sections/OverviewSection");
    sectionModules.overview = overview;
  } catch { /* optional */ }

  try {
    const deliverables = await import("@/components/workspace-sections/DeliverablesSection");
    sectionModules.deliverables = deliverables;
  } catch { /* optional */ }

  try {
    const approvals = await import("@/components/workspace-sections/ApprovalsSection");
    sectionModules.approvals = approvals;
  } catch { /* optional */ }

  try {
    const publications = await import("@/components/workspace-sections/PublicationsSection");
    sectionModules.publications = publications;
  } catch { /* optional */ }

  try {
    const videos = await import("@/components/workspace-sections/VideosSection");
    sectionModules.videos = videos;
  } catch { /* optional */ }

  try {
    const marketing = await import("@/components/workspace-sections/MarketingSection");
    sectionModules.marketing = marketing;
  } catch { /* optional */ }

  try {
    const publications = await import("@/components/workspace-sections/PublicationsSection");
    sectionModules.publications = publications;
  } catch { /* optional */ }

  try {
    const videos = await import("@/components/workspace-sections/VideosSection");
    sectionModules.videos = videos;
  } catch { /* optional */ }

  try {
    const readiness = await import("@/components/workspace-sections/ReadinessSection");
    sectionModules.readiness = readiness;
  } catch { /* optional */ }

  try {
    const discussions = await import("@/components/workspace-sections/DiscussionsSection");
    sectionModules.discussions = discussions;
  } catch { /* optional */ }

  try {
    const timeline = await import("@/components/workspace-sections/TimelineSection");
    sectionModules.timeline = timeline;
  } catch { /* optional */ }

  try {
    const files = await import("@/components/workspace-sections/FilesSection");
    sectionModules.files = files;
  } catch { /* optional */ }

  try {
    const milestones = await import("@/components/workspace-sections/MilestonesSection");
    sectionModules.milestones = milestones;
  } catch { /* optional */ }

  try {
    const reports = await import("@/components/workspace-sections/ReportsSection");
    sectionModules.reports = reports;
  } catch { /* optional */ }

  try {
    const ai = await import("@/components/workspace-sections/AISection");
    sectionModules.ai = ai;
  } catch { /* optional */ }

  try {
    const settings = await import("@/components/workspace-sections/SettingsSection");
    sectionModules.settings = settings;
  } catch { /* optional */ }

  try {
    const dependencies = await import("@/components/workspace-sections/DependencySection");
    sectionModules.dependencies = dependencies;
  } catch { /* optional */ }

  try {
    const dynamicFields = await import("@/components/workspace-sections/DynamicFieldsSection");
    sectionModules.dynamicFields = dynamicFields;
  } catch { /* optional */ }

  const defaults: Array<{ key: string; label: string; icon: string; order: number }> = [
    { key: "overview", label: "Overview", icon: "LayoutDashboard", order: 0 },
    { key: "deliverables", label: "Deliverables", icon: "Package", order: 3 },
    { key: "milestones", label: "Milestones", icon: "Flag", order: 4 },
    { key: "approvals", label: "Approvals", icon: "CheckSquare", order: 5 },
    { key: "publications", label: "Publications", icon: "Share2", order: 6 },
    { key: "videos", label: "Videos", icon: "Video", order: 7 },
    { key: "marketing", label: "Marketing", icon: "Megaphone", order: 8 },
    { key: "files", label: "Files", icon: "FolderOpen", order: 9 },
    { key: "timeline", label: "Timeline", icon: "Clock", order: 10 },
    { key: "discussions", label: "Discussions", icon: "MessageSquare", order: 11 },
    { key: "dependencies", label: "Dependencies", icon: "GitBranch", order: 12 },
    { key: "readiness", label: "Readiness", icon: "Activity", order: 13 },
    { key: "reports", label: "Reports", icon: "Activity", order: 14 },
    { key: "ai", label: "AI Assistant", icon: "Bot", order: 15 },
    { key: "settings", label: "Settings", icon: "Settings", order: 16 },
  ];

  for (const def of defaults) {
    if (!registeredSections.has(def.key) && sectionModules[def.key]) {
      const Comp = sectionModules[def.key]?.default;
      if (Comp) {
        registerSection({
          key: def.key,
          label: def.label,
          icon: def.icon,
          defaultOrder: def.order,
          component: Comp,
        });
      }
    }
  }
}
