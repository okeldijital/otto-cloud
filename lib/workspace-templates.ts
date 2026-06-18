export interface TemplateSection {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order: number;
}

export interface TemplateStatus {
  name: string;
  slug: string;
  sort_order: number;
  color?: string;
}

export interface TemplateDefinition {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sections: TemplateSection[];
  statuses: TemplateStatus[];
}

export const WORKSPACE_TEMPLATES: TemplateDefinition[] = [
  {
    name: "Artist",
    slug: "artist",
    description: "Manage an artist profile, discography, and team",
    icon: "UserCircle",
    color: "#8b5cf6",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Discography", slug: "discography", icon: "Music", sort_order: 1 },
      { name: "Team", slug: "team", icon: "Users", sort_order: 2 },
      { name: "Contracts", slug: "contracts", icon: "FileText", sort_order: 3 },
      { name: "Calendar", slug: "calendar", icon: "Calendar", sort_order: 4 },
      { name: "Files", slug: "files", icon: "FolderOpen", sort_order: 5 },
    ],
    statuses: [
      { name: "Active", slug: "active", sort_order: 0, color: "#10b981" },
      { name: "On Hold", slug: "on_hold", sort_order: 1, color: "#f59e0b" },
      { name: "Inactive", slug: "inactive", sort_order: 2, color: "#6b7280" },
    ],
  },
  {
    name: "Album",
    slug: "album",
    description: "Full album production from writing to release",
    icon: "Disc3",
    color: "#3b82f6",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Songs", slug: "songs", icon: "Music", sort_order: 1 },
      { name: "Lyrics", slug: "lyrics", icon: "FileText", sort_order: 2 },
      { name: "Recording Sessions", slug: "recording-sessions", icon: "Mic", sort_order: 3 },
      { name: "Producers", slug: "producers", icon: "Users", sort_order: 4 },
      { name: "Writers", slug: "writers", icon: "Users", sort_order: 5 },
      { name: "Engineers", slug: "engineers", icon: "Users", sort_order: 6 },
      { name: "Contracts", slug: "contracts", icon: "FileText", sort_order: 7 },
      { name: "Artwork", slug: "artwork", icon: "Image", sort_order: 8 },
      { name: "Photos", slug: "photos", icon: "Camera", sort_order: 9 },
      { name: "Videos", slug: "videos", icon: "Video", sort_order: 10 },
      { name: "Social Campaign", slug: "social-campaign", icon: "Share2", sort_order: 11 },
      { name: "Budget", slug: "budget", icon: "DollarSign", sort_order: 12 },
      { name: "Calendar", slug: "calendar", icon: "Calendar", sort_order: 13 },
      { name: "Deliverables", slug: "deliverables", icon: "ListTodo", sort_order: 14 },
      { name: "AI Notes", slug: "ai-notes", icon: "Bot", sort_order: 15 },
      { name: "Release Checklist", slug: "release-checklist", icon: "CheckSquare", sort_order: 16 },
      { name: "Messages", slug: "messages", icon: "MessageSquare", sort_order: 17 },
    ],
    statuses: [
      { name: "Planning", slug: "planning", sort_order: 0, color: "#6b7280" },
      { name: "Writing", slug: "writing", sort_order: 1, color: "#8b5cf6" },
      { name: "Recording", slug: "recording", sort_order: 2, color: "#3b82f6" },
      { name: "Production", slug: "production", sort_order: 3, color: "#06b6d4" },
      { name: "Mixing", slug: "mixing", sort_order: 4, color: "#10b981" },
      { name: "Mastering", slug: "mastering", sort_order: 5, color: "#84cc16" },
      { name: "Artwork", slug: "artwork", sort_order: 6, color: "#f59e0b" },
      { name: "Marketing", slug: "marketing", sort_order: 7, color: "#f97316" },
      { name: "Distribution", slug: "distribution", sort_order: 8, color: "#ef4444" },
      { name: "Released", slug: "released", sort_order: 9, color: "#10b981" },
      { name: "Archived", slug: "archived", sort_order: 10, color: "#6b7280" },
    ],
  },
  {
    name: "Single",
    slug: "single",
    description: "Single track release workflow",
    icon: "Music",
    color: "#10b981",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Sessions", slug: "sessions", icon: "Mic", sort_order: 1 },
      { name: "Credits", slug: "credits", icon: "Users", sort_order: 2 },
      { name: "Artwork", slug: "artwork", icon: "Image", sort_order: 3 },
      { name: "Distribution", slug: "distribution", icon: "Share2", sort_order: 4 },
      { name: "Promotion", slug: "promotion", icon: "Megaphone", sort_order: 5 },
    ],
    statuses: [
      { name: "Planning", slug: "planning", sort_order: 0, color: "#6b7280" },
      { name: "Recording", slug: "recording", sort_order: 1, color: "#3b82f6" },
      { name: "Mixing", slug: "mixing", sort_order: 2, color: "#06b6d4" },
      { name: "Mastering", slug: "mastering", sort_order: 3, color: "#10b981" },
      { name: "Released", slug: "released", sort_order: 4, color: "#84cc16" },
    ],
  },
  {
    name: "EP",
    slug: "ep",
    description: "Extended play release management",
    icon: "Disc",
    color: "#f59e0b",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Tracks", slug: "tracks", icon: "Music", sort_order: 1 },
      { name: "Production", slug: "production", icon: "Mic", sort_order: 2 },
      { name: "Artwork", slug: "artwork", icon: "Image", sort_order: 3 },
      { name: "Marketing", slug: "marketing", icon: "Megaphone", sort_order: 4 },
    ],
    statuses: [
      { name: "Planning", slug: "planning", sort_order: 0, color: "#6b7280" },
      { name: "Production", slug: "production", sort_order: 1, color: "#3b82f6" },
      { name: "Mixing/Mastering", slug: "mixing-mastering", sort_order: 2, color: "#10b981" },
      { name: "Released", slug: "released", sort_order: 3, color: "#84cc16" },
    ],
  },
  {
    name: "Music Video",
    slug: "music-video",
    description: "Music video production from concept to premiere",
    icon: "Video",
    color: "#ef4444",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Concept", slug: "concept", icon: "Lightbulb", sort_order: 1 },
      { name: "Pre-Production", slug: "pre-production", icon: "ClipboardList", sort_order: 2 },
      { name: "Production", slug: "production", icon: "Camera", sort_order: 3 },
      { name: "Post-Production", slug: "post-production", icon: "Film", sort_order: 4 },
      { name: "Budget", slug: "budget", icon: "DollarSign", sort_order: 5 },
    ],
    statuses: [
      { name: "Concept", slug: "concept", sort_order: 0, color: "#6b7280" },
      { name: "Pre-Production", slug: "pre-production", sort_order: 1, color: "#f59e0b" },
      { name: "Production", slug: "production", sort_order: 2, color: "#ef4444" },
      { name: "Post-Production", slug: "post-production", sort_order: 3, color: "#3b82f6" },
      { name: "Premiered", slug: "premiered", sort_order: 4, color: "#10b981" },
    ],
  },
  {
    name: "Marketing Campaign",
    slug: "marketing-campaign",
    description: "Plan and execute marketing campaigns",
    icon: "Megaphone",
    color: "#f97316",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Strategy", slug: "strategy", icon: "Target", sort_order: 1 },
      { name: "Content", slug: "content", icon: "FileText", sort_order: 2 },
      { name: "Social Media", slug: "social-media", icon: "Share2", sort_order: 3 },
      { name: "Ads", slug: "ads", icon: "DollarSign", sort_order: 4 },
      { name: "Analytics", slug: "analytics", icon: "BarChart3", sort_order: 5 },
    ],
    statuses: [
      { name: "Planning", slug: "planning", sort_order: 0, color: "#6b7280" },
      { name: "Active", slug: "active", sort_order: 1, color: "#f97316" },
      { name: "Reviewing", slug: "reviewing", sort_order: 2, color: "#f59e0b" },
      { name: "Completed", slug: "completed", sort_order: 3, color: "#10b981" },
    ],
  },
  {
    name: "Tour",
    slug: "tour",
    description: "Plan and manage tour logistics",
    icon: "Globe",
    color: "#06b6d4",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Dates", slug: "dates", icon: "Calendar", sort_order: 1 },
      { name: "Venues", slug: "venues", icon: "Building2", sort_order: 2 },
      { name: "Budget", slug: "budget", icon: "DollarSign", sort_order: 3 },
      { name: "Crew", slug: "crew", icon: "Users", sort_order: 4 },
      { name: "Merchandise", slug: "merchandise", icon: "ShoppingBag", sort_order: 5 },
    ],
    statuses: [
      { name: "Planning", slug: "planning", sort_order: 0, color: "#6b7280" },
      { name: "Booking", slug: "booking", sort_order: 1, color: "#f59e0b" },
      { name: "On Tour", slug: "on-tour", sort_order: 2, color: "#06b6d4" },
      { name: "Completed", slug: "completed", sort_order: 3, color: "#10b981" },
    ],
  },
  {
    name: "Brand Partnership",
    slug: "brand-partnership",
    description: "Manage brand deals and partnerships",
    icon: "Handshake",
    color: "#8b5cf6",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Agreement", slug: "agreement", icon: "FileText", sort_order: 1 },
      { name: "Deliverables", slug: "deliverables", icon: "ListTodo", sort_order: 2 },
      { name: "Timeline", slug: "timeline", icon: "Calendar", sort_order: 3 },
      { name: "Invoices", slug: "invoices", icon: "DollarSign", sort_order: 4 },
    ],
    statuses: [
      { name: "Negotiation", slug: "negotiation", sort_order: 0, color: "#f59e0b" },
      { name: "Active", slug: "active", sort_order: 1, color: "#10b981" },
      { name: "Completed", slug: "completed", sort_order: 2, color: "#6b7280" },
    ],
  },
  {
    name: "Podcast",
    slug: "podcast",
    description: "Produce and distribute podcast episodes",
    icon: "Podcast",
    color: "#84cc16",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Episodes", slug: "episodes", icon: "ListMusic", sort_order: 1 },
      { name: "Guests", slug: "guests", icon: "Users", sort_order: 2 },
      { name: "Scripts", slug: "scripts", icon: "FileText", sort_order: 3 },
      { name: "Distribution", slug: "distribution", icon: "Share2", sort_order: 4 },
    ],
    statuses: [
      { name: "Planning", slug: "planning", sort_order: 0, color: "#6b7280" },
      { name: "Recording", slug: "recording", sort_order: 1, color: "#3b82f6" },
      { name: "Editing", slug: "editing", sort_order: 2, color: "#f59e0b" },
      { name: "Published", slug: "published", sort_order: 3, color: "#10b981" },
    ],
  },
  {
    name: "Release",
    slug: "release",
    description: "Operational hub for planning, preparing, approving, launching, and tracking music releases",
    icon: "Disc3",
    color: "#ef4444",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Metadata", slug: "metadata", icon: "Info", sort_order: 1 },
      { name: "Tasks", slug: "tasks", icon: "ListTodo", sort_order: 2 },
      { name: "Playbook", slug: "playbook", icon: "BookOpen", sort_order: 3 },
      { name: "Deliverables", slug: "deliverables", icon: "Package", sort_order: 4 },
      { name: "Videos", slug: "videos", icon: "Video", sort_order: 5 },
      { name: "Marketing", slug: "marketing", icon: "Megaphone", sort_order: 6 },
      { name: "Publications", slug: "publications", icon: "Share2", sort_order: 7 },
      { name: "Distribution", slug: "distribution", icon: "Radio", sort_order: 8 },
      { name: "Approvals", slug: "approvals", icon: "CheckSquare", sort_order: 9 },
      { name: "Files", slug: "files", icon: "FolderOpen", sort_order: 10 },
      { name: "Calendar", slug: "calendar", icon: "Calendar", sort_order: 11 },
      { name: "Timeline", slug: "timeline", icon: "Clock", sort_order: 12 },
      { name: "Discussions", slug: "discussions", icon: "MessageSquare", sort_order: 13 },
      { name: "AI Assistant", slug: "ai", icon: "Bot", sort_order: 14 },
      { name: "Reports", slug: "reports", icon: "Activity", sort_order: 15 },
      { name: "Settings", slug: "settings", icon: "Settings", sort_order: 16 },
    ],
    statuses: [
      { name: "Planning", slug: "planning", sort_order: 0, color: "#6b7280" },
      { name: "Pre-Production", slug: "pre-production", sort_order: 1, color: "#3b82f6" },
      { name: "Production", slug: "production", sort_order: 2, color: "#8b5cf6" },
      { name: "Marketing", slug: "marketing", sort_order: 3, color: "#f97316" },
      { name: "Distribution", slug: "distribution", sort_order: 4, color: "#f59e0b" },
      { name: "Launch Ready", slug: "launch-ready", sort_order: 5, color: "#10b981" },
      { name: "Released", slug: "released", sort_order: 6, color: "#84cc16" },
      { name: "Archived", slug: "archived", sort_order: 7, color: "#6b7280" },
    ],
  },
  {
    name: "Film Score",
    slug: "film-score",
    description: "Compose and produce music for film",
    icon: "Film",
    color: "#ef4444",
    sections: [
      { name: "Overview", slug: "overview", icon: "LayoutDashboard", sort_order: 0 },
      { name: "Cues", slug: "cues", icon: "Music", sort_order: 1 },
      { name: "Orchestration", slug: "orchestration", icon: "Users", sort_order: 2 },
      { name: "Recording", slug: "recording", icon: "Mic", sort_order: 3 },
      { name: "Mixing", slug: "mixing", icon: "Slider", sort_order: 4 },
    ],
    statuses: [
      { name: "Pre-Production", slug: "pre-production", sort_order: 0, color: "#6b7280" },
      { name: "Writing", slug: "writing", sort_order: 1, color: "#8b5cf6" },
      { name: "Recording", slug: "recording", sort_order: 2, color: "#3b82f6" },
      { name: "Post-Production", slug: "post-production", sort_order: 3, color: "#f59e0b" },
      { name: "Delivered", slug: "delivered", sort_order: 4, color: "#10b981" },
    ],
  },
];
