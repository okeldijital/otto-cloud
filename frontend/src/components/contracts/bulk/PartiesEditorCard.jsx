import React from 'react';
import PartyRow from './PartyRow';

function rowId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `pr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function PartiesEditorCard({
  contractId,
  rows,
  setRows,
  searchParties,
  createPartyInline,
  onSaveParties,
  saving,
}) {
  const addRow = () => {
    setRows([
      ...(rows || []),
      {
        client_row_id: rowId(),
        role: 'other',
        source: 'system_entity',
        split: { scope: 'master', percent: 0 },
      },
    ]);
  };

  return (
    <div className="panel" style={{ padding: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Parties Editor</div>
        <button className="btn" onClick={addRow}>+ Add Party</button>
      </div>

      {(rows || []).map((row, idx) => (
        <PartyRow
          key={row.client_row_id || idx}
          row={row}
          onChange={(next) => setRows((prev) => prev.map((r, i) => (i === idx ? next : r)))}
          onRemove={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
          searchParties={searchParties}
          createPartyInline={createPartyInline}
        />
      ))}

      <button className="btn orange" disabled={!contractId || saving} onClick={onSaveParties}>
        {saving ? 'Saving…' : 'Save Parties'}
      </button>
      {!contractId && <div className="muted small" style={{ marginTop: 6 }}>Draft must exist before saving parties.</div>}
    </div>
  );
}
