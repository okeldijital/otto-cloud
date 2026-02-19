import React, { useState } from 'react';
import PartyLookupSelect from './PartyLookupSelect';
import PartyCreateInlineModal from './PartyCreateInlineModal';

export default function PartyRow({ row, onChange, onRemove, searchParties, createPartyInline }) {
  const [openCreate, setOpenCreate] = useState(false);

  return (
    <div className="panel" style={{ padding: 8, marginBottom: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select className="form-control" value={row.role || 'other'} onChange={(e) => onChange({ ...row, role: e.target.value })}>
          <option value="label">label</option>
          <option value="artist">artist</option>
          <option value="producer">producer</option>
          <option value="publisher">publisher</option>
          <option value="remixer">remixer</option>
          <option value="other">other</option>
        </select>
        <select className="form-control" value={row.source || 'system_entity'} onChange={(e) => onChange({ ...row, source: e.target.value })}>
          <option value="system_entity">system_entity</option>
          <option value="external_party">external_party</option>
        </select>
      </div>

      {row.source === 'system_entity' ? (
        <div style={{ marginTop: 8 }}>
          <PartyLookupSelect
            value={row.party_ref}
            onChange={(val) => onChange({ ...row, party_ref: val })}
            searchParties={searchParties}
          />
          <button className="btn ghost" style={{ marginTop: 6 }} onClick={() => setOpenCreate(true)}>Create new…</button>
        </div>
      ) : (
        <input
          className="form-control"
          style={{ marginTop: 8 }}
          placeholder="External party name"
          value={row.external_name || ''}
          onChange={(e) => onChange({ ...row, external_name: e.target.value })}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 8 }}>
        <input
          className="form-control"
          type="number"
          min="0"
          max="100"
          placeholder="Split %"
          value={row.split?.percent ?? ''}
          onChange={(e) => onChange({ ...row, split: { ...(row.split || {}), percent: e.target.value === '' ? 0 : Number(e.target.value) } })}
        />
        <select className="form-control" value={row.split?.scope || 'master'} onChange={(e) => onChange({ ...row, split: { ...(row.split || {}), scope: e.target.value } })}>
          <option value="master">master</option>
          <option value="publishing">publishing</option>
          <option value="other">other</option>
        </select>
        <button className="btn danger" onClick={onRemove}>Remove</button>
      </div>

      <PartyCreateInlineModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        createPartyInline={createPartyInline}
        onCreated={(created) => onChange({ ...row, source: 'system_entity', party_ref: created })}
      />
    </div>
  );
}
