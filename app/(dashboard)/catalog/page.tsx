"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Music, UserCircle, ListMusic, BookOpen, Building2, ShieldCheck, ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

const sections = [
  { icon: UserCircle, label: "Artists", path: "/catalog/artists" },
  { icon: ListMusic, label: "Releases", path: "/catalog/releases" },
  { icon: Music, label: "Tracks", path: "/catalog/tracks" },
  { icon: BookOpen, label: "Works", path: "/catalog/works" },
  { icon: Building2, label: "Labels", path: "/catalog/labels" },
  { icon: Building2, label: "Publishers", path: "/catalog/publishers" },
  { icon: ShieldCheck, label: "PROs", path: "/catalog/pros" },
];

export default function CatalogPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.allSettled([
      api.get("/artists").then(r => r.data?.total ?? 0).catch(() => 0),
      api.get("/releases").then(r => r.data?.total ?? 0).catch(() => 0),
      api.get("/tracks").then(r => r.data?.total ?? 0).catch(() => 0),
      api.get("/works").then(r => r.data?.total ?? 0).catch(() => 0),
      api.get("/labels").then(r => r.data?.total ?? 0).catch(() => 0),
      api.get("/publishers").then(r => r.data?.total ?? 0).catch(() => 0),
      api.get("/pros").then(r => r.data?.total ?? 0).catch(() => 0),
    ]).then((results) => {
      const keys = ["Artists", "Releases", "Tracks", "Works", "Labels", "Publishers", "PROs"];
      const newCounts: Record<string, number> = {};
      results.forEach((r, i) => { if (r.status === "fulfilled") newCounts[keys[i]] = r.value; });
      setCounts(newCounts);
    });
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="Catalog Management" subtitle="Browse and manage your full catalog" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sections.map(({ icon: Icon, label, path }) => (
          <Link key={path} href={path}
            className="group bg-surface border border-border rounded-xl p-6 hover:border-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-surface-elevated border border-border rounded-lg text-accent">
                <Icon size={24} />
              </div>
              <ArrowRight size={18} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">{label}</h3>
            <p className="text-sm text-text-secondary mt-1">
              {counts[label] !== undefined ? `${counts[label]} items` : "Loading..."}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
