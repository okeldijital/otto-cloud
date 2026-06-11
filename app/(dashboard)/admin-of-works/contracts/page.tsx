"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FileText, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import api from "@/lib/api";

const columns = [
  { key: "title", label: "Title", sortable: true },
  { key: "status", label: "Status", sortable: true, render: (row: any) => row.status || "—" },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    render: (row: any) => row.created_at ? new Date(row.created_at).toLocaleDateString() : "—",
  },
];

export default function ContractsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get("/contracts");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        subtitle="Digital contract registry"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={16} />
            Add Contract
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onRowClick={(row: any) => window.location.href = `/admin-of-works/contracts/${row.id}`}
        onEdit={(row: any) => window.location.href = `/admin-of-works/contracts/${row.id}`}
        onDelete={() => {}}
      />
    </div>
  );
}
