"use client";

import { useState } from "react";
import { Download, Loader } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface ExportButtonProps {
  entity: string;
  label?: string;
  ids?: number[];
  variant?: "primary" | "secondary" | "danger" | "ghost" | "orange";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function ExportButton({
  entity,
  label = "Export",
  ids,
  variant = "secondary",
  size = "sm",
  className = "",
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "csv" | "xlsx" | "json") => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ entity, format });
      if (ids?.length) params.set("ids", ids.join(","));
      const url = `/api/export?${params.toString()}`;

      if (format === "json") {
        const { data } = await api.get(url);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, `${entity}.json`);
      } else {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = format === "xlsx" ? "xlsx" : "csv";
        downloadBlob(blob, `${entity}_${new Date().toISOString().split("T")[0]}.${ext}`);
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <Button
        variant={variant}
        size={size}
        disabled={exporting}
        onClick={() => {
          const menu = document.getElementById(`export-menu-${entity}`);
          if (menu) menu.classList.toggle("hidden");
        }}
      >
        {exporting ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
        {label}
      </Button>
      <div
        id={`export-menu-${entity}`}
        className="hidden absolute right-0 mt-1 z-50 bg-premium-glass border border-white/10 rounded-xl overflow-hidden shadow-xl backdrop-blur-xl"
      >
        {(["csv", "xlsx", "json"] as const).map((fmt) => (
          <button
            key={fmt}
            className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            onClick={() => {
              document.getElementById(`export-menu-${entity}`)?.classList.add("hidden");
              handleExport(fmt);
            }}
          >
            .{fmt.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
