import React, { useState, useCallback, useRef } from 'react';
import contractsBulkClient from '../../api/contractsBulkClient';
import BulkContractCard from '../../components/contracts/BulkContractCard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { X } from 'lucide-react';

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
    status: 'idle',
    extract: null,
    trackIds: [],
    parties: [],
    contractId: null,
    documentId: null,
    completeness: null,
    terms: {},
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

  // ── Step 2: Extraction ─────────────────────────────────────────────

  const extractItem = useCallback(async (id) => {
    const item = items.find(it => it.id === id);
    if (!item || item.status !== 'idle') return;

    updateItem(id, { status: 'extracting', error: null });

    try {
      const formData = new FormData();
      formData.append('file', item.file);

      const resp = await contractsBulkClient.extractBulk(formData);
      // Since our extractBulk is immediate in this version of the backend (per typical local Electron apps)
      // we handle the response directly. If it was async, we'd poll.
      
      const extractData = resp.results?.[0] || resp;
      
      updateItem(id, {
        status: 'extracted',
        extract: extractData,
        trackIds: extractData.data?.suggested_track_ids || [],
        parties: extractData.data?.suggested_party_links || [],
        terms: {
          term_text: extractData.data?.key_terms?.term_text || null,
          territory: extractData.data?.key_terms?.territory || null,
          governing_law: extractData.data?.key_terms?.governing_law || null,
          renewal_text: extractData.data?.key_terms?.renewal_text || null,
        }
      });
    } catch (err) {
      updateItem(id, {
        status: 'error',
        error: err.message || 'Extraction failed'
      });
    }
  }, [items, updateItem]);

  const extractAll = useCallback(async () => {
    const idle = items.filter(it => it.status === 'idle');
    if (!idle.length) return;

    setGlobalStatus('extracting');
    for (const item of idle) {
      await extractItem(item.id);
    }
    setGlobalStatus('idle');
  }, [items, extractItem]);


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
    <div className="flex flex-col h-full">
      <PageHeader
        title="Bulk Processing"
        subtitle="Administration of Works ▸ Bulk Processing"
      />

      {/* Banner */}
      {banner && (
        <div className={`mb-md px-md py-3 rounded-lg flex items-center justify-between border ${
          banner.type === 'error' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-success/10 border-success/20 text-success'
        }`}>
          <div className="text-sm font-medium">{banner.message}</div>
          <button type="button" onClick={() => setBanner(null)} className="p-1 hover:bg-black/5 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-[320px_1fr] gap-md flex-1 min-h-0">
        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="panel flex flex-col gap-md p-md overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Queue</span>
            {items.length > 0 && (
               <button type="button" onClick={clearAll} className="text-[10px] font-bold text-danger uppercase hover:underline">Clear</button>
            )}
          </div>

          <label className="flex flex-col items-center justify-center p-md border-2 border-dashed border-border rounded-xl hover:border-accent/50 transition-colors cursor-pointer bg-surface-elevated/10">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={onFilesChosen}
              className="hidden"
            />
            <div className="text-accent mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div className="text-xs font-semibold text-text-primary">Upload PDFs</div>
            <div className="text-[10px] text-text-secondary mt-1">Drag & drop files here</div>
          </label>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              disabled={isBusy || counts.idle === 0}
              onClick={extractAll}
              fullWidth
            >
              {globalStatus === 'extracting' ? 'Extracting...' : `Extract All (${counts.idle})`}
            </Button>

            <Button
              variant="secondary"
              disabled={isBusy || counts.extracted === 0}
              onClick={createAllDrafts}
              fullWidth
            >
              {globalStatus === 'creating' ? 'Creating...' : `Create Drafts (${counts.extracted})`}
            </Button>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto border border-border rounded-xl bg-surface-elevated/5">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-xl text-center">
                <div className="text-text-secondary opacity-20 mb-2">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div className="text-xs text-text-secondary">No files in queue</div>
              </div>
            )}
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full flex flex-col gap-1 p-3 text-left border-b border-border transition-colors hover:bg-surface-elevated/30 ${selectedId === item.id ? 'bg-surface-elevated border-l-2 border-l-accent' : 'bg-transparent'}`}
              >
                <div className="text-[11px] font-semibold text-text-primary truncate w-full">
                  {item.filename}
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      item.status === 'created' ? 'success' :
                      item.status === 'extracted' ? 'primary' :
                      item.status === 'error' ? 'critical' :
                      item.status === 'idle' ? 'neutral' : 'warn'
                    }
                    size="sm"
                  >
                    {item.status === 'extracting' ? 'Extracting...' :
                      item.status === 'creating' ? 'Creating...' :
                      item.status === 'extracted' ? 'Extracted' :
                      item.status === 'created' ? 'Created' :
                      item.status === 'error' ? 'Error' : 'Ready'}
                  </Badge>
                  {item.completeness && (
                    <div className="text-[10px] font-bold text-accent">{item.completeness}%</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Detail Panel ────────────────────────────── */}
        <main className="min-w-0 overflow-y-auto pr-2">
          {!selectedItem && (
            <div className="panel h-full flex flex-col items-center justify-center p-xl text-center">
              <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mb-md text-text-secondary/30">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Process Documents</h2>
              <p className="text-sm text-text-secondary max-w-sm">
                Select a file from the queue to review extraction results and prepare draft contracts.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-xl text-left max-w-lg w-full">
                <div className="p-4 rounded-xl bg-surface-elevated/20 border border-border">
                  <div className="text-accent font-bold mb-1">1. Upload</div>
                  <div className="text-xs text-text-secondary leading-relaxed">Add PDF contracts to the processing queue.</div>
                </div>
                <div className="p-4 rounded-xl bg-surface-elevated/20 border border-border">
                  <div className="text-accent font-bold mb-1">2. Extract</div>
                  <div className="text-xs text-text-secondary leading-relaxed">AI analyzes terms, tracks, and parties.</div>
                </div>
                <div className="p-4 rounded-xl bg-surface-elevated/20 border border-border">
                  <div className="text-accent font-bold mb-1">3. Review</div>
                  <div className="text-xs text-text-secondary leading-relaxed">Fix mappings and verify auto-matched data.</div>
                </div>
                <div className="p-4 rounded-xl bg-surface-elevated/20 border border-border">
                  <div className="text-accent font-bold mb-1">4. Commit</div>
                  <div className="text-xs text-text-secondary leading-relaxed">Generate draft contracts in the DB.</div>
                </div>
              </div>
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
