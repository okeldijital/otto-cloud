"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  FileText,
  HeartPulse,
  RefreshCw,
  Shield,
} from "lucide-react";
import api from "@/lib/api";

function Widget({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-premium-glass border border-white/5 rounded-2xl p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-text-secondary mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className="p-2.5 bg-white/5 rounded-xl text-accent">{icon}</div>
      </div>
    </div>
  );
}

/** Org-level release↔contract integration cards (no analytics). */
export default function ReleaseContractDashboardWidgets() {
  const [dash, setDash] = useState<any>(null);

  useEffect(() => {
    api
      .get("/releases/contracts-dashboard")
      .then((r) => setDash(r.data?.data?.dashboard || null))
      .catch(() => setDash(null));
  }, []);

  if (!dash) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-white">
        Release contracts
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Widget
          title="Contracts linked"
          value={dash.contractsLinked ?? 0}
          icon={<FileText size={18} />}
        />
        <Widget
          title="Expiring"
          value={dash.contractsExpiring ?? 0}
          icon={<AlertTriangle size={18} />}
        />
        <Widget
          title="Need renewal"
          value={dash.contractsNeedingRenewal ?? 0}
          icon={<RefreshCw size={18} />}
        />
        <Widget
          title="Under review"
          value={dash.contractsUnderReview ?? 0}
          icon={<Shield size={18} />}
        />
        <Widget
          title="Recently amended"
          value={dash.contractsRecentlyAmended ?? 0}
          icon={<FileText size={18} />}
        />
        <Widget
          title="Critical health"
          value={dash.byHealth?.critical ?? 0}
          icon={<HeartPulse size={18} />}
        />
      </div>
    </div>
  );
}
