import React, { useState, useCallback, useRef } from 'react';
import contractsBulkClient from '../../api/contractsBulkClient';
import BulkContractCard from '../../components/contracts/BulkContractCard';

/**
 * Bulk Processing — Clean rebuild.
 *
 * Flow: Upload PDFs → Extract (auto-maps tracks + parties) → Review/Fix → Create Drafts
 *
 * State is plain useState. No reducer, no controller, no external state files.
 */

function uid() {
  return crypto?.randomUUID?.() || `f-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/** Try to normalize various date formats to YYYY-MM-DD. Returns null if not parseable. */
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Try native Date parsing
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
    return d.toISOString().slice(0, 10);
  }

  // DD.MM.YY or DD.MM.YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dmy) {
    let [, day, month, year] = dmy;
    if (year.length === 2) year = (Number(year) > 50 ? '19' : '20') + year;
    const dt = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  return null;
}

function makeItem(file) {
  return {
    id: uid(),
    filename: file.name,
    file,
    status: 'idle',         // idle | extracting | extracted | creating | created | error
    extract: null,           // raw extraction data from backend
    trackIds: [],            // selected track IDs (pre-filled from auto-match)
    parties: [],             // party rows (pre-filled from auto-match)
    contractId: null,        // created contract ID
    documentId: null,
    completeness: null,
    terms: {},               // selected terms to edit
    error: null,
  };
}

export default function ContractsBulk() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [globalStatus, setGlobalStatus] = useState('idle'); // idle | extracting | creating
  const [banner, setBanner] = useState(null); // { type: 'error'|'success', message }
  const fileInputRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────

  const updateItem = useCallback((id, patch) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }, []);

  const selectedItem = items.find(it => it.id === selectedId) || null;

  // ── Step 1: Add files ──────────────────────────────────────────────

  const onFilesChosen = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems = files
      .filter(f => f.name.toLowerCase().endsWith('.pdf'))
      .map(makeItem);

    if (!newItems.length) {
      setBanner({ type: 'error', message: 'No PDF files selected.' });
      return;
    }

    setItems(prev => [...prev, ...newItems]);
    setSelectedId(prev => prev || newItems[0]?.id || null);
    setBanner(null);

    // Reset file input so same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => {
      const next = prev.filter(it => it.id !== id);
      return next;
    });
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setSelectedId(null);
    setBanner(null);
  }, []);

  // ── Step 2: Extract all ────────────────────────────────────────────

  const extractAll = useCallback(async () => {
    const pending = items.filter(it => it.status === 'idle' || it.status === 'error');
    if (!pending.length) {
      setBanner({ type: 'error', message: 'No files to extract.' });
      return;
    }

    setGlobalStatus('extracting');
    setBanner(null);

    // Mark all pending as extracting
    setItems(prev => prev.map(it =>
      (it.status === 'idle' || it.status === 'error')
        ? { ...it, status: 'extracting', error: null }
        : it
    ));

    try {
      const formData = new FormData();
      for (const item of pending) {
        formData.append('files', item.file, item.filename);
      }

      const resp = await contractsBulkClient.extractBulk(formData);
      const results = Array.isArray(resp?.results) ? resp.results : [];

      // Map results by filename
      const byFilename = new Map();
      for (const r of results) {
        byFilename.set(r.filename, r);
      }

      // Update each item with its result
      setItems(prev => prev.map(it => {
        if (it.status !== 'extracting') return it;
        const r = byFilename.get(it.filename);
        if (!r) {
          return { ...it, status: 'error', error: 'No result from server' };
        }
        if (r.status === 'ok' && r.extract) {
          const data = r.extract.data || {};
          return {
            ...it,
            status: 'extracted',
            extract: r.extract,
            // Auto-attach tracks and parties from AI suggestions
            trackIds: Array.isArray(data.suggested_track_ids) ? data.suggested_track_ids : [],
            parties: Array.isArray(data.suggested_party_links) ? data.suggested_party_links : [],
            terms: data.key_terms || {},
            error: null,
          };
        }
        return {
          ...it,
          status: 'error',
          error: r.error?.message || 'Extraction failed',
        };
      }));

      const okCount = results.filter(r => r.status === 'ok').length;
      const errCount = results.filter(r => r.status !== 'ok').length;
      setBanner({
        type: errCount > 0 ? 'error' : 'success',
        message: `Extracted ${okCount} file(s)${errCount > 0 ? `, ${errCount} failed` : ''}.`,
      });
    } catch (err) {
      setBanner({ type: 'error', message: `Extraction failed: ${err.message}` });
      setItems(prev => prev.map(it =>
        it.status === 'extracting'
          ? { ...it, status: 'error', error: err.message }
          : it
      ));
    } finally {
      setGlobalStatus('idle');
    }
  }, [items]);

  // ── Step 3: Create draft for one item ──────────────────────────────

  const createDraft = useCallback(async (id) => {
    const item = items.find(it => it.id === id);
    if (!item || !item.extract) return;

    updateItem(id, { status: 'creating', error: null });

    try {
      const data = item.extract?.data || {};
      const dates = data.dates || {};

      // Build payload matching CreateFromExtractRequest schema exactly
      const payload = {
        confirm_non_destructive: true,
        idempotency_key: `bulk_${item.id}_${Date.now()}`,
        extract_version: 'v2',
        extract: {
          title: data.title || data.contract_title || item.filename.replace(/\.pdf$/i, ''),
          type: (['recording', 'publishing', 'license', 'other', 'unknown'].includes(String(data.type || '').toLowerCase()))
            ? String(data.type).toLowerCase()
            : 'unknown',
          dates: {
            contract_date: normalizeDate(dates.contract_date),
            effective_date: normalizeDate(dates.effective_date || data.effective_date || data.start_date),
            end_date: normalizeDate(dates.end_date || dates.expiration_date || data.end_date),
            end_date_specified: Boolean(dates.end_date_specified || dates.end_date || dates.expiration_date || data.end_date),
          },
          key_terms: {
            territory: item.terms?.territory !== undefined ? item.terms.territory : (data.key_terms?.territory || data.territory || null),
            governing_law: item.terms?.governing_law !== undefined ? item.terms.governing_law : (data.key_terms?.governing_law || null),
            term_text: item.terms?.term_text !== undefined ? item.terms.term_text : (data.key_terms?.term_text || null),
            renewal_text: item.terms?.renewal_text !== undefined ? item.terms.renewal_text : (data.key_terms?.renewal_text || null),
          },
        },
        track_ids: (item.trackIds || []).map(Number).filter(n => n > 0),
        create_parties: true,
        party_links: (item.parties || []).map(p => {
          if (p.entity_id && p.entity_type && p.entity_type !== 'external') {
            // DB-linked party (artist, org, individual)
            return {
              role: p.role || 'other',
              entity_type: p.entity_type,
              entity_id: Number(p.entity_id),
              split_percent: p.split_percent ?? null,
            };
          }
          // External / unmatched party
          return {
            role: p.role || 'other',
            entity_type: 'external',
            external_name: p.display_name || p.extracted_name || 'Unknown Party',
            split_percent: p.split_percent ?? null,
          };
        }),
      };

      const form = new FormData();
      form.append('payload', JSON.stringify(payload));
      form.append('file', item.file, item.filename);

      const resp = await contractsBulkClient.createFromExtract(form);
      const contractId = resp?.contract?.id ?? resp?.contract_id;

      if (!contractId) throw new Error('No contract_id returned');

      updateItem(id, {
        status: 'created',
        contractId: Number(contractId),
        documentId: Number(resp?.document?.id ?? 0),
        completeness: resp?.completeness || null,
        error: null,
      });
    } catch (err) {
      updateItem(id, {
        status: 'error',
        error: err?.response?.data?.detail || err.message || 'Create failed',
      });
    }
  }, [items, updateItem]);

  // ── Step 3b: Create all extracted drafts ────────────────────────────

  const createAllDrafts = useCallback(async () => {
    const ready = items.filter(it => it.status === 'extracted');
    if (!ready.length) {
      setBanner({ type: 'error', message: 'No extracted items ready for draft creation.' });
      return;
    }

    setGlobalStatus('creating');
    setBanner({ type: 'success', message: `Creating ${ready.length} draft(s)...` });

    let ok = 0;
    let fail = 0;
    for (const item of ready) {
      try {
        await createDraft(item.id);
        ok++;
      } catch {
        fail++;
      }
    }

    setGlobalStatus('idle');
    setBanner({
      type: fail > 0 ? 'error' : 'success',
      message: `Created ${ok} draft(s)${fail > 0 ? `, ${fail} failed` : ''}.`,
    });
  }, [items, createDraft]);

  // ── Post-creation: save tracks / parties ───────────────────────────

  const saveTracks = useCallback(async (id) => {
    const item = items.find(it => it.id === id);
    if (!item?.contractId) return;

    try {
      const resp = await contractsBulkClient.batchSetTracks(item.contractId, {
        confirm_non_destructive: true,
        track_ids: item.trackIds || [],
      });
      updateItem(id, { completeness: resp?.completeness || item.completeness });
      setBanner({ type: 'success', message: 'Tracks saved.' });
    } catch (err) {
      setBanner({ type: 'error', message: `Save tracks failed: ${err.message}` });
    }
  }, [items, updateItem]);

  const saveParties = useCallback(async (id) => {
    const item = items.find(it => it.id === id);
    if (!item?.contractId) return;

    try {
      const normalizedParties = (item.parties || [])
        .filter(p => p.entity_id && p.entity_type && p.entity_type !== 'external')
        .map(p => ({
          role: p.role || 'other',
          entity_type: p.entity_type,
          entity_id: Number(p.entity_id),
          split_percent: p.split_percent ?? null,
        }));
      const resp = await contractsBulkClient.batchSetParties(item.contractId, {
        confirm_non_destructive: true,
        items: normalizedParties,
      });
      updateItem(id, { completeness: resp?.completeness || item.completeness });
      setBanner({ type: 'success', message: 'Parties saved.' });
    } catch (err) {
      setBanner({ type: 'error', message: `Save parties failed: ${err.message}` });
    }
  }, [items, updateItem]);

  const saveTerms = useCallback(async (id) => {
    const item = items.find(it => it.id === id);
    if (!item?.contractId) return;

    try {
      // Need to import contractService at top or just use api.put directly? 
      // Actually let's use the standard contract update via api.
      const payload = {
        key_terms: {
          territory: item.terms?.territory || null,
          governing_law: item.terms?.governing_law || null,
          term_text: item.terms?.term_text || null,
          renewal_text: item.terms?.renewal_text || null,
        }
      };

      const { default: contractService } = await import('../../services/contractService.js');
      await contractService.update(item.contractId, payload);

      setBanner({ type: 'success', message: 'Terms saved.' });
    } catch (err) {
      setBanner({ type: 'error', message: `Save terms failed: ${err.message}` });
    }
  }, [items]);

  // ── Counts ─────────────────────────────────────────────────────────

  const counts = {
    total: items.length,
    idle: items.filter(it => it.status === 'idle').length,
    extracted: items.filter(it => it.status === 'extracted').length,
    created: items.filter(it => it.status === 'created').length,
    errors: items.filter(it => it.status === 'error').length,
  };

  const isBusy = globalStatus !== 'idle';

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="contracts-shell">
      <header className="contracts-header">
        <div>
          <p className="breadcrumb">Administration of Works ▸ Bulk Processing</p>
          <h1>Bulk Processing</h1>
        </div>
      </header>

      {/* Banner */}
      {banner && (
        <div
          className={banner.type === 'error' ? 'error-banner' : 'success-banner'}
          style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}
        >
          {banner.message}
          <button
            type="button"
            onClick={() => setBanner(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 16 }}>
        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="strong">Files</div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={onFilesChosen}
            style={{ fontSize: 13 }}
          />

          {/* Stats */}
          {items.length > 0 && (
            <div className="small muted" style={{ lineHeight: 1.6 }}>
              {counts.total} file(s) ·
              {counts.extracted > 0 && ` ${counts.extracted} extracted ·`}
              {counts.created > 0 && ` ${counts.created} created ·`}
              {counts.errors > 0 && ` ${counts.errors} error(s)`}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              className="btn orange"
              disabled={isBusy || counts.idle === 0}
              onClick={extractAll}
            >
              {globalStatus === 'extracting' ? 'Extracting...' : `Extract All (${counts.idle})`}
            </button>

            <button
              type="button"
              className="btn"
              style={{ background: '#15803d', color: '#fff' }}
              disabled={isBusy || counts.extracted === 0}
              onClick={createAllDrafts}
            >
              {globalStatus === 'creating' ? 'Creating...' : `Create All Drafts (${counts.extracted})`}
            </button>

            {items.length > 0 && (
              <button type="button" className="ghost-btn small" onClick={clearAll} disabled={isBusy}>
                Clear All
              </button>
            )}
          </div>

          {/* File list */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            {items.length === 0 && (
              <div className="small muted" style={{ padding: 16, textAlign: 'center' }}>
                Select PDF files to begin.
              </div>
            )}
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid #f1f5f9',
                  background: selectedId === item.id ? '#f0f9ff' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', fontSize: 13,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {item.filename}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background:
                    item.status === 'created' ? '#dcfce7' :
                      item.status === 'extracted' ? '#dbeafe' :
                        item.status === 'extracting' || item.status === 'creating' ? '#fef3c7' :
                          item.status === 'error' ? '#fee2e2' : '#f1f5f9',
                  color:
                    item.status === 'created' ? '#15803d' :
                      item.status === 'extracted' ? '#1d4ed8' :
                        item.status === 'error' ? '#b91c1c' : '#64748b',
                }}>
                  {item.status === 'extracting' ? '⏳' :
                    item.status === 'creating' ? '⏳' :
                      item.status === 'extracted' ? '✓ Extracted' :
                        item.status === 'created' ? '✓ Created' :
                          item.status === 'error' ? '✗ Error' : 'Ready'}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Detail Panel ────────────────────────────── */}
        <main style={{ minWidth: 0 }}>
          {!selectedItem && items.length === 0 && (
            <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
              <div className="strong" style={{ fontSize: 18, marginBottom: 8 }}>Upload Contract PDFs</div>
              <div className="muted">Select PDF files from the sidebar to begin bulk processing.</div>
              <div className="muted small" style={{ marginTop: 16, lineHeight: 1.8 }}>
                1. Upload PDFs → 2. Extract (AI auto-maps tracks + parties) → 3. Review & Fix → 4. Create Drafts
              </div>
            </div>
          )}

          {!selectedItem && items.length > 0 && (
            <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
              <div className="muted">Select a file from the sidebar to view details.</div>
            </div>
          )}

          {selectedItem && (
            <BulkContractCard
              key={selectedItem.id}
              item={selectedItem}
              onUpdateTracks={(trackIds) => updateItem(selectedItem.id, { trackIds })}
              onUpdateParties={(parties) => updateItem(selectedItem.id, { parties })}
              onUpdateTerms={(terms) => updateItem(selectedItem.id, { terms })}
              onCreateDraft={() => createDraft(selectedItem.id)}
              onSaveTracks={() => saveTracks(selectedItem.id)}
              onSaveParties={() => saveParties(selectedItem.id)}
              onSaveTerms={() => saveTerms(selectedItem.id)}
              onRemove={() => removeItem(selectedItem.id)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
