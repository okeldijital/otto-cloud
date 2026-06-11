"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, FileText, Upload, Edit3, Plus, Trash2, Download,
  AlertCircle, Music, Users, DollarSign, PieChart, Link2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const STATUS_VARIANTS: Record<string, string> = {
  Draft: "neutral",
  Active: "success",
  Expired: "warn",
  Terminated: "critical",
};

const HEALTH_VARIANTS: Record<string, string> = {
  GREEN: "success",
  AMBER: "warn",
  RED: "critical",
};

const ROLE_OPTIONS = ["Artist", "Label", "Publisher", "Licensee", "Licensor", "Producer", "Other"];
const ASSET_TYPES = ["Track", "Work", "Release"];
const SCOPE_TYPES = ["INCLUSION", "EXCLUSION"];
const TABS = [
  { key: "documents", label: "Documents", icon: FileText },
  { key: "overview", label: "Overview", icon: Edit3 },
  { key: "parties", label: "Parties", icon: Users },
  { key: "assets", label: "Assets", icon: Music },
  { key: "financials", label: "Financials", icon: DollarSign },
  { key: "splits", label: "Splits", icon: PieChart },
  { key: "tracks", label: "Tracks", icon: Link2 },
];

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  // Modals
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaForm, setMetaForm] = useState<any>({});
  const [financialModalOpen, setFinancialModalOpen] = useState(false);
  const [financialForm, setFinancialForm] = useState<any>({});
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState<any>({
    party_mode: "system",
    entity_type: "artist",
    role: "",
    entity: null,
    external_name: "",
    split_percent: "",
    notes: "",
  });
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetForm, setAssetForm] = useState<any>({
    asset_type: "Track",
    scope_type: "INCLUSION",
    query: "",
    results: [],
    selected: [],
    notes: "",
  });
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  // Track modal
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");
  const [trackResults, setTrackResults] = useState<any[]>([]);

  // Split modal
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitForm, setSplitForm] = useState<any>({
    group_name: "Primary Splits",
    group_type: "Mechanical",
    notes: "",
  });
  const [splitItemModalOpen, setSplitItemModalOpen] = useState(false);
  const [splitItemForm, setSplitItemForm] = useState<any>({
    group_id: null,
    party_id: null,
    external_party_name: "",
    percent: "",
    notes: "",
  });

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
        status_quo_override: data.status_quo_override || "",
        notes: data.notes || "",
      });
      setFinancialForm({
        royalty_description: data.royalty_description || "",
        advances_amount: data.advances_amount || "",
        advances_currency: data.advances_currency || "USD",
        recoupment_notes: data.recoupment_notes || "",
      });
      const docs = data.contract_documents || [];
      if (docs.length > 0) {
        const sorted = [...docs].sort((a: any, b: any) => (b.version || 0) - (a.version || 0));
        setSelectedDoc(sorted[0]);
      }
      setError("");
    } catch (err: any) {
      console.error(err);
      setError("Unable to load contract.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchContract(); }, [fetchContract]);

  const documentsWithVersions = useMemo(() => {
    if (!contract?.contract_documents) return [];
    return [...contract.contract_documents].sort((a: any, b: any) => (b.version || 0) - (a.version || 0));
  }, [contract]);

  const latestDoc = useMemo(() => documentsWithVersions[0] || null, [documentsWithVersions]);

  const saveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    for (const [key, val] of Object.entries(metaForm)) {
      if (val === "" || val === null || typeof val === "undefined") continue;
      payload[key] = val;
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
      alert(err?.response?.data?.error || "Failed to save metadata");
    }
  };

  const saveFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...financialForm };
    if (payload.advances_amount === "" || payload.advances_amount === null) delete payload.advances_amount;
    if (payload.advances_amount) payload.advances_amount = Number(payload.advances_amount);
    if (payload.advances_currency === "") delete payload.advances_currency;
    if (payload.royalty_description === "") delete payload.royalty_description;
    if (payload.recoupment_notes === "") delete payload.recoupment_notes;
    try {
      const res = await api.put(`/contracts?id=${id}`, payload);
      setContract((prev: any) => ({ ...prev, ...res.data }));
      setFinancialModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to save financials");
    }
  };

  const addParty = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    if (partyForm.party_mode === "system") {
      payload.entity_type = (partyForm.entity?.entity_type || partyForm.entity_type || "artist")
        .toString()
        .replace(/^./, (m: string) => m.toUpperCase());
      payload.entity_id = partyForm.entity?.id;
    } else {
      payload.entity_type = "External";
      payload.external_name = partyForm.external_name;
    }
    payload.role = partyForm.role;
    payload.split_percent = Number(partyForm.split_percent) || null;
    payload.notes = partyForm.notes || null;

    try {
      await api.post("/contracts?action=add_party", { id: parseInt(id), ...payload });
      await fetchContract();
      setPartyModalOpen(false);
      setPartyForm({
        party_mode: "system", entity_type: "artist", role: "", entity: null,
        external_name: "", split_percent: "", notes: "",
      });
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
      alert("Failed to remove party");
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
          scope_type: assetForm.scope_type,
          notes: assetForm.notes || "",
        });
      }
      await fetchContract();
      setAssetModalOpen(false);
      setAssetForm({ asset_type: "Track", scope_type: "INCLUSION", query: "", results: [], selected: [], notes: "" });
    } catch (err: any) {
      alert("Failed to add assets");
    }
  };

  const removeAsset = async (assetId: number) => {
    if (!window.confirm("Remove this asset?")) return;
    try {
      await api.delete(`/contracts?id=${id}&assetId=${assetId}`);
      await fetchContract();
    } catch (err: any) {
      alert("Failed to remove asset");
    }
  };

  const uploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Choose a PDF first.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      await api.post(`/contracts?action=upload_document&id=${id}`, fd);
      await fetchContract();
      setSelectedFile(null);
      setDocModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const searchTracks = async (q: string) => {
    if (!q || q.length < 2) { setTrackResults([]); return; }
    try {
      const res = await api.get(`/tracks?q=${encodeURIComponent(q)}&limit=10`);
      setTrackResults(Array.isArray(res.data) ? res.data : []);
    } catch { setTrackResults([]); }
  };

  const linkTrack = async (trackId: number) => {
    try {
      await api.post("/contracts?action=link_track", { id: parseInt(id), track_id: trackId });
      await fetchContract();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to link track");
    }
  };

  const unlinkTrack = async (trackId: number) => {
    if (!window.confirm("Unlink this track?")) return;
    try {
      await api.delete(`/contracts?id=${id}&trackId=${trackId}`);
      await fetchContract();
    } catch (err: any) {
      alert("Failed to unlink track");
    }
  };

  const addSplitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/contracts?action=add_split_group", {
        id: parseInt(id),
        ...splitForm,
      });
      await fetchContract();
      setSplitModalOpen(false);
      setSplitForm({ group_name: "Primary Splits", group_type: "Mechanical", notes: "" });
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create split group");
    }
  };

  const removeSplitGroup = async (groupId: number) => {
    if (!window.confirm("Remove this split group?")) return;
    try {
      await api.delete(`/contracts?id=${id}&splitGroupId=${groupId}`);
      await fetchContract();
    } catch { alert("Failed to remove split group"); }
  };

  const addSplitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/contracts?action=add_split", {
        id: parseInt(id),
        group_id: splitItemForm.group_id,
        party_id: splitItemForm.party_id || null,
        external_party_name: splitItemForm.external_party_name || null,
        percent: Number(splitItemForm.percent) || 0,
        notes: splitItemForm.notes || "",
      });
      await fetchContract();
      setSplitItemModalOpen(false);
      setSplitItemForm({ group_id: null, party_id: null, external_party_name: "", percent: "", notes: "" });
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to add split item");
    }
  };

  const removeSplitItem = async (groupId: number, splitId: number) => {
    if (!window.confirm("Remove this split item?")) return;
    try {
      await api.delete(`/contracts?id=${id}&splitGroupId=${groupId}&splitId=${splitId}`);
      await fetchContract();
    } catch { alert("Failed to remove split item"); }
  };

  const searchAssets = async (q: string, type: string) => {
    if (!q || q.length < 2) { setAssetForm((prev: any) => ({ ...prev, results: [] })); return; }
    try {
      let endpoint = "";
      if (type === "Track") endpoint = `/tracks?q=${encodeURIComponent(q)}&limit=10`;
      else if (type === "Work") endpoint = `/works?q=${encodeURIComponent(q)}&limit=10`;
      else if (type === "Release") endpoint = `/releases?q=${encodeURIComponent(q)}&limit=10`;
      const res = await api.get(endpoint);
      const items = Array.isArray(res.data) ? res.data : [];
      setAssetForm((prev: any) => ({ ...prev, results: items }));
    } catch { setAssetForm((prev: any) => ({ ...prev, results: [] })); }
  };

  const downloadDoc = (doc: any) => {
    if (!doc) return;
    window.open(doc.file_path, "_blank");
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      setSelectedFile(e.dataTransfer.files[0]);
      setDocModalOpen(true);
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading contract…</div>;
  if (error || !contract) return <div className="p-12 text-center text-danger">{error || "Contract not found"}</div>;

  const completeness = contract.completeness || { score: 0, status: "RED" };

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
              {completeness.status && (
                <Badge variant={HEALTH_VARIANTS[completeness.status] || "neutral"} size="sm">
                  Health: {completeness.status}
                  {contract.status_quo_override && " (Override)"}
                </Badge>
              )}
              <Badge variant={STATUS_VARIANTS[contract.status] || "neutral"} size="sm">
                {contract.status}
              </Badge>
              <Button variant="secondary" size="sm" onClick={() => setDocModalOpen(true)}>
                <Upload size={14} /> Upload
              </Button>
              <Button variant="secondary" size="sm" onClick={() => downloadDoc(selectedDoc || latestDoc)}>
                <Download size={14} /> PDF
              </Button>
              <Button variant="danger" size="sm" onClick={deleteContract}>
                <Trash2 size={14} />
              </Button>
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
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                dragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => setDocModalOpen(true)}
            >
              <Upload size={24} className="mx-auto mb-3 text-text-secondary" />
              <p className="font-medium">Drag & drop signed PDF</p>
              <p className="text-sm text-text-secondary mt-1">Or click to browse files</p>
            </div>
            <div className="space-y-2">
              {documentsWithVersions.length === 0 && (
                <p className="text-center text-text-secondary py-4">No documents uploaded yet.</p>
              )}
              {documentsWithVersions.map((doc: any) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedDoc?.id === doc.id ? "bg-primary/10 border border-primary/30" : "bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-text-secondary" />
                    <div>
                      <div className="font-medium text-sm">v{doc.version || "?"} • {doc.file_name}</div>
                      <div className="text-xs text-text-secondary">
                        {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>
                  <button
                    className="ghost-btn p-2 hover:bg-white/10 rounded-lg"
                    onClick={(e) => { e.stopPropagation(); downloadDoc(doc); }}
                  >
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl overflow-hidden" style={{ minHeight: 400 }}>
            {!selectedDoc ? (
              <div className="flex items-center justify-center h-full text-text-secondary p-8">
                Select a document to preview.
              </div>
            ) : (
              <object
                data={selectedDoc.file_path}
                type="application/pdf"
                width="100%"
                height="100%"
                style={{ minHeight: 400 }}
              >
                <div className="flex items-center justify-center h-full text-text-secondary p-8">
                  PDF preview unavailable.{" "}
                  <button className="link-btn ml-1" onClick={() => downloadDoc(selectedDoc)}>Download instead</button>
                </div>
              </object>
            )}
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Key Terms">
            <div className="space-y-4">
              {[
                { label: "Type", value: contract.type },
                { label: "Status", value: contract.status },
                { label: "Effective", value: contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "—" },
                { label: "End", value: contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "—" },
                { label: "Signed", value: contract.signed_date ? new Date(contract.signed_date).toLocaleDateString() : "—" },
                { label: "Territory", value: contract.territory },
                { label: "Exclusivity", value: contract.exclusivity ? "Yes" : "No" },
                { label: "Completeness Score", value: `${completeness.score}%` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">{item.label}</span>
                  <span className="font-medium text-white">{String(item.value) || "—"}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Notes" headerAction={
            <Button variant="ghost" size="sm" onClick={() => setMetaModalOpen(true)}>
              <Edit3 size={14} /> Edit
            </Button>
          }>
            <p className="text-sm">{contract.notes || "No notes captured yet."}</p>
          </Card>
        </div>
      )}

      {activeTab === "parties" && (
        <Card
          title="Parties"
          headerAction={
            <Button variant="orange" size="sm" onClick={() => setPartyModalOpen(true)}>
              <Plus size={14} /> Add Party
            </Button>
          }
        >
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
              {(contract.contract_parties || []).map((p: any) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="p-3 text-sm">{p.role}</td>
                  <td className="p-3 text-sm">{p.external_name || `${p.entity_type || ""} #${p.entity_id || ""}`}</td>
                  <td className="p-3 text-sm">{p.split_percent ?? "—"}</td>
                  <td className="p-3 text-sm text-text-secondary">{p.notes || "—"}</td>
                  <td className="p-3">
                    <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => removeParty(p.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!contract.contract_parties || contract.contract_parties.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-text-secondary">No parties yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "assets" && (
        <Card
          title="Assets"
          headerAction={
            <Button variant="orange" size="sm" onClick={() => setAssetModalOpen(true)}>
              <Plus size={14} /> Link Assets
            </Button>
          }
        >
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
              {(contract.contract_assets || []).map((a: any) => (
                <tr key={a.id} className="border-b border-white/5">
                  <td className="p-3 text-sm">{a.asset_type}</td>
                  <td className="p-3 text-sm font-mono">ID {a.asset_id}</td>
                  <td className="p-3"><Badge variant="neutral" size="sm">{a.scope_type}</Badge></td>
                  <td className="p-3 text-sm text-text-secondary">{a.notes || "—"}</td>
                  <td className="p-3">
                    <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => removeAsset(a.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!contract.contract_assets || contract.contract_assets.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-text-secondary">No assets linked.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "financials" && (
        <Card title="Financials" headerAction={
          <Button variant="ghost" size="sm" onClick={() => setFinancialModalOpen(true)}>
            <Edit3 size={14} /> Edit
          </Button>
        }>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-2">Royalty Description</h4>
              <p className="text-sm">{contract.royalty_description || "—"}</p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-2">Advances</h4>
              <p className="text-sm">
                {contract.advances_amount
                  ? `${contract.advances_currency || "USD"} ${Number(contract.advances_amount).toLocaleString()}`
                  : "—"}
              </p>
            </div>
            <div className="col-span-2">
              <h4 className="text-xs uppercase tracking-wider text-text-secondary font-bold mb-2">Recoupment Notes</h4>
              <p className="text-sm">{contract.recoupment_notes || "—"}</p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "splits" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="orange" size="sm" onClick={() => setSplitModalOpen(true)}>
              <Plus size={14} /> Add Split Group
            </Button>
          </div>
          {(contract.contract_split_groups || []).length === 0 ? (
            <Card><p className="text-center text-text-secondary py-4">No split groups defined.</p></Card>
          ) : (
            (contract.contract_split_groups || []).map((group: any) => (
              <Card
                key={group.id}
                title={group.group_name}
                subtitle={`${group.group_type || ""} • ${(group.contract_splits || []).length} splits`}
                headerAction={
                  <div className="flex gap-2">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => {
                        setSplitItemForm((prev: any) => ({ ...prev, group_id: group.id }));
                        setSplitItemModalOpen(true);
                      }}
                    >
                      <Plus size={14} /> Add Split
                    </Button>
                    <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => removeSplitGroup(group.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                }
              >
                <table className="w-full" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                      <th className="p-3 font-bold">Party</th>
                      <th className="p-3 font-bold">Percent</th>
                      <th className="p-3 font-bold">Notes</th>
                      <th className="p-3 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.contract_splits || []).map((s: any) => (
                      <tr key={s.id} className="border-b border-white/5">
                        <td className="p-3 text-sm">{s.external_party_name || `Party #${s.party_id}`}</td>
                        <td className="p-3 text-sm font-mono">{Number(s.percent).toFixed(1)}%</td>
                        <td className="p-3 text-sm text-text-secondary">{s.notes || "—"}</td>
                        <td className="p-3">
                          <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => removeSplitItem(group.id, s.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "tracks" && (
        <Card
          title="Linked Tracks"
          headerAction={
            <Button variant="orange" size="sm" onClick={() => setTrackModalOpen(true)}>
              <Plus size={14} /> Link Track
            </Button>
          }
        >
          {(contract.contract_track_links || []).length === 0 ? (
            <p className="text-center text-text-secondary py-4">No tracks linked to this contract.</p>
          ) : (
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-3 font-bold">Track</th>
                  <th className="p-3 font-bold">ISRC</th>
                  <th className="p-3 font-bold">Duration</th>
                  <th className="p-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {(contract.contract_track_links || []).map((link: any) => (
                  <tr key={link.id} className="border-b border-white/5">
                    <td className="p-3 text-sm font-medium">{link.tracks?.title || `Track #${link.track_id}`}</td>
                    <td className="p-3 text-sm font-mono text-text-secondary">{link.tracks?.isrc_code || "—"}</td>
                    <td className="p-3 text-sm text-text-secondary">{link.tracks?.duration || "—"}</td>
                    <td className="p-3">
                      <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => unlinkTrack(link.track_id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Metadata Modal */}
      <EntityForm title="Edit Contract Metadata" isOpen={metaModalOpen} onClose={() => setMetaModalOpen(false)} onSubmit={saveMetadata} isSubmitting={false} error={undefined}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-text-secondary">Title</label>
            <input className="input w-full" value={metaForm.title} onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Contract Number</label>
            <input className="input w-full" value={metaForm.contract_number} onChange={(e) => setMetaForm({ ...metaForm, contract_number: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Status</label>
            <select className="input w-full" value={metaForm.status} onChange={(e) => setMetaForm({ ...metaForm, status: e.target.value })}>
              <option>Draft</option>
              <option>Active</option>
              <option>Expired</option>
              <option>Terminated</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Type</label>
            <input className="input w-full" value={metaForm.type} onChange={(e) => setMetaForm({ ...metaForm, type: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Health Override</label>
            <select className="input w-full" value={metaForm.status_quo_override || ""} onChange={(e) => setMetaForm({ ...metaForm, status_quo_override: e.target.value || null })}>
              <option value="">(Auto-Calculated)</option>
              <option value="GREEN">Green</option>
              <option value="AMBER">Amber</option>
              <option value="RED">Red</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Territory</label>
            <input className="input w-full" value={metaForm.territory} onChange={(e) => setMetaForm({ ...metaForm, territory: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Exclusivity</label>
            <select className="input w-full" value={String(metaForm.exclusivity)} onChange={(e) => setMetaForm({ ...metaForm, exclusivity: e.target.value === "true" })}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Effective Date</label>
            <input type="date" className="input w-full" value={metaForm.start_date || ""} onChange={(e) => setMetaForm({ ...metaForm, start_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">End Date</label>
            <input type="date" className="input w-full" value={metaForm.end_date || ""} onChange={(e) => setMetaForm({ ...metaForm, end_date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Signed Date</label>
            <input type="date" className="input w-full" value={metaForm.signed_date || ""} onChange={(e) => setMetaForm({ ...metaForm, signed_date: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-text-secondary">Notes</label>
            <textarea className="input w-full" rows={3} value={metaForm.notes} onChange={(e) => setMetaForm({ ...metaForm, notes: e.target.value })} />
          </div>
        </div>
      </EntityForm>

      {/* Financials Modal */}
      <EntityForm title="Edit Financials" isOpen={financialModalOpen} onClose={() => setFinancialModalOpen(false)} onSubmit={saveFinancials} isSubmitting={false} error={undefined}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-text-secondary">Royalty Description</label>
            <textarea className="input w-full" rows={3} value={financialForm.royalty_description} onChange={(e) => setFinancialForm({ ...financialForm, royalty_description: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Advances Amount</label>
            <input type="number" className="input w-full" value={financialForm.advances_amount} onChange={(e) => setFinancialForm({ ...financialForm, advances_amount: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Currency</label>
            <input className="input w-full" value={financialForm.advances_currency} onChange={(e) => setFinancialForm({ ...financialForm, advances_currency: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-text-secondary">Recoupment Notes</label>
            <textarea className="input w-full" rows={3} value={financialForm.recoupment_notes} onChange={(e) => setFinancialForm({ ...financialForm, recoupment_notes: e.target.value })} />
          </div>
        </div>
      </EntityForm>

      {/* Party Modal */}
      <EntityForm title="Add Party" isOpen={partyModalOpen} onClose={() => setPartyModalOpen(false)} onSubmit={addParty} isSubmitting={false} error={undefined}>
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" checked={partyForm.party_mode === "system"} onChange={() => setPartyForm({ ...partyForm, party_mode: "system" })} />
              System entity
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={partyForm.party_mode === "external"} onChange={() => setPartyForm({ ...partyForm, party_mode: "external" })} />
              External
            </label>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Role</label>
            <select className="input w-full" value={partyForm.role} required onChange={(e) => setPartyForm({ ...partyForm, role: e.target.value })}>
              <option value="">Select role</option>
              {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          {partyForm.party_mode === "system" ? (
            <>
              <div>
                <label className="text-xs text-text-secondary">Entity Type</label>
                <select className="input w-full" value={partyForm.entity_type} onChange={(e) => setPartyForm({ ...partyForm, entity_type: e.target.value, entity: null })}>
                  <option value="artist">Artist</option>
                  <option value="label">Label</option>
                  <option value="publisher">Publisher</option>
                  <option value="pro">PRO</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary">Entity Lookup</label>
                <input className="input w-full" placeholder="Search by name..." value={partyForm.entity ? partyForm.entity.name : ""}
                  onChange={async (e) => {
                    const q = e.target.value;
                    if (q.length < 2) { setPartyForm((prev: any) => ({ ...prev, entity: null, entity_id: null })); return; }
                    try {
                      const res = await api.get(`/contracts?action=party_lookup&q=${encodeURIComponent(q)}&limit=5`);
                      const data = res.data;
                      const all = [...(data.artists || []), ...(data.labels || []), ...(data.publishers || []), ...(data.pros || [])];
                      // Show simple dropdown in a datalist-like way using a select
                    } catch {}
                  }}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs text-text-secondary">External Name</label>
              <input className="input w-full" value={partyForm.external_name} required onChange={(e) => setPartyForm({ ...partyForm, external_name: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary">Split % (optional)</label>
              <input type="number" className="input w-full" value={partyForm.split_percent} onChange={(e) => setPartyForm({ ...partyForm, split_percent: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Notes</label>
              <input className="input w-full" value={partyForm.notes} onChange={(e) => setPartyForm({ ...partyForm, notes: e.target.value })} />
            </div>
          </div>
        </div>
      </EntityForm>

      {/* Asset Modal */}
      <EntityForm title="Link Assets" isOpen={assetModalOpen} onClose={() => setAssetModalOpen(false)} onSubmit={addAssets} isSubmitting={false} error={undefined}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary">Asset Type</label>
              <select className="input w-full" value={assetForm.asset_type}
                onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value, query: "", results: [], selected: [] })}
              >
                {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary">Scope</label>
              <select className="input w-full" value={assetForm.scope_type} onChange={(e) => setAssetForm({ ...assetForm, scope_type: e.target.value })}>
                {SCOPE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Search {assetForm.asset_type}s</label>
            <input className="input w-full" placeholder={`Search by title or code...`} value={assetForm.query}
              onChange={(e) => {
                const q = e.target.value;
                setAssetForm((prev: any) => ({ ...prev, query: q }));
                searchAssets(q, assetForm.asset_type);
              }}
            />
          </div>
          {assetForm.results.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {assetForm.results.map((item: any) => {
                const isSelected = assetForm.selected.some((s: any) => s.id === item.id);
                return (
                  <div key={item.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-white/5"}`}
                    onClick={() => {
                      setAssetForm((prev: any) => ({
                        ...prev,
                        selected: isSelected ? prev.selected.filter((s: any) => s.id !== item.id) : [...prev.selected, item],
                      }));
                    }}
                  >
                    <span className="text-sm">{item.title || item.name}</span>
                    <span className="text-xs text-text-secondary">{item.isrc_code || item.upc_code || `ID ${item.id}`}</span>
                  </div>
                );
              })}
            </div>
          )}
          {assetForm.selected.length > 0 && (
            <div>
              <label className="text-xs text-text-secondary">Selected ({assetForm.selected.length})</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {assetForm.selected.map((s: any) => (
                  <Badge key={s.id} variant="primary" size="sm">{s.title || s.name}</Badge>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-text-secondary">Notes</label>
            <input className="input w-full" value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
          </div>
        </div>
      </EntityForm>

      {/* Document Upload Modal */}
      <EntityForm title="Upload Contract PDF" isOpen={docModalOpen} onClose={() => { setDocModalOpen(false); setSelectedFile(null); }} onSubmit={uploadDocument} isSubmitting={uploading} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary">Choose File (PDF)</label>
            <input type="file" accept="application/pdf" className="w-full mt-1" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} required />
          </div>
          <p className="text-xs text-text-secondary">PDF is the source of truth. Each upload becomes a new version.</p>
        </div>
      </EntityForm>

      {/* Track Link Modal */}
      <EntityForm title="Link Track" isOpen={trackModalOpen} onClose={() => { setTrackModalOpen(false); setTrackSearch(""); setTrackResults([]); }} isSubmitting={false} error={undefined}
        onSubmit={async (e: React.FormEvent) => {
          e.preventDefault();
          if (trackResults.length > 0) {
            await linkTrack(trackResults[0].id);
            setTrackModalOpen(false);
          }
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary">Search Tracks</label>
            <input className="input w-full" placeholder="Search by title or ISRC..." value={trackSearch}
              onChange={(e) => {
                const q = e.target.value;
                setTrackSearch(q);
                searchTracks(q);
              }}
            />
          </div>
          {trackResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {trackResults.map((t: any) => (
                <div key={t.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => { linkTrack(t.id); setTrackModalOpen(false); setTrackSearch(""); setTrackResults([]); }}
                >
                  <span className="text-sm font-medium">{t.title}</span>
                  <span className="text-xs text-text-secondary font-mono">{t.isrc_code || `ID ${t.id}`}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-text-secondary">Click a track to link it to this contract.</p>
        </div>
      </EntityForm>

      {/* Split Group Modal */}
      <EntityForm title="Add Split Group" isOpen={splitModalOpen} onClose={() => setSplitModalOpen(false)} onSubmit={addSplitGroup} isSubmitting={false} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary">Group Name</label>
            <input className="input w-full" value={splitForm.group_name} onChange={(e) => setSplitForm({ ...splitForm, group_name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Group Type</label>
            <input className="input w-full" value={splitForm.group_type} onChange={(e) => setSplitForm({ ...splitForm, group_type: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Notes</label>
            <input className="input w-full" value={splitForm.notes} onChange={(e) => setSplitForm({ ...splitForm, notes: e.target.value })} />
          </div>
        </div>
      </EntityForm>

      {/* Split Item Modal */}
      <EntityForm title="Add Split Item" isOpen={splitItemModalOpen} onClose={() => setSplitItemModalOpen(false)} onSubmit={addSplitItem} isSubmitting={false} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary">External Party Name</label>
            <input className="input w-full" value={splitItemForm.external_party_name} onChange={(e) => setSplitItemForm({ ...splitItemForm, external_party_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Percent</label>
            <input type="number" step="0.1" className="input w-full" value={splitItemForm.percent} onChange={(e) => setSplitItemForm({ ...splitItemForm, percent: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Notes</label>
            <input className="input w-full" value={splitItemForm.notes} onChange={(e) => setSplitItemForm({ ...splitItemForm, notes: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
