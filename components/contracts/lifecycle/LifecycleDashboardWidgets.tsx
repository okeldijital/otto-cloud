"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";

function Widget({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-premium-glass border border-white/5 rounded-2xl p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-text-secondary mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs mt-1 text-text-secondary">{subtitle}</p>
          )}
        </div>
        <div className="p-2.5 bg-white/5 rounded-xl text-accent">{icon}</div>
      </div>
    </div>
  );
}

/**
 * Dashboard lifecycle summary cards (no notifications).
 */
export default function LifecycleDashboardWidgets() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    api
      .get("/contracts/lifecycle-summary")
      .then((r) => setSummary(r.data?.data?.summary || null))
      .catch(() => setSummary(null));
  }, []);

  if (!summary) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-white">Contract lifecycle</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Widget
          title="Expiring soon"
          value={summary.expiringSoon ?? 0}
          subtitle="Next 30 days"
          icon={<CalendarClock size={20} />}
        />
        <Widget
          title="Pending renewal"
          value={summary.pendingRenewal ?? 0}
          icon={<RefreshCw size={20} />}
        />
        <Widget
          title="Recently verified"
          value={summary.recentlyVerified ?? 0}
          subtitle="Last 7 days"
          icon={<CheckCircle2 size={20} />}
        />
        <Widget
          title="Recently amended"
          value={summary.recentlyAmended ?? 0}
          subtitle="Last 7 days"
          icon={<FileWarning size={20} />}
        />
        <Widget
          title="Expired"
          value={summary.expired ?? 0}
          icon={<AlertTriangle size={20} />}
        />
      </div>
    </div>
  );
}
