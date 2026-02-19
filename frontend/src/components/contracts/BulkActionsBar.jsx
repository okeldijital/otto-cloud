import React from 'react';

export default function BulkActionsBar({
  selectedCount,
  templateTrackCount,
  templatePartyCount,
  canSaveParties,
  onSelectAllFiltered,
  onClearSelection,
  onApplyTracksToSelected,
  onApplyPartiesToSelected,
  onCreateDraftsForSelected,
  onSavePartiesForSelected,
}) {
  return (
    <div className="panel" style={{ padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button className="btn" onClick={onSelectAllFiltered}>Select all filtered</button>
      <button className="btn" onClick={onClearSelection}>Clear selection</button>
      <button className="btn" onClick={onApplyTracksToSelected} disabled={!templateTrackCount}>
        Apply tracks to selected
      </button>
      <button className="btn" onClick={onApplyPartiesToSelected} disabled={!templatePartyCount}>
        Apply parties to selected
      </button>
      <button className="btn orange" onClick={onCreateDraftsForSelected} disabled={!selectedCount}>
        Create drafts for selected
      </button>
      <button className="btn" onClick={onSavePartiesForSelected} disabled={!canSaveParties}>
        Save parties for selected
      </button>
      <span className="small muted" style={{ marginLeft: 'auto' }}>Selected: {selectedCount}</span>
    </div>
  );
}
