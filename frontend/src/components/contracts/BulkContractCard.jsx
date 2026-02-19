import React from 'react';
import TrackMultiSelect from './TrackMultiSelect';
import ExtractPreviewSections from './ExtractPreviewSections';
import CompletenessBadge from './CompletenessBadge';
import PartyMultiAssign from './PartyMultiAssign';

function dateLabel(extractData, key) {
  const dates = extractData?.dates || {};
  if (key === 'expiration_date') {
    return dates.expiration_date || dates.end_date || (dates.end_date_specified ? 'Not found' : 'No end date specified');
  }
  return dates[key] || 'Not found';
}

export default function BulkContractCard({
  item,
  onUpdateTracks,
  onAutoMatchTracks,
  onUpdateParties,
  onPersistParties,
  onPersistTracks,
  onToggleConfirmNonDestructive,
  onCreateDraft,
  onOpenContract,
}) {
  const extractData = item?.extract?.data || {};
  const title = extractData.title || item.filename;
  const parties = Array.isArray(extractData.parties) ? extractData.parties : [];
  const assignedParties = Array.isArray(item?.parties) ? item.parties : [];
  const selectedTracks = item?.selected_track_ids || [];
  const canCreate = Boolean(item?.extract) && selectedTracks.length > 0 && Boolean(item?.confirm_non_destructive);
  const isDraftCreated = Boolean(item?.created_contract_id);

  return (
    <article className="panel min-w-0" style={{ padding: 12, gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div className="min-w-0">
          <div className="strong break-words">{title}</div>
          <div className="small muted break-words">{item.filename}</div>
        </div>
        <CompletenessBadge completeness={item.completeness || { score: 0, status: 'red', missing: ['missing_tracks', 'missing_parties'] }} />
      </div>

      <div className="small break-words">
        Effective: {dateLabel(extractData, 'effective_date')} | Contract Date: {dateLabel(extractData, 'contract_date')} | Expiration: {dateLabel(extractData, 'expiration_date')}
      </div>
      <div className="small break-words">
        Parties: {parties.length ? parties.map((p) => p.display_name || p.name).filter(Boolean).join(', ') : 'No parties extracted'}
      </div>

      <ExtractPreviewSections extract={item.extract} />

      <section className="panel min-w-0" style={{ padding: 10 }}>
        <div className="strong" style={{ marginBottom: 6 }}>Track Mapping</div>
        <TrackMultiSelect selectedIds={selectedTracks} onChange={onUpdateTracks} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <button type="button" className="ghost-btn" onClick={onAutoMatchTracks}>
            Auto-match
          </button>
          {isDraftCreated ? (
            <button type="button" className="ghost-btn" onClick={onPersistTracks}>
              Save Tracks
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel min-w-0" style={{ padding: 10 }}>
        <div className="strong" style={{ marginBottom: 6 }}>Parties</div>
        <PartyMultiAssign
          rows={assignedParties}
          onChangeRows={onUpdateParties}
          onPersist={onPersistParties}
          canPersist={Boolean(item?.created_contract_id) && Boolean(item?.confirm_non_destructive)}
          isPersisting={item?.phase === 'parties_saving'}
        />
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={Boolean(item?.confirm_non_destructive)}
            onChange={(e) => onToggleConfirmNonDestructive(e.target.checked)}
          />
          confirm_non_destructive
        </label>
        <button
          type="button"
          className="btn orange"
          disabled={!canCreate || item?.phase === 'draft_creating'}
          onClick={onCreateDraft}
        >
          {item?.phase === 'draft_creating' ? 'Creating...' : isDraftCreated ? 'Update Draft' : 'Create Draft Contract'}
        </button>
        {item?.created_contract_id ? (
          <button type="button" className="btn ghost" onClick={() => onOpenContract?.(item.created_contract_id, 'assets')}>
            Open Contract (Assets)
          </button>
        ) : null}
      </div>
    </article>
  );
}
