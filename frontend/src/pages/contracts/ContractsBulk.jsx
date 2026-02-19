import React, { useMemo, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialBulkState, selectVisibleItems, bulkReducer } from './bulk/bulkReducer';
import { useBulkController } from './bulk/useBulkController';
import BulkContractCard from '../../components/contracts/BulkContractCard';

export default function ContractsBulk() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(bulkReducer, initialBulkState);
  const ctrl = useBulkController(state, dispatch);
  const visibleItems = useMemo(() => selectVisibleItems(state), [state]);
  const selectedIds = useMemo(
    () => state.items.filter((x) => x.selected).map((x) => x.file_id),
    [state.items],
  );

  const onChooseFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    await ctrl.addFiles(files);
  };

  const onRunExtract = async () => {
    await ctrl.runBulkExtract(selectedIds);
  };

  return (
    <div className="contracts-shell">
      <header className="contracts-header">
        <div>
          <p className="breadcrumb">Administration of Works ▸ Bulk Processing</p>
          <h1>Bulk Processing</h1>
          <p className="muted">Upload multiple contract PDFs, review extraction, map tracks, then create draft contracts.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 12 }}>
        <aside className="panel min-w-0" style={{ padding: 12, gap: 10 }}>
          <label className="strong" htmlFor="bulk-contract-files">Select PDFs</label>
          <input id="bulk-contract-files" type="file" multiple accept=".pdf,application/pdf" onChange={onChooseFiles} />

          <button type="button" className="btn orange" disabled={!selectedIds.length || state.is_busy} onClick={onRunExtract}>
            {state.status === 'extracting' ? 'Extracting...' : state.status === 'uploading' ? 'Uploading...' : 'Run Bulk Extract'}
          </button>

          <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10 }}>
            {state.items.map((item) => (
              <label
                key={item.file_id}
                className="small"
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 8, borderBottom: '1px solid #f1f5f9' }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(item.selected)}
                  onChange={(e) => dispatch({ type: 'BATCH/TOGGLE_ITEM_SELECTED', file_id: item.file_id, selected: e.target.checked })}
                />
                <span className="break-words">{item.filename}</span>
              </label>
            ))}
            {!state.items.length ? <div className="muted small" style={{ padding: 10 }}>No files selected.</div> : null}
          </div>

          {state.banner_error ? <div className="error-banner">{state.banner_error}</div> : null}
          {state.banner_notice ? <div className="small muted">{state.banner_notice}</div> : null}
        </aside>

        <section className="min-w-0" style={{ display: 'grid', gap: 12 }}>
          {visibleItems.map((item) => (
            <BulkContractCard
              key={item.file_id}
              item={item}
              onUpdateTracks={(trackIds) => dispatch({ type: 'ITEM/SET_TRACKS', file_id: item.file_id, track_ids: trackIds })}
              onAutoMatchTracks={() => ctrl.autoMatchTracks(item.file_id)}
              onUpdateParties={(parties) => dispatch({ type: 'ITEM/SET_PARTIES', file_id: item.file_id, parties })}
              onPersistParties={() => ctrl.savePartiesForSelected(item.file_id)}
              onPersistTracks={() => ctrl.saveTracksForSelected(item.file_id)}
              onToggleConfirmNonDestructive={(value) => dispatch({ type: 'ITEM/SET_CONFIRM_NON_DESTRUCTIVE', file_id: item.file_id, value })}
              onCreateDraft={() => ctrl.createDraftForSelected(item.file_id)}
              onOpenContract={(id, tab) => navigate(`/contracts/${id}?tab=${tab || 'overview'}`)}
            />
          ))}

          {!visibleItems.length ? <div className="panel placeholder">Upload one or more PDFs to begin.</div> : null}
        </section>
      </div>
    </div>
  );
}
