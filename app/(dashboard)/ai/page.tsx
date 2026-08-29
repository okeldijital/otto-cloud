"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Brain,
  Cpu,
  DollarSign,
  FileText,
  Loader2,
  PenTool,
  RefreshCw,
  Send,
  Shield,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

type AIHealth = {
  status?: string;
  version?: string;
  tools?: string[];
  enabled_tools?: string[];
};

type AITool = {
  id?: string;
  name?: string;
  description?: string;
  summary?: string;
  status?: string;
  enabled?: boolean;
};

type AISession = {
  id?: string;
  session_id?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

const TOOL_LINKS: Record<string, string> = {
  analytics: "/ai/analytics",
  royalties: "/ai/royalties",
  contracts: "/ai/contracts",
  ai_audit: "/ai/audit",
  ai_draft: "/ai/draft",
  "core-write": "/ai/core-write",
  "release-integration": "/ai/release-integration",
};

const TOOL_ICONS: Record<string, typeof Cpu> = {
  analytics: BarChart3,
  royalties: DollarSign,
  contracts: FileText,
  "core-write": PenTool,
  "release-integration": Cpu,
};

export default function AIDashboardPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [health, setHealth] = useState<AIHealth | null>(null);
  const [tools, setTools] = useState<AITool[]>([]);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [activeSession, setActiveSession] = useState<AISession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [healthRes, toolsRes, sessionsRes] = await Promise.all([
        api.get("/ai", { params: { action: "health" } }).catch(() => null),
        api.get("/ai", { params: { action: "tools" } }).catch(() => null),
        api.get("/ai", { params: { action: "sessions" } }).catch(() => null),
      ]);

      if (healthRes) setHealth(healthRes.data);
      if (toolsRes) {
        setTools(
          Array.isArray(toolsRes.data)
            ? toolsRes.data
            : toolsRes.data?.tools || [],
        );
      }
      if (sessionsRes) {
        const nextSessions: AISession[] = Array.isArray(sessionsRes.data)
          ? sessionsRes.data
          : sessionsRes.data?.sessions || [];
        setSessions(nextSessions);
        if (nextSessions.length > 0 && !activeSession) {
          setActiveSession(nextSessions[0]);
        }
      }
    } catch {
      setError("Failed to load AI dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);
    setSending(true);

    try {
      const res = await api.post(
        "/ai",
        {
          session_id: activeSession?.session_id || activeSession?.id,
          message: text,
        },
        { params: { action: "chat" } },
      );

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            res.data?.response ||
            res.data?.message ||
            JSON.stringify(res.data),
        },
      ]);
    } catch (err: any) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Error: " +
            (err?.response?.data?.error || "Failed to send message"),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const enabledTools = health?.tools || health?.enabled_tools || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Assistant"
          subtitle="AI-powered insights and tools"
        />
        <div className="flex items-center justify-center p-12">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Assistant"
          subtitle="AI-powered insights and tools"
        />
        <Card>
          <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => void fetchAll()}>
              <RefreshCw size={14} /> Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        subtitle="AI-powered insights and tools"
        actions={
          <Button variant="secondary" size="sm" onClick={() => void fetchAll()}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
            <Brain size={20} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-text-primary">
              AI System {health?.status === "ok" ? "Online" : "Degraded"}
            </h3>
            {health?.version && (
              <p className="mt-0.5 text-xs text-text-secondary">
                Version {health.version}
              </p>
            )}
            {enabledTools.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {enabledTools.map((tool) => (
                  <Badge key={tool} variant="primary" size="sm">
                    {tool}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card
        title="Chat"
        subtitle={
          activeSession
            ? `Session: ${activeSession.session_id || activeSession.id}`
            : "Start a conversation"
        }
      >
        <div className="flex h-[400px] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-1">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                Send a message to start chatting with the AI assistant.
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    message.role === "user"
                      ? "bg-accent/20 text-text-primary"
                      : "bg-surface-elevated text-text-primary"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <input
              aria-label="Chat message"
              className="input flex-1"
              placeholder="Type a message..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSend()}
              disabled={sending || !input.trim()}
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Send
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-text-primary">
          AI Tools
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.length === 0 ? (
            <Card>
              <p className="text-sm text-text-secondary">No tools available.</p>
            </Card>
          ) : (
            tools.map((tool) => {
              const toolName = tool.name || tool.id || "AI tool";
              const slug = String(toolName)
                .toLowerCase()
                .replace(/\s+/g, "-");
              const link = TOOL_LINKS[slug] || `/${slug}`;
              const Icon = TOOL_ICONS[slug] || Cpu;
              const status =
                tool.status || (tool.enabled ? "enabled" : "disabled");
              const isEnabled = status === "enabled" || status === "active";

              return (
                <button
                  key={toolName}
                  type="button"
                  className="group rounded-xl border border-border bg-surface p-5 text-left transition-colors hover:border-accent/40 hover:bg-surface-elevated"
                  onClick={() => router.push(link)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 group-hover:bg-accent/20">
                      <Icon size={20} className="text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-text-primary">
                        {toolName}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                        {tool.description || tool.summary || "AI-powered tool"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge
                      variant={isEnabled ? "success" : "neutral"}
                      size="sm"
                    >
                      {isEnabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <Card title="Quick Actions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => router.push("/ai/audit")}
          >
            <Shield size={14} /> Run Audit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => router.push("/ai/draft")}
          >
            <FileText size={14} /> Draft Contract
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => router.push("/ai/analytics")}
          >
            <BarChart3 size={14} /> Analytics
          </Button>
        </div>
      </Card>
    </div>
  );
}
