import React, { useEffect, useState } from 'react';
import { partyLookupClient } from '../../api/partyLookupClient';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const ROLE_OPTIONS = ['Label', 'Artist', 'Producer', 'Remixer', 'Publisher', 'Other'];

export default function PartiesEditorCard({ parties, onChangeParties }) {
  const [rows, setRows] = useState(parties || []);
  useEffect(() => setRows(parties || []), [parties]);

  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 250);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupErr, setLookupErr] = useState(null);

  const [createMode, setCreateMode] = useState(null);
  const [createName, setCreateName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLookupErr(null);
      const s = debounced.trim();
      if (!s) {
        setLookupResults([]);
        return;
      }
      setLookupLoading(true);
      try {
        const data = await partyLookupClient.searchEntities({ q: s });
        if (!alive) return;
        setLookupResults(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!alive) return;
        setLookupErr('Lookup failed.');
      } finally {
        if (alive) setLookupLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [debounced]);

  function commit(next) {
    setRows(next);
    onChangeParties(next);
  }

  function addExternal() {
    const next = [
      ...rows,
      {
        role: 'Other',
        entity_type: 'external',
        entity_id: null,
        display_name: '',
        split_percent: null,
        notes: null,
      },
    ];
    commit(next);
  }

  function addEntity(entity, role = 'Other') {
    const next = [
      ...rows,
      {
        role,
        entity_type: entity.entity_type,
        entity_id: entity.id,
        display_name: entity.display_name,
        split_percent: null,
        notes: null,
      },
    ];
    commit(next);
  }

  function updateRow(i, patch) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    commit(next);
  }

  function removeRow(i) {
    const next = rows.filter((_, idx) => idx !== i);
    commit(next);
  }

  async function doCreate() {
    setCreateErr(null);
    const name = createName.trim();
    if (!createMode || !name) {
      setCreateErr('Pick a type and enter a name.');
      return;
    }
    setCreateBusy(true);
    try {
      let created;
      if (createMode === 'artist') created = await partyLookupClient.createArtist({ name });
      if (createMode === 'organization') created = await partyLookupClient.createOrganization({ name });
      if (createMode === 'individual') created = await partyLookupClient.createIndividual({ full_name: name });

      const entity = {
        entity_type: createMode,
        id: created.id,
        display_name: created.name || created.full_name || name,
      };
      addEntity(entity, 'Other');
      setCreateMode(null);
      setCreateName('');
    } catch {
      setCreateErr('Create failed.');
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={addExternal}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'white',
          }}
        >
          + Add External Party
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select
            value={createMode ?? ''}
            onChange={(e) => setCreateMode(e.target.value || null)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'white',
            }}
          >
            <option value="">Create…</option>
            <option value="artist">Artist</option>
            <option value="organization">Organization</option>
            <option value="individual">Individual</option>
          </select>
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Name"
            disabled={!createMode}
            style={{ width: 240, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)' }}
          />
          <button
            type="button"
            onClick={doCreate}
            disabled={!createMode || createBusy}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'white',
            }}
          >
            {createBusy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      {createErr && <div style={{ color: '#b91c1c', fontSize: 12 }}>{createErr}</div>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search existing parties (artists / orgs / individuals)…"
          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)' }}
        />
      </div>

      <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 10, maxHeight: 180, overflow: 'auto' }}>
        {lookupLoading && <div style={{ fontSize: 12 }}>Searching…</div>}
        {lookupErr && <div style={{ fontSize: 12, color: '#b91c1c' }}>{lookupErr}</div>}
        {!lookupLoading && !lookupErr && lookupResults.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>Type to search.</div>
        )}

        {lookupResults.map((e) => (
          <div key={`${e.entity_type}:${e.id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 6px', borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{e.display_name}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{e.entity_type}</div>
            </div>

            <select
              defaultValue="Other"
              onChange={(ev) => addEntity(e, ev.target.value)}
              style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: 'white' }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  Add as {r}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12 }}>
        <div style={{ padding: 10, fontWeight: 700 }}>Parties</div>

        {rows.length === 0 ? (
          <div style={{ padding: 10, fontSize: 12, opacity: 0.7 }}>
            No parties yet. Add via lookup or "Add External Party".
          </div>
        ) : (
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 44px', gap: 8, alignItems: 'center' }}>
                <select
                  value={r.role}
                  onChange={(e) => updateRow(i, { role: e.target.value })}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: 'white' }}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                <input
                  value={r.display_name}
                  onChange={(e) => updateRow(i, { display_name: e.target.value })}
                  placeholder={r.entity_type === 'external' ? 'External party name' : 'Name'}
                  disabled={r.entity_type !== 'external'}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.12)',
                    opacity: r.entity_type !== 'external' ? 0.75 : 1,
                  }}
                />

                <input
                  value={r.split_percent ?? ''}
                  onChange={(e) =>
                    updateRow(i, {
                      split_percent: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="Split %"
                  type="number"
                  min="0"
                  max="100"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)' }}
                />

                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  style={{ width: 44, height: 40, borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', background: 'white' }}
                  aria-label="Remove party"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
