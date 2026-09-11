"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, FileText, Check, Loader2, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface AddContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (contract: any) => void;
}

type Stage = "upload" | "details" | "creating" | "complete" | "error";

const CONTRACT_TYPES = ["Recording", "Publishing", "License", "Other"];

export default function AddContractWizard({ isOpen, onClose, onCreated }: AddContractWizardProps) {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [type, setType] = useState("Recording");
  const [territory, setTerritory] = useState("Worldwide");
  const [exclusivity, setExclusivity] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStage("upload");
    setFile(null);
    setContract(null);
    setError("");
    setBusy(false);
    setTitle("");
    setContractNumber("");
    setType("Recording");
    setTerritory("Worldwide");
    setExclusivity(false);
    setStartDate("");
    setEndDate("");
    setSignedDate("");
    setNotes("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Please select a PDF contract.");
      return;
    }

    setError("");
    setFile(selected);
    setTitle((current) => current || selected.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim());
  };

  const continueToDetails = () => {
    if (!file) {
      setError("Select the signed contract PDF before continuing.");
      return;
    }
    setError("");
    setStage("details");
  };

  const uploadDocument = async (contractId: number | string) => {
    if (!file) throw new Error("No contract PDF selected.");
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/contracts?action=upload_document&id=${contractId}`, formData);
    const documentId = response.data?.document_id || response.data?.document?.id;
    if (!documentId) throw new Error("Contract upload did not return a document reference.");
    return response.data;
  };

  const createContract = async () => {
    if (!file || !title.trim()) {
      setError("A contract title is required.");
      return;
    }

    setBusy(true);
    setError("");
    setStage("creating");

    try {
      let created = contract;

      if (!created?.id) {
        const contractRes = await api.post("/contracts", {
          contract_number: contractNumber.trim() || undefined,
          title: title.trim(),
          status: "Draft",
          type,
          territory: territory.trim() || "Worldwide",
          exclusivity,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          signed_date: signedDate || undefined,
          notes: notes.trim(),
        });
        created = contractRes.data;
        setContract(created);
      } else {
        await api.put(`/contracts?id=${created.id}`, {
          contract_number: contractNumber.trim() || undefined,
          title: title.trim(),
          type,
          territory: territory.trim() || "Worldwide",
          exclusivity,
          start_date: startDate || null,
          end_date: endDate || null,
          signed_date: signedDate || null,
          notes: notes.trim(),
        });
      }

      await uploadDocument(created.id);
      setStage("complete");
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Unable to create the contract record.");
      setStage("error");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (contract) onCreated(contract);
    else onClose();
  };

  const stepIndex = stage === "upload" ? 1 : stage === "details" || stage === "creating" ? 2 : 3;
  const steps = ["Upload PDF", "Contract Details", "Complete"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Add Contract</h2>
            <p className="text-xs text-text-secondary mt-1">Store the signed source document and capture its structured contract record.</p>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 pt-6">
          {steps.map((label, index) => {
            const number = index + 1;
            const complete = number < stepIndex;
            const active = number === stepIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${complete ? "bg-success/20 text-success" : active ? "bg-primary text-white" : "bg-white/5 text-text-secondary"}`}>
                  {complete ? <Check size={14} /> : number}
                </div>
                <span className={`text-xs ${active ? "text-white" : "text-text-secondary"}`}>{label}</span>
                {index < steps.length - 1 && <div className="w-8 h-px bg-white/10" />}
              </div>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-5 flex gap-3 bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {stage === "upload" && (
            <div className="space-y-5 py-6">
              <div className="text-center">
                <FileText size={42} className="mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold text-white">Start with the signed contract PDF</h3>
                <p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">OTTO stores the original PDF as the source document. Contract terms are captured manually from the source; no OCR or automatic extraction is performed.</p>
              </div>

              <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 hover:border-primary/40 transition-colors cursor-pointer text-center" onClick={() => inputRef.current?.click()}>
                <FileText size={30} className="mx-auto mb-3 text-text-secondary" />
                <p className="text-sm font-medium text-white">{file ? file.name : "Select contract PDF"}</p>
                {file && <p className="text-xs text-text-secondary mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
              </div>

              <div className="flex justify-end">
                <Button variant="primary" disabled={!file} onClick={continueToDetails}>Continue <Upload size={16} /></Button>
              </div>
            </div>
          )}

          {stage === "details" && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Capture contract details</h3>
                <p className="text-sm text-text-secondary mt-1">Enter what is known from the signed document. Additional parties, assets, rights, terms and splits can be added from the contract record.</p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 flex items-center gap-3">
                <FileText size={18} className="text-text-secondary shrink-0" />
                <div className="min-w-0"><p className="text-sm text-white truncate">{file?.name}</p><p className="text-xs text-text-secondary mt-1">Source PDF ready to be stored</p></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2"><span className="text-xs text-text-secondary">Contract title *</span><input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Artist Recording Agreement" /></label>
                <label className="space-y-2"><span className="text-xs text-text-secondary">Contract number</span><input className="input w-full" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="Optional" /></label>
                <label className="space-y-2"><span className="text-xs text-text-secondary">Contract type</span><select className="input w-full" value={type} onChange={(e) => setType(e.target.value)}>{CONTRACT_TYPES.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label className="space-y-2"><span className="text-xs text-text-secondary">Territory</span><input className="input w-full" value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="Worldwide" /></label>
                <label className="space-y-2"><span className="text-xs text-text-secondary">Start date</span><input className="input w-full" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
                <label className="space-y-2"><span className="text-xs text-text-secondary">End date</span><input className="input w-full" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
                <label className="space-y-2"><span className="text-xs text-text-secondary">Signed date</span><input className="input w-full" type="date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} /></label>
                <label className="flex items-center gap-3 pt-6"><input type="checkbox" checked={exclusivity} onChange={(e) => setExclusivity(e.target.checked)} /><span className="text-sm text-text-primary">Exclusive agreement</span></label>
              </div>

              <label className="space-y-2 block"><span className="text-xs text-text-secondary">Notes</span><textarea className="input w-full min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional source or administrative notes" /></label>

              <div className="flex justify-between gap-3">
                <Button variant="secondary" onClick={() => setStage("upload")}>Back</Button>
                <Button variant="primary" disabled={!title.trim() || busy} onClick={createContract}>{busy ? "Saving…" : "Create Contract"} <Check size={16} /></Button>
              </div>
            </div>
          )}

          {stage === "creating" && (
            <div className="py-16 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Loader2 size={30} className="text-primary animate-spin" /></div>
              <div><h3 className="text-lg font-semibold text-white">Saving contract</h3><p className="text-sm text-text-secondary mt-2">Creating the contract record and storing the source PDF.</p></div>
            </div>
          )}

          {stage === "complete" && (
            <div className="py-12 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"><Check size={30} className="text-success" /></div>
              <div><h3 className="text-lg font-semibold text-white">Contract created</h3><p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">The signed PDF is stored as the source document. Continue to the contract record to add parties, assets, rights and terms, splits, and lifecycle information.</p></div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-left max-w-lg mx-auto"><div className="text-sm text-white">{contract?.title || title}</div><div className="text-xs text-text-secondary mt-1">{contract?.contract_number || "Contract number pending"}</div></div>
              <div className="flex justify-end"><Button variant="primary" onClick={finish}>Open Contract <FileText size={16} /></Button></div>
            </div>
          )}

          {stage === "error" && (
            <div className="py-10 text-center">
              <AlertCircle size={42} className="mx-auto mb-4 text-danger" />
              <h3 className="text-lg font-semibold text-white">Contract setup needs attention</h3>
              <p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">The contract record may already exist as a draft. Retry to finish storing the source PDF, or close this window and inspect the draft from the Contracts list.</p>
              <div className="mt-5 flex justify-center gap-3"><Button variant="secondary" onClick={onClose}>Close</Button><Button variant="primary" onClick={() => { setError(""); setStage(contract ? "details" : "upload"); }}>Retry</Button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
