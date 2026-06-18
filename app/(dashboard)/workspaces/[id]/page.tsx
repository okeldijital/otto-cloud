"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, Layout, Users, Clock, FileText, Activity,
  MessageSquare, CheckSquare, Bot, Calendar, ListTodo,
  Image, Music, MoreHorizontal, Trash2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import TimelineFeed from "@/components/workspaces/TimelineFeed";
import StatusKanban from "@/components/workspaces/StatusKanban";
import api from "@/lib/api";

const DASHBOARD_SECTIONS = [
  { key: "overview", label: "Overview", icon: Layout },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "files", label: "Files", icon: FileText },
  { key: "music", label: "Music", icon: Music },
  { key: "people", label: "People", icon: Users },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "approvals", label: "Approvals", icon: CheckSquare },
  { key: "notes", label: "Notes", icon: FileText },
  { key: "ai", label: "AI Assistant", icon: Bot },
  { key: "reports", label: "Reports", icon: Activity },
];

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    try {
      const { data } = await api.get(`/workspaces?id=${id}`);
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
      await api.put(`/workspaces/${id}`, { status: newStatus });
      fetchWorkspace();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete workspace "${workspace?.name}"?`)) return;
    try {
      await api.delete(`/workspaces/${id}`);
      router.push("/workspaces");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete workspace");
    }
  };

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

  const templateColor = workspace.template?.color || "#6366f1";

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
          {DASHBOARD_SECTIONS.map((section) => {
            const Icon = section.icon;
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

      {activeSection === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Activity Feed">
              <TimelineFeed events={workspace.timeline_events} loading={false} />
            </Card>

            <Card title="Recent Files">
              {workspace.files?.length > 0 ? (
                <div className="space-y-2">
                  {workspace.files.slice(0, 5).map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-text-secondary" />
                        <div>
                          <p className="text-sm font-medium text-white">{file.original_name}</p>
                          <p className="text-[10px] text-text-secondary uppercase">{file.category}</p>
                        </div>
                      </div>
                      <Badge variant="primary">{file.category}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-sm py-4 text-center">No files uploaded yet</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Members">
              {workspace.members?.length > 0 ? (
                <div className="space-y-2">
                  {workspace.members.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                        {member.user?.name?.[0] || member.name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {member.user?.name || member.name || "Unknown"}
                        </p>
                        <p className="text-[10px] text-text-secondary uppercase">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-sm py-4 text-center">No members yet</p>
              )}
            </Card>

            <Card title="Quick Info">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Status</span>
                  <Badge variant="primary">{workspace.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Template</span>
                  <span className="text-sm text-white">{workspace.template?.name || "Custom"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Members</span>
                  <span className="text-sm text-white">{workspace.members?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Files</span>
                  <span className="text-sm text-white">{workspace.files?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Activities</span>
                  <span className="text-sm text-white">{workspace.timeline_events?.length || 0}</span>
                </div>
              </div>
            </Card>

            {workspace.template?.sections && (
              <Card title="Workspace Sections">
                <div className="grid grid-cols-2 gap-2">
                  {workspace.template.sections.map((section: any) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.slug)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: templateColor }}
                      />
                      <span className="text-xs font-medium text-white truncate">{section.name}</span>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Bot size={20} className="text-accent" />
                <h3 className="text-sm font-bold text-white">AI Workspace Assistant</h3>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Ask about this workspace's files, tasks, and history.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Summarize progress", "Find missing items", "Generate report"].map((prompt) => (
                  <button
                    key={prompt}
                    className="px-3 py-1.5 text-[10px] font-bold bg-white/5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-white transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === "timeline" && (
        <Card title="Full Timeline">
          <TimelineFeed events={workspace.timeline_events} loading={false} />
        </Card>
      )}

      {activeSection === "people" && (
        <Card title="Members">
          {workspace.members?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspace.members.map((member: any) => (
                <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent text-lg font-bold">
                    {member.user?.name?.[0] || member.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{member.user?.name || member.name || "Unknown"}</p>
                    <p className="text-xs text-text-secondary">{member.user?.email || member.email || ""}</p>
                    <Badge variant="primary">{member.role}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm py-8 text-center">No members yet</p>
          )}
        </Card>
      )}

      {activeSection === "files" && (
        <Card title="Files">
          {workspace.files?.length > 0 ? (
            <div className="space-y-2">
              {workspace.files.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-text-secondary" />
                    <div>
                      <p className="text-sm font-medium text-white">{file.original_name}</p>
                      <p className="text-[10px] text-text-secondary">
                        {file.category} &middot; {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant="primary">{file.category}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm py-8 text-center">No files uploaded yet</p>
          )}
        </Card>
      )}

      {activeSection === "tasks" && (
        <Card title="Tasks">
          <p className="text-text-secondary text-sm py-8 text-center">
            Tasks will be available in a future update. Tasks from the existing task system will integrate here.
          </p>
        </Card>
      )}

      {activeSection === "notes" && (
        <Card title="Notes">
          <p className="text-text-secondary text-sm py-8 text-center">
            Workspace notes will integrate with the existing notes system.
          </p>
        </Card>
      )}

      {activeSection === "ai" && (
        <Card title="AI Workspace Assistant">
          <div className="py-8 text-center">
            <Bot size={48} className="mx-auto mb-4 text-accent opacity-50" />
            <p className="text-text-secondary text-sm mb-4">
              The AI assistant knows about this workspace's files, tasks, members, and history.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {[
                "Summarize today's progress",
                "Generate release notes",
                "Create a marketing strategy",
                "Write social captions",
                "Identify missing deliverables",
                "Check publishing metadata",
                "Generate meeting minutes",
                "Suggest next tasks",
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-xl text-text-secondary hover:text-white transition-colors border border-white/5"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
