"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Music, UserCircle, ListMusic, BookOpen, Building2, ShieldCheck, ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

const sections = [
  { icon: UserCircle, label: "Artists", path: "/catalog/artists", color: "text-blue-400", count: null },
  { icon: ListMusic, label: "Releases", path: "/catalog/releases", color: "text-emerald-400", count: null },
  { icon: Music, label: "Tracks", path: "/catalog/tracks", color: "text-purple-400", count: null },
  { icon: BookOpen, label: "Works", path: "/catalog/works", color: "text-amber-400", count: null },
  { icon: Building2, label: "Labels", path: "/catalog/labels", color: "text-rose-400", count: null },
  { icon: Building2, label: "Publishers", path: "/catalog/publishers", color: "text-cyan-400", count: null },
  { icon: ShieldCheck, label: "PROs", path: "/catalog/pros", color: "text-orange-400", count: null },
];

export default function CatalogPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.allSettled([
      api.get("/artists").then(r => Array.isArray(r.data) ? r.data.length : 0).catch(() => 0),
      api.get("/releases").then(r => Array.isArray(r.data) ? r.data.length : 0).catch(() => 0),
      api.get("/tracks").then(r => Array.isArray(r.data) ? r.data.length : 0).catch(() => 0),
      api.get("/works").then(r => Array.isArray(r.data) ? r.data.length : 0).catch(() => 0),
      api.get("/labels").then(r => Array.isArray(r.data) ? r.data.length : 0).catch(() => 0),
      api.get("/publishers").then(r => Array.isArray(r.data) ? r.data.length : 0).catch(() => 0),
      api.get("/pros").then(r => Array.isArray(r.data) ? r.data.length : 0).catch(() => 0),
    ]).then((results) => {
      const keys = ["Artists", "Releases", "Tracks", "Works", "Labels", "Publishers", "PROs"];
      const newCounts: Record<string, number> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") newCounts[keys[i]] = r.value;
      });
      setCounts(newCounts);
    });
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="Catalog Management" subtitle="Browse and manage your full catalog" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sections.map(({ icon: Icon, label, path, color }) => (
          <Link key={path} href={path}
            className="group bg-premium-glass border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:border-white/20 transition-all hover:shadow-glow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 bg-white/5 rounded-xl ${color}`}>
                <Icon size={24} />
              </div>
              <ArrowRight size={18} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-accent transition-colors">{label}</h3>
            <p className="text-sm text-text-secondary mt-1">
              {counts[label] !== undefined ? `${counts[label]} items` : "Loading..."}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
