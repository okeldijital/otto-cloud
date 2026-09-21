"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function NetworkHub() {
  const router = useRouter();
  const [counts, setCounts] = useState({ people: 0, organizations: 0 });

  useEffect(() => {
    fetch("/api/network/all").then((response) => response.json()).then((items) => {
      if (!Array.isArray(items)) return;
      setCounts({
        people: items.filter((item) => item.item_type === "Individual").length,
        organizations: items.filter((item) => item.item_type === "Organization").length,
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network"
        subtitle="Industry people and organizations connected to your catalog and business."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/network/individuals")}><Users size={15} />People</Button>
            <Button variant="primary" size="sm" onClick={() => router.push("/network/organizations")}><Building2 size={15} />Organizations</Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <button type="button" onClick={() => router.push("/network/individuals")} className="text-left">
          <Card title="People" subtitle="Industry contacts, collaborators and professional relationships.">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-semibold text-text-primary">{counts.people}</span>
              <Users size={28} className="text-accent" />
            </div>
          </Card>
        </button>
        <button type="button" onClick={() => router.push("/network/organizations")} className="text-left">
          <Card title="Organizations" subtitle="Distributors, labels, publishers, studios, legal firms and other companies.">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-semibold text-text-primary">{counts.organizations}</span>
              <Building2 size={28} className="text-accent" />
            </div>
          </Card>
        </button>
      </div>
      <Card title="Network scope" subtitle="Network is part of AutoCore. It contains contacts only — no project management, tasks or platform execution.">
        <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
          <span className="rounded-md border border-border bg-surface-elevated px-2 py-1">People</span>
          <span className="rounded-md border border-border bg-surface-elevated px-2 py-1">Organizations</span>
          <span className="rounded-md border border-border bg-surface-elevated px-2 py-1">Distributor relationships</span>
          <span className="rounded-md border border-border bg-surface-elevated px-2 py-1">Industry contacts</span>
        </div>
      </Card>
    </div>
  );
}
