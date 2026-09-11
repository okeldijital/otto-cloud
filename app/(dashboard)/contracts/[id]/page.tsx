"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, FileText, Edit3, Plus, Trash2, Users, Music } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import ContractDocumentsSection from "@/components/contracts/ContractDocumentsSection";
import api from "@/lib/api";

const STATUS_VARIANTS: Record<string, string> = {
  Draft: "neutral",
  Active: "success",
  Expired: "warn",
  Terminated: "critical",
};

const ASSET_TYPES = ["Track", "Work", "Release"];

const TABS = [
  { key: "documents", label: "Documents", icon: FileText },
  { key: "overview", label: "Overview", icon: Edit3 },
  { key: "parties", label: "Parties", icon: Users },
  { key: "assets", label: "Linked Assets", icon: Music },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as TabKey | null;
  const initialTab: TabKey = TABS.some((tab) => tab.key === requestedTab)
    ? (requestedTab as TabKey)
    : "overview";

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaForm, setMetaForm] = useState<any>({});
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ role: "", external_name: "", split_percent: "", notes: "" });
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetForm, setAssetForm] = useState<any>({ asset_type: "Track", query: "", results: [], selected: [], notes: "" });

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contracts?id=${id}`);
      const data = res.data;
      setContract(data);
      setMetaForm({
        title: data.title || "",
        contract_number: data.contract_number || "",
        type: data.type || "",
        territory: data.territory || "",
        exclusivity: data.exclusivity ?? false,
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        signed_date: data.signed_date || "",
        status: data.status || "Draft",
        notes: data.notes || "",
        royalty_description: data.royalty_description || "",
        advances_amount: data.advances_amount || "",
        advances_currency: data.advances_currency || "USD",
        recoupment_notes: data.recoupment_notes || "",
      });
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load contract.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchContract(); }, [fetchContract]);

  const saveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    for (const [key, value] of Object.entries(metaForm)) {
      if (value === "" || value === null || typeof value === "undefined") continue;
      payload[key] = value;
    }
    if (payload.status === "Active" && (!contract.contract_documents || contract.contract_documents.length === 0)) {
      alert("Attach at least one PDF before marking Active.");
      return;
    }
    try {
      const res = await api.put(`/contracts?id=${id}`, payload);
      setContract((prev: any) => ({ ...prev, ...res.data }));
      setMetaModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to save contract details");
    }
  };

  const addParty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/contracts?action=add_party", {
        id: parseInt(id),
        entity_type: "External",
        external_name: partyForm.external_name,
        role: partyForm.role,
        split_percent: partyForm.split_percent === "" ? null : Number(partyForm.split_percent),
        notes: partyForm.notes || null,
      });
      await fetchContract();
      setPartyModalOpen(false);
      setPartyForm({ role: "", external_name: "", split_percent: "", notes: "" });
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to add party");
    }
  };

  const removeParty = async (partyId: number) => {
    if (!window.confirm("Remove this party?")) return;
    try {
      await api.delete(`/contracts?id=${id}&partyId=${partyId}`);
      await fetchContract();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to remove party");
    }
  };

  const searchAssets = async (query: string, type: string) => {
    if (query.trim().length < 2) {
      setAssetForm((prev: any) => ({ ...prev, results: [] }));
      return;
    }
    try {
      const endpoint = type === "Track"
        ? `/tracks?q=${encodeURIComponent(query)}&limit=10`
        : type === "Work"
          ? `/works?q=${encodeURIComponent(query)}&limit=10`
          : `/releases?q=${encodeURIComponent(query)}&limit=10`;
      const res = await api.get(endpoint);
      setAssetForm((prev: any) => ({ ...prev, results: Array.isArray(res.data) ? res.data : [] }));
    } catch {
      setAssetForm((prev: any) => ({ ...prev, results: [] }));
    }
  };

  const addAssets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.selected.length) {
      alert("Select at least one asset.");
      return;
    }
    try {
      for (const asset of assetForm.selected) {
        await api.post("/contracts?action=add_asset", {
          id: parseInt(id),
          asset_type: assetForm.asset_type,
          asset_id: asset.id,
          scope_type: "INCLUSION",
          notes: assetForm.notes || "",
        });
      }
      await fetchContract();
      setAssetModalOpen(false);
      setAssetForm({ asset_type: "Track", query: "", results: [], selected: [], notes: "" });
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to link assets");
    }
  };

  const removeAsset = async (assetId: number) => {
    if (!window.confirm("Remove this linked asset?")) return;
    try {
      await api.delete(`/contracts?id=${id}&assetId=${assetId}`);
      await fetchContract();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to remove asset");
    }
  };

  const deleteContract = async () => {
    if (!window.confirm("Are you sure you want to delete this contract? This action cannot be undone.")) return;
    try {
      await api.delete(`/contracts?id=${id}`);
      router.push("/contracts");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete contract");
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading contract…</div>;
  if (error || !contract) return <div className="p-12 text-center text-danger">{error || "Contract not found"}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/contracts")} className="text-text-secondary hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          title={contract.title || "Contract"}
          subtitle={<span className="font-mono">{contract.contract_number}</span>}
          actions={
            <div className="flex gap-2 items-center">
              <Badge variant={STATUS_VARIANTS[contract.status] || "neutral"} size="sm">{contract.status || "Draft"}</Badge>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab("documents")}>
                <FileText size={14} /> Documents
              </Button>
              <Button variant="danger" size="sm" onClick={deleteContract}><Trash2 size={14} /></Button>
            </div>
          }
        />
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "bg-primary text-white" : "text-text-secondary hover:text-white"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "documents" && <ContractDocumentsSection contractId={id} />}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Contract Details" headerAction={<Button variant="ghost" size="sm" onClick={() => setMetaModalOpen(true)}><Edit3 size={14} /> Edit</Button>}>
            <div className="space-y-4">
              {[
                ["Type", contract.type],
                ["Status", contract.status],
                ["Effective", contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "—"],
                ["End", contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "—"],
                ["Signed", contract.signed_date ? new Date(contract.signed_date).toLocaleDateString() : "—"],
                ["Territory", contract.territory],
                ["Exclusivity", contract.exclusivity ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-6">
                  <span className="text-text-secondary text-sm">{label}</span>
                  <span className="font-medium text-white text-right">{String(value || "—")}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Financial Terms">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-1">Royalty Description</div>
                <p className="text-sm">{contract.royalty_description || "—"}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-1">Advance</div>
                <p className="text-sm">{contract.advances_amount ? `${contract.advances_currency || "USD"} ${Number(contract.advances_amount).toLocaleString()}` : "—"}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-1">Recoupment Notes</div>
                <p className="text-sm">{contract.recoupment_notes || "—"}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-1">Notes</div>
                <p className="text-sm">{contract.notes || "—"}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "parties" && (
        <Card title="Parties" headerAction={<Button variant="secondary" size="sm" onClick={() => setPartyModalOpen(true)}><Plus size={14} /> Add Party</Button>}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                <th className="p-3 font-bold">Role</th>
                <th className="p-3 font-bold">Party</th>
                <th className="p-3 font-bold">Split %</th>
                <th className="p-3 font-bold">Notes</th>
                <th className="p-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {(contract.contract_parties || []).map((party: any) => (
                <tr key={party.id} className="border-b border-white/5">
                  <td className="p-3 text-sm">{party.role || "—"}</td>
                  <td className="p-3 text-sm">{party.external_name || `${party.entity_type || "Entity"} #${party.entity_id || "—"}`}</td>
                  <td className="p-3 text-sm">{party.split_percent ?? "—"}</td>
                  <td className="p-3 text-sm text-text-secondary">{party.notes || "—"}</td>
                  <td className="p-3 text-right"><button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => removeParty(party.id)}><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {(!contract.contract_parties || contract.contract_parties.length === 0) && <tr><td colSpan={5} className="p-8 text-center text-text-secondary">No parties captured yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "assets" && (
        <Card title="Linked Assets" headerAction={<Button variant="secondary" size="sm" onClick={() => setAssetModalOpen(true)}><Plus size={14} /> Link Asset</Button>}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                <th className="p-3 font-bold">Asset Type</th>
                <th className="p-3 font-bold">Asset ID</th>
                <th className="p-3 font-bold">Scope</th>
                <th className="p-3 font-bold">Notes</th>
                <th className="p-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {(contract.contract_assets || []).map((asset: any) => (
                <tr key={asset.id} className="border-b border-white/5">
                  <td className="p-3 text-sm">{asset.asset_type}</td>
                  <td className="p-3 text-sm font-mono">ID {asset.asset_id}</td>
                  <td className="p-3"><Badge variant="neutral" size="sm">{asset.scope_type}</Badge></td>
                  <td className="p-3 text-sm text-text-secondary">{asset.notes || "—"}</td>
                  <td className="p-3 text-right"><button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => removeAsset(asset.id)}><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {(!contract.contract_assets || contract.contract_assets.length === 0) && <tr><td colSpan={5} className="p-8 text-center text-text-secondary">No linked assets yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      <EntityForm title="Edit Contract Details" isOpen={metaModalOpen} onClose={() => setMetaModalOpen(false)} onSubmit={saveMetadata} isSubmitting={false} error={undefined}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs text-text-secondary">Title</label><input className="input w-full" value={metaForm.title || ""} onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })} required /></div>
          <div><label className="text-xs text-text-secondary">Contract Number</label><input className="input w-full" value={metaForm.contract_number || ""} onChange={(e) => setMetaForm({ ...metaForm, contract_number: e.target.value })} required /></div>
          <div><label className="text-xs text-text-secondary">Status</label><select className="input w-full" value={metaForm.status || "Draft"} onChange={(e) => setMetaForm({ ...metaForm, status: e.target.value })}><option>Draft</option><option>Active</option><option>Expired</option><option>Terminated</option></select></div>
          <div><label className="text-xs text-text-secondary">Type</label><input className="input w-full" value={metaForm.type || ""} onChange={(e) => setMetaForm({ ...metaForm, type: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Territory</label><input className="input w-full" value={metaForm.territory || ""} onChange={(e) => setMetaForm({ ...metaForm, territory: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Exclusivity</label><select className="input w-full" value={String(Boolean(metaForm.exclusivity))} onChange={(e) => setMetaForm({ ...metaForm, exclusivity: e.target.value === "true" })}><option value="true">Yes</option><option value="false">No</option></select></div>
          <div><label className="text-xs text-text-secondary">Effective Date</label><input type="date" className="input w-full" value={metaForm.start_date || ""} onChange={(e) => setMetaForm({ ...metaForm, start_date: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">End Date</label><input type="date" className="input w-full" value={metaForm.end_date || ""} onChange={(e) => setMetaForm({ ...metaForm, end_date: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Signed Date</label><input type="date" className="input w-full" value={metaForm.signed_date || ""} onChange={(e) => setMetaForm({ ...metaForm, signed_date: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Advance Amount</label><input type="number" className="input w-full" value={metaForm.advances_amount || ""} onChange={(e) => setMetaForm({ ...metaForm, advances_amount: e.target.value })} /></div>
          <div><label className="text-xs text-text-secondary">Advance Currency</label><input className="input w-full" value={metaForm.advances_currency || "USD"} onChange={(e) => setMetaForm({ ...metaForm, advances_currency: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Royalty Description</label><textarea className="input w-full" rows={3} value={metaForm.royalty_description || ""} onChange={(e) => setMetaForm({ ...metaForm, royalty_description: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Recoupment Notes</label><textarea className="input w-full" rows={3} value={metaForm.recoupment_notes || ""} onChange={(e) => setMetaForm({ ...metaForm, recoupment_notes: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-text-secondary">Notes</label><textarea className="input w-full" rows={3} value={metaForm.notes || ""} onChange={(e) => setMetaForm({ ...metaForm, notes: e.target.value })} /></div>
        </div>
      </EntityForm>

      <EntityForm title="Add Party" isOpen={partyModalOpen} onClose={() => setPartyModalOpen(false)} onSubmit={addParty} isSubmitting={false} error={undefined}>
        <div className="space-y-4">
          <div><label className="text-xs text-text-secondary">Party Name</label><input className="input w-full" value={partyForm.external_name} onChange={(e) => setPartyForm({ ...partyForm, external_name: e.target.value })} required placeholder="Enter the party name" /></div>
          <div><label className="text-xs text-text-secondary">Role</label><input className="input w-full" value={partyForm.role} onChange={(e) => setPartyForm({ ...partyForm, role: e.target.value })} required placeholder="e.g. Artist, Label, Publisher, Licensor" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-text-secondary">Split % (optional)</label><input type="number" className="input w-full" value={partyForm.split_percent} onChange={(e) => setPartyForm({ ...partyForm, split_percent: e.target.value })} /></div><div><label className="text-xs text-text-secondary">Notes</label><input className="input w-full" value={partyForm.notes} onChange={(e) => setPartyForm({ ...partyForm, notes: e.target.value })} /></div></div>
        </div>
      </EntityForm>

      <EntityForm title="Link Assets" isOpen={assetModalOpen} onClose={() => setAssetModalOpen(false)} onSubmit={addAssets} isSubmitting={false} error={undefined}>
        <div className="space-y-4">
          <div><label className="text-xs text-text-secondary">Asset Type</label><select className="input w-full" value={assetForm.asset_type} onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value, query: "", results: [], selected: [] })}>{ASSET_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
          <div><label className="text-xs text-text-secondary">Search</label><input className="input w-full" value={assetForm.query} onChange={(e) => { const query = e.target.value; setAssetForm((prev: any) => ({ ...prev, query })); void searchAssets(query, assetForm.asset_type); }} placeholder="Search by title or code" /></div>
          {assetForm.results.length > 0 && <div className="space-y-1 max-h-48 overflow-y-auto">{assetForm.results.map((item: any) => { const selected = assetForm.selected.some((entry: any) => entry.id === item.id); return <button type="button" key={item.id} className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${selected ? "bg-primary/10" : "hover:bg-white/5"}`} onClick={() => setAssetForm((prev: any) => ({ ...prev, selected: selected ? prev.selected.filter((entry: any) => entry.id !== item.id) : [...prev.selected, item] }))}><span className="text-sm">{item.title || item.name}</span><span className="text-xs text-text-secondary">{item.isrc_code || item.upc_code || `ID ${item.id}`}</span></button>; })}</div>}
          {assetForm.selected.length > 0 && <div><label className="text-xs text-text-secondary">Selected</label><div className="flex flex-wrap gap-2 mt-2">{assetForm.selected.map((item: any) => <Badge key={item.id} variant="primary" size="sm">{item.title || item.name}</Badge>)}</div></div>}
          <div><label className="text-xs text-text-secondary">Notes</label><input className="input w-full" value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} /></div>
        </div>
      </EntityForm>
    </div>
  );
}
