import React from 'react';
import TrackMultiSelect from './TrackMultiSelect';
import CompletenessBadge from './CompletenessBadge';
import PartyMultiAssign from './PartyMultiAssign';

/**
 * Card for a single contract in Bulk Processing.
 *
 * Props:
 *   item          - { id, filename, status, extract, trackIds, parties, contractId, completeness, error }
 *   onUpdateTracks(trackIds)
 *   onUpdateParties(parties)
 *   onCreateDraft()
 *   onUpdateTerms(terms)
 *   onUpdateDetails(details)
 *   onSaveTracks()
 *   onSaveParties()
 *   onSaveTerms()
 *   onRemove()
 */

export default function BulkContractCard({
  item,
  onUpdateTracks,
  onUpdateParties,
  onUpdateTerms,
  onUpdateDetails,
  onCreateDraft,
  onSaveTracks,
  onSaveParties,
  onSaveTerms,
  onRemove,
}) {
  if (!item) return null;

  const data = item.extract?.data || {};
  let title = data.title || data.contract_title;
  if (!title) title = item.filename;
  const parties = Array.isArray(data.parties) ? data.parties : [];
  const dates = data.dates || {};
  const isCreated = Boolean(item.contractId);
  const isBusy = item.status === 'extracting' || item.status === 'creating';

  const trackMatches = Array.isArray(data.suggested_track_matches) ? data.suggested_track_matches : [];
  const matchedCount = trackMatches.filter(m => m.track_id).length;
  const unmatchedCount = trackMatches.filter(m => !m.track_id).length;

  return (
    <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <div className="small muted">{item.filename}</div>
          {isCreated && (
            <div className="small" style={{ color: '#15803d', marginTop: 4 }}>
              ✓ Draft created · Contract #{item.contractId}
            </div>
          )}
        </div>
        {item.completeness && <CompletenessBadge completeness={item.completeness} />}
      </div>

      {/* ── Error ─────────────────────────────────────── */}
      {item.error && (
        <div className="error-banner" style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
          {typeof item.error === 'string' ? item.error : item.error.message || JSON.stringify(item.error)}
        </div>
      )}

      {/* ── Status: idle ──────────────────────────────── */}
      {item.status === 'idle' && (
        <div className="muted" style={{ padding: 20, textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: 8 }}>
          Ready for extraction. Click "Extract All" in the sidebar.
        </div>
      )}

      {/* ── Status: extracting ────────────────────────── */}
      {item.status === 'extracting' && (
        <div style={{ padding: 20, textAlign: 'center', color: '#b45309' }}>
          Extracting...
        </div>
      )}

      {/* ── Extraction result ─────────────────────────── */}
      {(item.status === 'extracted' || item.status === 'created' || item.status === 'creating') && item.extract && (
        <>
          {/* Auto-match summary */}
          {trackMatches.length > 0 && (
            <div className="small" style={{
              padding: '8px 12px', borderRadius: 6,
              background: matchedCount > 0 ? '#f0fdf4' : '#fefce8',
              border: `1px solid ${matchedCount > 0 ? '#bbf7d0' : '#fef08a'}`,
            }}>
              <strong>AI Auto-Match:</strong>{' '}
              {matchedCount > 0 && <span style={{ color: '#15803d' }}>{matchedCount} track(s) matched</span>}
              {matchedCount > 0 && unmatchedCount > 0 && ' · '}
              {unmatchedCount > 0 && <span style={{ color: '#b45309' }}>{unmatchedCount} unmatched (manual review needed)</span>}
            </div>
          )}

          {/* Details */}
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
            <div className="strong" style={{ marginBottom: 8 }}>Contract Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="small muted strong">Title</label>
                <input
                  className="input"
                  value={title || ''}
                  onChange={e => onUpdateDetails?.({ title: e.target.value })}
                  disabled={isCreated}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="small muted strong">Type</label>
                <select
                  className="input"
                  value={data.type || 'unknown'}
                  onChange={e => onUpdateDetails?.({ type: e.target.value })}
                  disabled={isCreated}
                  style={{ marginTop: 4 }}
                >
                  <option value="unknown">Unknown</option>
                  <option value="recording">Recording</option>
                  <option value="publishing">Publishing</option>
                  <option value="license">License</option>
                  <option value="remix">Remix</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="small muted strong">Effective Date</label>
                <input
                  type="date"
                  className="input"
                  value={dates.effective_date || dates.start_date || dates.contract_date || ''}
                  onChange={e => onUpdateDetails?.({ dates: { ...dates, effective_date: e.target.value } })}
                  disabled={isCreated}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="small muted strong">End Date</label>
                <input
                  type="date"
                  className="input"
                  value={dates.end_date || dates.expiration_date || ''}
                  onChange={e => onUpdateDetails?.({ dates: { ...dates, end_date: e.target.value } })}
                  disabled={isCreated}
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>
          </section>

          {/* Terms */}
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
            <div className="strong" style={{ marginBottom: 8 }}>Contract Terms</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div>
                <textarea
                  className="input"
                  rows={6}
                  defaultValue={item.terms?.term_text || ''}
                  placeholder="Paste contract terms here..."
                  onBlur={e => onUpdateTerms({ ...item.terms, term_text: e.target.value })}
                />
              </div>
            </div>
            {isCreated && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn small" onClick={onSaveTerms}>Save Terms</button>
              </div>
            )}
          </section>

          {/* Tracks */}
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
            <div className="strong" style={{ marginBottom: 8 }}>Track Mapping</div>
            <TrackMultiSelect
              selectedIds={item.trackIds || []}
              onChange={onUpdateTracks}
            />
            {isCreated && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn small" onClick={onSaveTracks}>Save Tracks</button>
              </div>
            )}
          </section>

          {/* Parties */}
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
            <div className="strong" style={{ marginBottom: 8 }}>Parties</div>
            <PartyMultiAssign
              rows={item.parties || []}
              onChangeRows={onUpdateParties}
              onPersist={onSaveParties}
              canPersist={isCreated}
              isPersisting={false}
            />
          </section>
        </>
      )}

      {/* ── Actions ───────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        paddingTop: 12, borderTop: '1px solid #f1f5f9',
      }}>
        {!isCreated && item.status === 'extracted' && (
          <button
            type="button"
            className="btn orange"
            disabled={isBusy}
            onClick={onCreateDraft}
            style={{ minWidth: 160 }}
          >
            Create Draft Contract
          </button>
        )}

        {isCreated && (
          <a
            href={`#/contracts/${item.contractId}`}
            className="btn"
            style={{ background: '#1d4ed8', color: '#fff', textDecoration: 'none', minWidth: 140, textAlign: 'center' }}
          >
            View Contract ▸
          </a>
        )}

        <button
          type="button"
          className="ghost-btn small"
          onClick={onRemove}
          disabled={isBusy}
          style={{ marginLeft: 'auto' }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
