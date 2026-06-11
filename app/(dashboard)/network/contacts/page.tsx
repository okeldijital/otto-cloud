"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, Building2, Globe, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

export default function AllContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeType, setActiveType] = useState("All");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await api.get("/network/all");
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return contacts.filter((c) => {
      const name = c.item_type === "Individual" ? `${c.first_name || ""} ${c.last_name || ""}` : c.name || "";
      const matchesSearch = name.toLowerCase().includes(q);
      const matchesType = activeType === "All" || c.item_type === activeType;
      return matchesSearch && matchesType;
    });
  }, [contacts, searchTerm, activeType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Individual": return <Users size={16} />;
      case "Organization": return <Building2 size={16} />;
      case "Platform": return <Globe size={16} />;
      default: return null;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "Individual": return "primary";
      case "Organization": return "warn";
      case "Platform": return "neutral";
      default: return "neutral";
    }
  };

  const handleDelete = async (contact: any) => {
    if (!window.confirm(`Delete ${contact.name || contact.first_name}? This cannot be undone.`)) return;
    try {
      if (contact.item_type === "Organization") await api.delete(`/network/organizations?id=${contact.id}`);
      else if (contact.item_type === "Individual") await api.delete(`/network/individuals?id=${contact.id}`);
      else if (contact.item_type === "Platform") await api.delete(`/network/platforms?id=${contact.id}`);
      fetchAll();
    } catch { alert("Failed to delete contact"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Contacts"
        subtitle="Single source of truth for the entire professional ecosystem."
        actions={
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input className="input pl-9" placeholder="Search contacts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select className="input w-auto" value={activeType} onChange={(e) => setActiveType(e.target.value)}>
              <option value="All">All Types</option>
              <option value="Individual">Individuals</option>
              <option value="Organization">Organizations</option>
              <option value="Platform">Platforms</option>
            </select>
          </div>
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">No contacts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">Name</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Role / Category</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => {
                  const name = contact.item_type === "Individual"
                    ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed"
                    : contact.name || "Unnamed";
                  const role = contact.role || contact.org_type || contact.platform_type || "—";
                  return (
                    <tr key={`${contact.item_type}-${contact.id}`}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => router.push(`/network/${contact.item_type.toLowerCase()}s/${contact.id}`)}
                    >
                      <td className="p-4 font-medium text-white">{name}</td>
                      <td className="p-4">
                        <Badge variant={getTypeBadgeVariant(contact.item_type)} size="sm">
                          <span className="flex items-center gap-1">{getTypeIcon(contact.item_type)} {contact.item_type}</span>
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{role}</td>
                      <td className="p-4">
                        <Badge variant="success" size="sm">Active</Badge>
                      </td>
                      <td className="p-4">
                        <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger"
                          onClick={(e) => { e.stopPropagation(); handleDelete(contact); }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
