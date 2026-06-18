export interface SectionPlugin {
  key: string;
  label: string;
  icon: string;
  /** Template slugs this section is available for. Empty = all templates. */
  templates?: string[];
  /** If true, this section is only shown when explicitly enabled by the template */
  optional?: boolean;
  /** Sort order within the navigation bar */
  defaultOrder?: number;
  /** Component to render */
  component: React.ComponentType<SectionProps>;
}

export interface SectionProps {
  workspace: any;
  workspaceId: number;
  onRefresh: () => void;
  onNavigate: (key: string) => void;
}

export interface WorkspaceEngineConfig {
  /** The workspace data object */
  workspace: any;
  /** All section plugins available in the engine */
  sections: SectionPlugin[];
  /** The currently active section key */
  activeSection: string;
  /** Called when active section changes */
  onSectionChange: (key: string) => void;
  /** Called to refresh workspace data */
  onRefresh: () => void;
}

export interface ReadinessCategory {
  label: string;
  key: string;
  score: number;
  weight: number;
}

export interface ReadinessResult {
  overallScore: number;
  categories: ReadinessCategory[];
}

export interface WorkspaceHealthItem {
  type: "overdue" | "blocked" | "missing" | "risk";
  label: string;
  severity: "high" | "medium" | "low";
  entityType: string;
  entityId: number;
}

export interface WorkspaceHealthResult {
  score: number;
  items: WorkspaceHealthItem[];
}

import {
  LayoutDashboard, Info, ListTodo, BookOpen, Package, Flag,
  Video, Megaphone, Share2, Radio, CheckSquare, FolderOpen,
  Calendar, Clock, MessageSquare, Bot, Activity, Settings,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

export const SECTION_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  metadata: Info,
  tasks: ListTodo,
  playbook: BookOpen,
  deliverables: Package,
  milestones: Flag,
  videos: Video,
  marketing: Megaphone,
  publications: Share2,
  distribution: Radio,
  approvals: CheckSquare,
  files: FolderOpen,
  calendar: Calendar,
  timeline: Clock,
  discussions: MessageSquare,
  ai: Bot,
  reports: Activity,
  settings: Settings,
  dependencies: GitBranch,
};
