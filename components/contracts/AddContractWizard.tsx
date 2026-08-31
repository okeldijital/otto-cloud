"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, FileText, Check, Loader2, AlertCircle, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface AddContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (contract: any) => void;
}

type Stage = "upload" | "extracting" | "review" | "error";

export default function AddContractWizard({ isOpen, onClose, onCreated }: AddContractWizardProps) {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [extraction, setExtraction] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStage("upload");
    setFile(null);
    setContract(null);
    setJob(null);
    setExtraction(null);
    setError("");
    setBusy(false);
  }, [isOpen]);

  useEffect(() => {
    if (stage !== "extracting" || !job?.id || !job?.documentId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await api.get(`/ai/contracts?action=extraction_status&document_id=${encodeURIComponent(job.documentId)}&job_id=${encodeURIComponent(job.id)}`);
        if (cancelled) return;
        setJob(res.data.job);
        if (res.data.job?.status === "completed" && res.data.extractionId) {
          const result = await api.get(`/ai/contracts?action=extraction_result&document_id=${encodeURIComponent(job.documentId)}&extraction_id=${encodeURIComponent(res.data.extractionId)}`);
          if (!cancelled) {
            setExtraction(result.data);
            setStage("review");
          }
        } else if (res.data.job?.status === "failed") {
          setError(res.data.job.errorMessage || "Contract extraction failed.");
          setStage("error");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || "Unable to read extraction status.");
          setStage("error");
        }
      }
    };
    void poll();
    const timer = window.setInterval(poll, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [stage, job?.id, job?.documentId]);

  if (!isOpen) return null;

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Please select a PDF contract.");
      return;
    }
    setError("");
    setFile(selected);
  };

  const startIntake = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const title = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "Contract Intake";
      const contractRes = await api.post("/contracts", {
        title,
        status: "Draft",
        type: "Unknown",
        territory: "Worldwide",
        exclusivity: false,
        notes: "Created by Contract Intelligence intake; metadata pending verification.",
      });
      const created = contractRes.data;
      setContract(created);

      const fd = new FormData();
      fd.append("file", file);
      const documentRes = await api.post(`/contracts?action=upload_document&id=${created.id}`, fd);
      const document = documentRes.data;

      const extractionRes = await api.post("/ai/contracts?action=extract", {
        document_id: document.id,
        contract_id: created.id,
      });
      setJob(extractionRes.data);
      setStage("extracting");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to start contract intake.");
      setStage("error");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (contract) onCreated(contract);
    else onClose();
  };

  const fields = Array.isArray(extraction?.fields) ? extraction.fields : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Contract Intelligence</h2>
            <p className="text-xs text-text-secondary mt-1">Upload a contract and let OTTO extract its terms.</p>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 pt-6">
          {["Upload", "Extract", "Review"].map((label, index) => {
            const active = stage === "upload" ? index === 0 : stage === "extracting" ? index === 1 : index === 2;
            const complete = (stage === "extracting" && index === 0) || (stage === "review" && index < 2);
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${complete ? "bg-success/20 text-success" : active ? "bg-primary text-white" : "bg-white/5 text-text-secondary"}`}>
                  {complete ? <Check size={14} /> : index + 1}
                </div>
                <span className={`text-xs ${active ? "text-white" : "text-text-secondary"}`}>{label}</span>
                {index < 2 && <div className="w-8 h-px bg-white/10" />}
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
                <Sparkles size={42} className="mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold text-white">Start with the contract PDF</h3>
                <p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">
                  OTTO will create a draft contract record, store the PDF as the source document, and start Contract Intelligence extraction automatically.
                </p>
              </div>
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 hover:border-primary/40 transition-colors cursor-pointer text-center" onClick={() => inputRef.current?.click()}>
                <FileText size={30} className="mx-auto mb-3 text-text-secondary" />
                <p className="text-sm font-medium text-white">{file ? file.name : "Select contract PDF"}</p>
                {file && <p className="text-xs text-text-secondary mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" disabled={!file || busy} onClick={startIntake}>
                  {busy ? "Starting…" : "Upload & Extract"} <Upload size={16} />
                </Button>
              </div>
            </div>
          )}

          {stage === "extracting" && (
            <div className="py-12 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 size={30} className="text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Reading your contract</h3>
                <p className="text-sm text-text-secondary mt-2">OTTO is extracting the document text and identifying contract fields.</p>
              </div>
              <div className="text-xs text-text-secondary">Status: {job?.status || "queued"}</div>
            </div>
          )}

          {stage === "review" && extraction && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Extraction ready for review</h3>
                  <p className="text-sm text-text-secondary mt-1">AI output is provisional. Human verification is required.</p>
                </div>
                <div className="text-right text-xs text-text-secondary">
                  <div>Confidence</div>
                  <div className="text-white font-semibold text-base">{extraction.overallConfidence ?? "—"}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map((field: any) => (
                  <div key={field.id || field.fieldKey} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-text-secondary">{field.fieldLabel || field.fieldKey}</span>
                      <span className="text-[10px] text-text-secondary">{field.confidence ?? "—"}%</span>
                    </div>
                    <p className="mt-2 text-sm text-white whitespace-pre-wrap">{typeof field.value === "string" ? field.value : JSON.stringify(field.value)}</p>
                  </div>
                ))}
              </div>

              {!fields.length && (
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 text-sm text-text-secondary">
                  Extraction completed, but no structured fields were returned. The raw text preview is available for the verification workflow.
                </div>
              )}

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><FileText size={16} /> Source text preview</div>
                <p className="text-xs text-text-secondary whitespace-pre-wrap max-h-40 overflow-y-auto">{extraction.rawTextPreview || "No text preview available."}</p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={close}>Close</Button>
                <Button variant="primary" onClick={close}>Save Draft & Continue</Button>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="py-10 text-center">
              <AlertCircle size={42} className="mx-auto mb-4 text-danger" />
              <h3 className="text-lg font-semibold text-white">Contract intake needs attention</h3>
              <p className="text-sm text-text-secondary mt-2">The draft contract and uploaded document may already exist. Retry or inspect the contract record before creating another intake.</p>
              <div className="mt-5 flex justify-center gap-3">
                <Button variant="secondary" onClick={onClose}>Close</Button>
                <Button variant="primary" onClick={() => { setStage("upload"); setError(""); }}>Try Again</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
