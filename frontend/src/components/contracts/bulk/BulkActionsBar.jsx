import React, { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';

function getCreateBlockers(item) {
  const blockers = [];
  if (!item?.extract) blockers.push('Run extract first');
  if (!(item?.selected_track_ids || []).length) blockers.push('Select at least one track');
  if (!item?.confirm_non_destructive) blockers.push('Confirm non-destructive');
  return blockers;
}

export default function BulkActionsBar({ item, onToggleConfirmNonDestructive, onCreateDraft, onOpenContract }) {
  const createdContractId = item?.created_contract_id;
  const blockers = useMemo(() => getCreateBlockers(item), [item]);
  const canCreateDraft = blockers.length === 0 && item?.phase !== 'draft_creating';
  const canSaveParties = Boolean(item?.created_contract_id) && item?.phase !== 'parties_saving';

  return (
    <div className="panel" style={{ padding: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span className={`status-badge ${item?.extract ? 'success' : 'neutral'}`}>extracted</span>
        <span className={`status-badge ${createdContractId ? 'success' : 'neutral'}`}>draft_created</span>
        <span className={`status-badge ${canSaveParties ? 'success' : 'neutral'}`}>parties_ready</span>
      </div>

      <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={Boolean(item?.confirm_non_destructive)}
          onChange={(e) => onToggleConfirmNonDestructive(e.target.checked)}
        />
        Confirm non-destructive
      </label>

      <button className="btn orange" onClick={onCreateDraft} disabled={!canCreateDraft}>
        <CheckCircle2 size={16} /> {item?.phase === 'draft_creating' ? 'Creating…' : 'Create Draft'}
      </button>
      {createdContractId ? (
        <button className="btn" style={{ marginLeft: 8 }} onClick={() => onOpenContract?.(createdContractId)}>
          Open Contract
        </button>
      ) : null}

      {!canCreateDraft && blockers.length > 0 ? (
        <div className="small muted" style={{ marginTop: 8 }}>
          {blockers.join(' | ')}
        </div>
      ) : null}

      {item?.completeness ? (
        <div className="small muted" style={{ marginTop: 8 }}>
          Score: {item.completeness.score} | Status: {String(item.completeness.status || item.completeness.status_quo || 'red').toUpperCase()}
        </div>
      ) : null}
    </div>
  );
}
