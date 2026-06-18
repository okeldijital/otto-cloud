"use client";

import { useState } from "react";
import { Send, Bot } from "lucide-react";
import Card from "@/components/ui/Card";
import { type SectionProps } from "@/lib/workspace-engine";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AISection({ workspace, workspaceId }: SectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm Otto AI. I can help you manage this workspace. Ask me anything about deliverables, milestones, approvals, or to draft content." },
  ]);
  const [input, setInput] = useState("");

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setMessages((prev) => [...prev, { role: "assistant", content: "Let me think about that..." }]);

    try {
      const res = await fetch("/api/ai?action=chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input, role: "user", context: { workspace_id: workspaceId, workspace_name: workspace.name } }),
      });
      const data = await res.json();
      const lastMsg = data?.ai_messages?.filter((m: any) => m.role === "assistant").pop();
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: lastMsg?.content || "Sorry, I couldn't process that." };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, I'm having trouble connecting right now." };
        return updated;
      });
    }
  };

  return (
    <Card title={<span className="flex items-center gap-2"><Bot size={16} /> Otto AI Assistant</span>}>
      <div className="space-y-3 mb-4" style={{ maxHeight: "400px", overflowY: "auto" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === "user" ? "bg-accent/20 text-accent" : "bg-white/5 text-white"}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Ask Otto AI..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button onClick={send} className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent hover:bg-accent/30 transition-all"><Send size={16} /></button>
      </div>
    </Card>
  );
}
