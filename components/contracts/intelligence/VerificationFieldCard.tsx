"use client";

import { useEffect, useState } from "react";
import {
  Check,
  RotateCcw,
  X,
  Pencil,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfidenceBadge from "./ConfidenceBadge";

export interface VerificationField {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  extractedValue: string | null;
  workingValue: string | null;
  confidence: number;
  confidenceBand: string;
  verificationState: string;
  isRequired: boolean;
  differsFromAi: boolean;
}

interface Props {
  field: VerificationField;
  canVerify: boolean;
  disabled?: boolean;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (value: string) => void;
  onReset: () => void;
}

const STATE_VARIANT: Record<string, string> = {
  draft: "neutral",
  accepted: "success",
  edited: "primary",
  rejected: "critical",
  verified: "success",
};

export default function VerificationFieldCard({
  field,
  canVerify,
  disabled,
  busy,
  onAccept,
  onReject,
  onEdit,
  onReset,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.workingValue || "");

  useEffect(() => {
    setDraft(field.workingValue || "");
    setEditing(false);
  }, [field.workingValue, field.verificationState, field.id]);

  const lock = disabled || !canVerify || field.verificationState === "verified";

  return (
    <article
      className={`rounded-xl border p-3 space-y-2 ${
        field.differsFromAi
          ? "border-primary/40 bg-primary/5"
          : "border-white/10 bg-white/5"
      }`}
      aria-label={`${field.fieldLabel}, status ${field.verificationState}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary truncate">
            {field.fieldLabel}
            {field.isRequired && (
              <span className="text-danger ml-1" title="Required for completion">
                *
              </span>
            )}
          </h4>
          <Badge variant={(STATE_VARIANT[field.verificationState] || "neutral") as any} size="sm">
            {field.verificationState}
          </Badge>
        </div>
        <ConfidenceBadge confidence={field.confidence} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-[10px] uppercase text-text-secondary mb-0.5">AI draft</p>
          <p className="text-text-secondary whitespace-pre-wrap break-words">
            {field.extractedValue || (
              <span className="italic">Empty</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-text-secondary mb-0.5">
            Working value
          </p>
          {editing ? (
            <textarea
              className="w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={`Edit ${field.fieldLabel}`}
              disabled={busy}
            />
          ) : (
            <p
              className={`whitespace-pre-wrap break-words ${
                field.differsFromAi ? "text-white font-medium" : "text-white"
              }`}
            >
              {field.workingValue || (
                <span className="italic text-text-secondary">Empty</span>
              )}
            </p>
          )}
        </div>
      </div>

      {canVerify && !lock && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {editing ? (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  onEdit(draft);
                  setEditing(false);
                }}
              >
                Save edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setDraft(field.workingValue || "");
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onAccept}
                aria-label={`Accept ${field.fieldLabel}`}
              >
                <Check size={14} /> Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setEditing(true)}
                aria-label={`Edit ${field.fieldLabel}`}
              >
                <Pencil size={14} /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onReject}
                aria-label={`Reject ${field.fieldLabel}`}
              >
                <X size={14} /> Reject
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onReset}
                aria-label={`Reset ${field.fieldLabel} to AI value`}
              >
                <RotateCcw size={14} /> Reset
              </Button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
