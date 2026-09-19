"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ExternalLink, FileText, Link2, Loader2, Plus, Trash2, Upload, UserRound, Wallet } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

type Props = { releaseId: number; artistIds: number[]; artists: any[] };
const fieldClass = "mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "text-xs font-medium text-text-secondary";
const roles = ["Main Artist", "Featured Artist", "Remixer", "Composer", "Other"];
const financialTypes = ["Income", "Expense", "Advance", "Royalty", "Other"];

export default function ReleaseCoreWorkspace({ releaseId, artistIds, artists }: Props) {
  const [data, setData] = useState<any>({ documents: [], financials: [], media: null, artistRoles: [], contract: null });
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [media, setMedia] = useState({ provider: "Dropbox", label: "", url: "" });
  const [financial, setFinancial] = useState({ entry_type: "Expense", description: "", amount: "", currency: "ZAR", entry_date: "", notes: "" });
  const [contract, setContract] = useState({ contract_id: "", signed_at: "" });
  const [documentCategory, setDocumentCategory] = useState("Other");
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentProgress, setDocumentProgress] = useState("");

  const refresh = async () => {
    const [core, contractRes] = await Promise.all([api.get(`/releases/core?id=${releaseId}`), api.get(`/contracts?limit=100`)]);
    const next = core.data || {};
    setData(next);
    if (next.media) setMedia({ provider: next.media.provider || "Other", label: next.media.label || "", url: next.media.url || "" });
    if (next.contract) setContract({ contract_id: String(next.contract.contract_id), signed_at: next.contract.signed_at ? String(next.contract.signed_at).slice(0, 10) : "" });
    const items = Array.isArray(contractRes.data) ? contractRes.data : Array.isArray(contractRes.data?.items) ? contractRes.data.items : [];
    setContracts(items);
  };

  useEffect(() => { refresh().catch((err: any) => setError(err?.response?.data?.error || "Unable to load release workspace data.")).finally(() => setLoading(false)); }, [releaseId]);

  const saveAction = async (action: string, body: any) => {
    setBusy(action); setError("");
    try { await api.post(`/releases/core?id=${releaseId}`, { action, ...body }); await refresh(); }
    catch (err: any) { setError(err?.response?.data?.error || "Unable to save release data."); }
    finally { setBusy(""); }
  };

  const remove = async (action: string, id?: number) => {
    setBusy(`${action}:${id || "all"}`); setError("");
    try { await api.delete(`/releases/core?id=${releaseId}`, { data: { action, id } }); await refresh(); }
    catch (err: any) { setError(err?.response?.data?.error || "Unable to remove release data."); }
    finally { setBusy(""); }
  };

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const description = documentDescription.trim();
    if (documentCategory === "Other" && !description) {
      setError("A short description is required for Other documents.");
      event.target.value = "";
      return;
    }

    setBusy("document");
    setError("");
    const failures: string[] = [];
    let completed = 0;

    try {
      for (const file of files) {
        setDocumentProgress(`Uploading ${completed + 1} of ${files.length}: ${file.name}`);
        try {
          const uploadRes = await api.post("/storage/upload-url", {
            entityType: "release",
            entityId: String(releaseId),
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            folder: "release",
          });
          const upload = uploadRes.data;
          const result = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });
          if (!result.ok) throw new Error(`Upload failed (${result.status})`);

          await api.post("/storage/complete", {
            entityType: "release",
            entityId: String(releaseId),
            key: upload.key,
            fileName: upload.fileName,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
          });

          await api.post(`/releases/core?id=${releaseId}`, {
            action: "document",
            storage_key: upload.key,
            file_name: upload.fileName,
            original_name: file.name,
            mime_type: file.type || "application/octet-stream",
            file_size: file.size,
            category: documentCategory,
            description: description || null,
          });
          completed += 1;
        } catch (err: any) {
          failures.push(file.name);
        }
      }

      await refresh();
      if (failures.length) {
        setError(`${completed} of ${files.length} files uploaded. Failed: ${failures.join(", ")}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Unable to upload documents.");
    } finally {
      setBusy("");
      setDocumentProgress("");
      event.target.value = "";
    }
  };

  const roleByArtist = useMemo(() => Object.fromEntries((data.artistRoles || []).map((item: any) => [item.artist_id, item.role])), [data.artistRoles]);
  const releaseArtists = artists.filter((artist) => artistIds.includes(artist.id));

  if (loading) return <div className="rounded-lg border border-border bg-surface p-6 text-sm text-text-secondary">Loading release workspace...</div>;

  return <div className="space-y-6">
    {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
    <Card title="Documents" subtitle="Attach release paperwork such as advances, proofs of payment and delivery documents.">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] items-end">
        <label><span className={labelClass}>Document type</span><select className={fieldClass} value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)}><option>Other</option><option>Advance</option><option>Proof of Payment</option><option>Delivery</option><option>Legal</option><option>Artwork</option></select></label>
        <label><span className={labelClass}>Short description {documentCategory === "Other" ? "*" : ""}</span><input className={fieldClass} value={documentDescription} onChange={(e) => setDocumentDescription(e.target.value.slice(0, 120))} placeholder={documentCategory === "Other" ? "e.g. Proton label documents" : "Optional folder description"} maxLength={120} /></label>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-primary transition hover:border-primary/50 hover:bg-surface-elevated">{busy === "document" ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}{busy === "document" ? "Uploading..." : "Attach files"}<input type="file" multiple className="hidden" onChange={uploadDocument} disabled={busy === "document"} /></label>
      </div>
      {documentProgress && <p className="mt-2 text-xs text-text-secondary">{documentProgress}</p>}
      <div className="mt-4 divide-y divide-border rounded-lg border border-border">{data.documents.length ? data.documents.map((doc: any) => <div key={doc.id} className="flex items-center justify-between gap-3 px-3 py-3"><div className="flex min-w-0 items-center gap-3"><FileText size={16} className="shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm text-text-primary">{doc.original_name}</p><p className="text-xs text-text-secondary">{doc.category}{doc.description ? ` · ${doc.description}` : ""} · {doc.mime_type || "document"}</p></div></div><Button variant="secondary" size="sm" onClick={() => remove("document", doc.id)} disabled={busy === `document:${doc.id}`}><Trash2 size={14} /></Button></div>) : <p className="px-3 py-5 text-sm text-text-secondary">No documents attached.</p>}</div>
    </Card>
    <Card title="Financial" subtitle="Release-level financial records, following the deterministic financial pattern used elsewhere in OTTO.">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6"><select className={fieldClass} value={financial.entry_type} onChange={(e) => setFinancial({ ...financial, entry_type: e.target.value })}>{financialTypes.map((item) => <option key={item}>{item}</option>)}</select><input className={fieldClass} placeholder="Description" value={financial.description} onChange={(e) => setFinancial({ ...financial, description: e.target.value })} /><input className={fieldClass} type="number" step="0.01" placeholder="Amount" value={financial.amount} onChange={(e) => setFinancial({ ...financial, amount: e.target.value })} /><input className={fieldClass} placeholder="Currency" value={financial.currency} onChange={(e) => setFinancial({ ...financial, currency: e.target.value.toUpperCase() })} /><input className={fieldClass} type="date" value={financial.entry_date} onChange={(e) => setFinancial({ ...financial, entry_date: e.target.value })} /><Button variant="primary" size="sm" onClick={() => { saveAction("financial", financial); setFinancial({ ...financial, description: "", amount: "", notes: "" }); }} disabled={busy === "financial"}><Plus size={14} />Add</Button></div>
      <div className="mt-4 divide-y divide-border rounded-lg border border-border">{data.financials.length ? data.financials.map((item: any) => <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-3"><div className="flex min-w-0 items-center gap-3"><Wallet size={16} className="shrink-0 text-primary" /><div><p className="text-sm text-text-primary">{item.description}</p><p className="text-xs text-text-secondary">{item.entry_type} · {item.entry_date ? String(item.entry_date).slice(0, 10) : "No date"}</p></div></div><div className="flex items-center gap-3"><span className="text-sm font-medium text-text-primary">{item.currency} {Number(item.amount).toFixed(2)}</span><Button variant="secondary" size="sm" onClick={() => remove("financial", item.id)}><Trash2 size={14} /></Button></div></div>) : <p className="px-3 py-5 text-sm text-text-secondary">No financial entries recorded.</p>}</div>
    </Card>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Media" subtitle="Link the external cloud folder containing release media."><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><select className={fieldClass} value={media.provider} onChange={(e) => setMedia({ ...media, provider: e.target.value })}><option>Dropbox</option><option>Google Drive</option><option>OneDrive</option><option>Box</option><option>Other</option></select><input className={fieldClass} placeholder="Folder label" value={media.label} onChange={(e) => setMedia({ ...media, label: e.target.value })} /></div><input className={fieldClass} type="url" placeholder="https://..." value={media.url} onChange={(e) => setMedia({ ...media, url: e.target.value })} /><div className="flex gap-2"><Button variant="primary" size="sm" onClick={() => saveAction("media", media)} disabled={busy === "media"}><Link2 size={14} />Link to Media</Button>{data.media?.url && <Button variant="secondary" size="sm" onClick={() => window.open(data.media.url, "_blank", "noopener,noreferrer")}><ExternalLink size={14} />Open media</Button>}{data.media?.url && <Button variant="secondary" size="sm" onClick={() => remove("media")}><Trash2 size={14} /></Button>}</div></div></Card>
      <Card title="Artists" subtitle="Assign the role each linked artist has on this release."><div className="space-y-2">{releaseArtists.length ? releaseArtists.map((artist: any) => <div key={artist.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"><div className="flex min-w-0 items-center gap-2"><UserRound size={15} className="shrink-0 text-primary" /><span className="truncate text-sm text-text-primary">{artist.display_name || artist.stage_name || artist.name}</span></div><select className="h-9 rounded-lg border border-border bg-surface px-2 text-xs text-text-primary" value={roleByArtist[artist.id] || "Main Artist"} onChange={(e) => saveAction("artist-role", { artist_id: artist.id, role: e.target.value })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></div>) : <p className="text-sm text-text-secondary">Add artists to the release first.</p>}</div></Card>
    </div>
    <Card title="Contract" subtitle="Record the contract signature date and keep the authoritative contract one click away."><div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] items-end"><label><span className={labelClass}>Related contract</span><select className={fieldClass} value={contract.contract_id} onChange={(e) => setContract({ ...contract, contract_id: e.target.value })}><option value="">Select contract</option>{contracts.map((item: any) => <option key={item.id} value={item.id}>{item.title || item.name || `Contract #${item.id}`}</option>)}</select></label><label><span className={labelClass}>Date of contract signature</span><input className={fieldClass} type="date" value={contract.signed_at} onChange={(e) => setContract({ ...contract, signed_at: e.target.value })} /></label><Button variant="primary" size="sm" onClick={() => saveAction("contract", contract)} disabled={!contract.contract_id || busy === "contract"}><Check size={14} />Save contract</Button></div>{data.contract?.contract_id && <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-3"><div className="flex items-center gap-3"><CalendarDays size={16} className="text-primary" /><div><p className="text-xs text-text-secondary">Date of contract signature</p><button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => window.location.assign(`/contracts/${data.contract.contract_id}`)}>{data.contract.signed_at ? String(data.contract.signed_at).slice(0, 10) : "Add signature date"}</button></div></div><Button variant="secondary" size="sm" onClick={() => remove("contract")}><Trash2 size={14} /></Button></div>}</Card>
  </div>;
}
