"use client";

import { useState, useEffect } from "react";
import { Share2, ArrowRight, Calendar } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/network/relationships").then((r) => setRelationships(Array.isArray(r.data) ? r.data : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading Relationships...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relationships"
        subtitle="The intelligence layer mapping professional connections."
        actions={<Button variant="primary" size="sm"><Share2 size={14} /> Define Relationship</Button>}
      />

      {relationships.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {relationships.map((rel) => (
            <Card key={rel.id} className="hover:border-accent/40 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" size="sm">{rel.source_type}</Badge>
                  <ArrowRight size={14} className="text-text-secondary" />
                  <Badge variant="primary" size="sm">{rel.target_type}</Badge>
                </div>
                <div className="text-xs text-text-secondary flex items-center gap-1"><Calendar size={12} />{rel.start_date ? new Date(rel.start_date).getFullYear() : "Ongoing"}</div>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2"><span className="text-sm font-normal text-text-secondary uppercase tracking-widest">{rel.relationship_type?.replace(/_/g, " ")}</span></h3>
              <div className="flex items-center gap-2 mb-4 text-sm">
                <span className="font-semibold text-text-primary">Entity #{rel.source_id}</span>
                <span className="text-text-secondary italic">governs</span>
                <span className="font-semibold text-text-primary">Entity #{rel.target_id}</span>
              </div>
              <div className="bg-surface-elevated border border-border rounded-lg p-3 text-sm text-text-secondary italic mb-4">"{rel.notes || "No notes provided for this relationship."}"</div>
              <div className="flex justify-between items-center"><button className="text-xs font-bold text-text-secondary hover:text-text-primary uppercase tracking-widest transition-colors">View Contract</button><Badge variant="success" size="sm">Governed</Badge></div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="py-12 text-center">
            <Share2 size={48} className="mx-auto text-text-secondary mb-4 opacity-40" />
            <h3 className="text-xl font-bold text-text-primary mb-2">No relationships defined yet</h3>
            <p className="text-text-secondary mb-8 max-w-md mx-auto text-sm">Relationships are the connections between artists, publishers, distributors, and more. Define them to unlock ecosystem awareness.</p>
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              <span className="px-3 py-1 bg-surface-elevated rounded-full border border-border text-text-secondary">Artist signed TO Publisher</span>
              <span className="px-3 py-1 bg-surface-elevated rounded-full border border-border text-text-secondary">Work registered WITH PRO</span>
              <span className="px-3 py-1 bg-surface-elevated rounded-full border border-border text-text-secondary">Artist released VIA Distributor</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
