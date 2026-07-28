"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Activity, Bell, Clock, RefreshCw } from "lucide-react";
import api from "@/lib/api";

/**
 * Read-only platform event monitoring widgets (M4.2).
 * No operational editing.
 */
export default function PlatformEventsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [dlq, setDlq] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError("");
      const [m, e, d] = await Promise.all([
        api.get("/platform/events?view=metrics"),
        api.get("/platform/events?limit=8"),
        api.get("/platform/events?view=dead_letter&status=open&limit=5"),
      ]);
      setMetrics(m.data?.data?.organization || m.data?.data || null);
      setRecent(e.data?.data?.items || []);
      setDlq(d.data?.data?.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load platform events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="text-sm text-text-secondary py-4">Loading platform events…</div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-400 py-2 flex items-center gap-2">
        <AlertTriangle size={16} /> {error}
      </div>
    );
  }

  const cards = [
    {
      title: "Events published",
      value: metrics?.eventsPublished ?? 0,
      icon: <Activity size={18} />,
    },
    {
      title: "Dead letter",
      value: metrics?.deadLetterCount ?? 0,
      icon: <AlertTriangle size={18} />,
    },
    {
      title: "Notification queue",
      value: metrics?.notificationQueue ?? 0,
      icon: <Bell size={18} />,
    },
    {
      title: "Reminder queue",
      value: metrics?.reminderQueue ?? 0,
      icon: <Clock size={18} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Platform events</h2>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="text-xs text-text-secondary hover:text-white flex items-center gap-1"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.title}
            className="bg-premium-glass border border-white/5 rounded-xl p-4"
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="text-xs text-text-secondary">{c.title}</p>
                <p className="text-xl font-bold text-white mt-1">{c.value}</p>
              </div>
              <div className="text-accent p-2 bg-white/5 rounded-lg">{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-premium-glass border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">
            Recent events
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-text-secondary">No events yet.</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-auto">
              {recent.map((ev) => (
                <li
                  key={ev.id}
                  className="text-sm border-b border-white/5 pb-2 last:border-0"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-white font-mono text-xs truncate">
                      {ev.eventName}
                    </span>
                    <span className="text-text-secondary text-xs shrink-0">
                      {ev.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {ev.producer} ·{" "}
                    {ev.publishedAt
                      ? new Date(ev.publishedAt).toLocaleString()
                      : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-premium-glass border border-white/5 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">
            Dead letter queue
          </h3>
          {dlq.length === 0 ? (
            <p className="text-sm text-text-secondary">No open dead letters.</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-auto">
              {dlq.map((item) => (
                <li
                  key={item.id}
                  className="text-sm border-b border-white/5 pb-2 last:border-0"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-white text-xs truncate">
                      {item.subscriberId}
                    </span>
                    <span className="text-xs text-red-400">
                      retries {item.retryCount}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                    {item.failureReason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
