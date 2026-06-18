"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

export default function DiscussionsSection({ workspace, workspaceId, onRefresh }: SectionProps) {
  const [channels, setChannels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    setChannels(workspace.discussion_channels || []);
    if (workspace.discussion_channels?.length > 0 && !activeChannel) {
      setActiveChannel(workspace.discussion_channels[0].id);
    }
  }, [workspace.discussion_channels]);

  useEffect(() => {
    if (activeChannel) {
      setMessages(workspace.messages?.filter((m: any) => m.channel_id === activeChannel) || []);
    }
  }, [activeChannel, workspace.messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChannel) return;
    try {
      await api.post("/workspace/messages", {
        workspace_id: workspaceId, channel_id: activeChannel, content: newMessage,
      });
      setNewMessage(""); onRefresh();
    } catch { /* */ }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ minHeight: "400px" }}>
      <div className="md:col-span-1">
        <Card title="Channels">
          {channels.length === 0 ? <p className="text-text-secondary text-xs py-4 text-center">No channels</p>
          : channels.map((ch: any) => (
            <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all mb-1 ${activeChannel === ch.id ? "bg-accent/20 text-accent" : "text-text-secondary hover:text-white hover:bg-white/5"}`}>
              # {ch.name}
            </button>
          ))}
        </Card>
      </div>
      <div className="md:col-span-3">
        <Card title={channels.find((ch) => ch.id === activeChannel)?.name || "Messages"}>
          <div className="space-y-3 mb-4" style={{ maxHeight: "400px", overflowY: "auto" }}>
            {messages.length === 0 ? <p className="text-text-secondary text-sm py-8 text-center">No messages</p>
            : messages.map((msg: any) => (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                  {msg.sender?.name?.[0] || msg.sender_name?.[0] || "?"}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{msg.sender?.name || msg.sender_name || "Unknown"}</p>
                  <p className="text-sm text-text-secondary">{msg.content}</p>
                  <p className="text-[10px] text-text-secondary">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
            <Button variant="primary" onClick={sendMessage}><Send size={14} /></Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
