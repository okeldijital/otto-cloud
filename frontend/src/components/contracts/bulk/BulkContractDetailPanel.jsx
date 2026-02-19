import React from 'react';
import ExtractSummaryCard from './ExtractSummaryCard';
import KeyTermsPreviewCard from './KeyTermsPreviewCard';
import BulkActionsBar from './BulkActionsBar';
import TrackSearchMultiSelect from '../TrackSearchMultiSelect';
import PartiesEditorCard from '../PartiesEditorCard';
import CompletenessBadge from '../CompletenessBadge';

export default function BulkContractDetailPanel({
  item,
  onUpdateTracks,
  onUpdateParties,
  onToggleConfirmNonDestructive,
  onRunTrackSearch,
  onRunPartySearch,
  onCreateParty,
  onAutoMatchTracks,
  onCreateDraft,
  onSaveParties,
  onOpenContract,
}) {
  if (!item) return <div className="panel" style={{ padding: 12 }}>Select a file row to review.</div>;

  const hintedTracks = Array.isArray(item?.extract?.data?.tracks)
    ? item.extract.data.tracks.map((t) => t?.raw || t?.raw_mention || '').filter(Boolean).join(', ')
    : Array.isArray(item?.extract?.data?.tracks?.mentioned_titles)
      ? item.extract.data.tracks.mentioned_titles.join(', ')
      : '';

  return (
    <div className="panel" style={{ padding: 12, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>{item.filename}</h3>
        <CompletenessBadge completeness={item.completeness} />
      </div>
      {item.error ? <div className="error-banner">{item.error.message}</div> : null}

      <ExtractSummaryCard extract={item.extract} completeness={item.completeness} />

      <TrackSearchMultiSelect
        selectedTrackIds={item.selected_track_ids || []}
        onChangeSelectedIds={onUpdateTracks}
        hintTracksText={hintedTracks}
      />
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={onAutoMatchTracks}>Auto-match from extract</button>
      </div>

      <PartiesEditorCard
        parties={item.parties || []}
        onChangeParties={onUpdateParties}
      />
      <div style={{ marginTop: 8 }}>
        <button className="btn" disabled={!item?.created_contract_id || item.phase === 'parties_saving'} onClick={onSaveParties}>
          {item.phase === 'parties_saving' ? 'Saving…' : 'Save Parties'}
        </button>
        {!item?.created_contract_id ? <div className="muted small" style={{ marginTop: 6 }}>Draft must exist before saving parties.</div> : null}
      </div>

      <KeyTermsPreviewCard extract={item.extract} />

      <BulkActionsBar
        item={item}
        onToggleConfirmNonDestructive={onToggleConfirmNonDestructive}
        onCreateDraft={onCreateDraft}
        onOpenContract={onOpenContract}
      />
    </div>
  );
}
