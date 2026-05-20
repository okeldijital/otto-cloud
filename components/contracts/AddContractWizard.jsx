import React, { useEffect, useState } from 'react';
import contractsWizardClient from '../../api/contractsWizardClient';
import aiTrackMappingClient from '../../api/aiTrackMappingClient';
import { CatalogService } from '../../services/catalog';
import ExtractPreviewSections from './ExtractPreviewSections';
import TrackMultiSelect from './TrackMultiSelect';

export default function AddContractWizard({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorId, setErrorId] = useState('');
  const [extraction, setExtraction] = useState(null);
  const [created, setCreated] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [mapResult, setMapResult] = useState(null);
  const [form, setForm] = useState({
    contract_type: 'Other',
    status: 'Draft',
    user_overrides: { title: '', start_date: null, end_date: null },
  });

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    CatalogService.getAll('tracks', { limit: 2000 })
      .then((rows) => {
        if (!alive) return;
        setTracks(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!alive) return;
        setTracks([]);
      });

    return () => {
      alive = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const reset = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setError('');
    setErrorId('');
    setExtraction(null);
    setCreated(null);
    setSelectedTrackIds([]);
    setMapLoading(false);
    setMapError('');
    setMapResult(null);
    setForm({ contract_type: 'Other', status: 'Draft', user_overrides: { title: '', start_date: null, end_date: null } });
    onClose?.();
  };

  const runExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await contractsWizardClient.extract(file);
      const dates = data?.dates || {};
      setExtraction(data);
      setMapResult(null);
      setMapError('');
      setSelectedTrackIds([]);
      setForm((prev) => ({
        ...prev,
        user_overrides: {
          ...prev.user_overrides,
          title: data.contract_title || file.name.replace(/\.pdf$/i, ''),
          start_date: dates.start_date || dates.effective_date || dates.contract_date || data.contract_date || data.effective_date || data.start_date || null,
          end_date: dates.end_date || dates.expiration_date || data.expiration_date || data.end_date || null,
        },
      }));
      setStep(3);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(
        (typeof detail === 'string' ? detail : detail?.detail) ||
        e.message ||
        'Extraction failed'
      );
      setErrorId(typeof detail === 'object' ? detail?.error_id || '' : '');
    } finally {
      setLoading(false);
    }
  };

  const runTrackMapPlan = async () => {
    if (!extraction) return;
    setMapLoading(true);
    setMapError('');
    try {
      const extractV2 = {
        contract_title: extraction.contract_title || null,
        tracks: extraction.tracks || [],
        warnings: extraction.warnings || [],
      };
      const result = await aiTrackMappingClient.trackMapPlan({
        contract_extract_v2: extractV2,
        track_ids_hint: selectedTrackIds,
        max_results: 20,
      });
      if (result?.featureDisabled) {
        setMapError('Track mapping is disabled by feature flags.');
        setMapResult(null);
      } else {
        setMapResult(result);
        const suggested = [];
        for (const row of result?.candidates || []) {
          const top = (row.matches || [])[0];
          if (top?.track?.id) suggested.push(Number(top.track.id));
        }
        if (suggested.length) {
          setSelectedTrackIds((prev) => Array.from(new Set([...(prev || []), ...suggested])));
        }
      }
    } catch (e) {
      setMapError(e?.response?.data?.detail || e?.message || 'Track map plan failed');
      setMapResult(null);
    } finally {
      setMapLoading(false);
    }
  };

  const createContract = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const extractPayload = extraction
        ? {
          title: extraction.contract_title || form.user_overrides.title || file.name.replace(/\\.pdf$/i, ''),
          type: extraction.contract_type || form.contract_type?.toLowerCase() || 'other',
          dates: {
            contract_date: extraction.contract_date || null,
            effective_date: extraction.effective_date || extraction.dates?.effective_date || null,
            end_date: extraction.end_date || extraction.dates?.end_date || null,
            end_date_specified: Boolean(extraction.dates?.end_date_specified || extraction.end_date),
          },
          key_terms: extraction.key_terms || {},
        }
        : {};
      const payload = {
        ...form,
        type: form.contract_type,
        track_ids: selectedTrackIds,
        confirm_non_destructive: true,
        idempotency_key: `sha256:${file.name}:${file.size}:${file.lastModified}`,
        extract_version: 'v2',
        extract: extractPayload,
      };
      const result = await contractsWizardClient.createFromExtract(file, payload);
      setCreated(result);
      setStep(5);
      onCreated?.(result);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(
        (typeof detail === 'string' ? detail : detail?.detail) ||
        e.message ||
        'Create failed'
      );
      setErrorId(typeof detail === 'object' ? detail?.error_id || '' : '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={reset}>
      <div
        className="entity-form-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 980, maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div className="entity-form-header">
          <h2>Add Contract Wizard</h2>
          <button className="btn ghost" onClick={reset}>Close</button>
        </div>
        <div className="warning-banner" style={{ marginBottom: 10 }}>
          Non-destructive mode: review extraction + mapping first. No core overwrite happens in this step.
        </div>
        {error && (
          <div className="error-banner" style={{ marginBottom: 8 }}>
            {error}
            {errorId ? <div className="small mono">error_id: {errorId}</div> : null}
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="form-group">
              <label>Upload Contract PDF</label>
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <button className="btn orange" disabled={!file || loading} onClick={runExtract}>
              {loading ? 'Extracting...' : 'Extract & Prefill'}
            </button>
          </div>
        )}

        {step >= 3 && extraction && (
          <>
            {!!((extraction.warnings || []).length || (extraction.errors || []).length) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {(extraction.warnings || []).map((w, idx) => (
                  <span key={idx} className="status-badge amber" style={{ fontSize: 12 }}>{w}</span>
                ))}
                {(extraction.errors || []).map((w, idx) => (
                  <span key={`err-${idx}`} className="status-badge danger" style={{ fontSize: 12 }}>{w}</span>
                ))}
              </div>
            )}
            <ExtractPreviewSections extract={{ data: extraction }} />

            <TrackMultiSelect tracks={tracks} selectedIds={selectedTrackIds} onChange={setSelectedTrackIds} />

            <div style={{ marginBottom: 10 }}>
              <button className="btn" disabled={mapLoading} onClick={runTrackMapPlan}>
                {mapLoading ? 'Mapping...' : 'Auto-match from extract'}
              </button>
            </div>

            {!!mapError && <div className="error-banner" style={{ marginBottom: 8 }}>{mapError}</div>}
            {!!mapResult && (
              <div className="panel" style={{ marginBottom: 10, padding: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Suggested matches</div>
                {(mapResult.candidates || []).map((row, idx) => (
                  <div key={idx} className="small" style={{ marginBottom: 4 }}>
                    {row.extract_track?.raw_mention || '-'}: {row.matches?.[0]?.track?.title || 'No match'}
                  </div>
                ))}
                {!!(mapResult.missing_tracks || []).length && (
                  <div className="warning-banner" style={{ marginTop: 8 }}>
                    Missing tracks: {(mapResult.missing_tracks || []).join(', ')}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
              <div className="form-group">
                <label>Title</label>
                <input className="input" value={form.user_overrides?.title || ''} onChange={(e) => setForm(prev => ({ ...prev, user_overrides: { ...prev.user_overrides, title: e.target.value } }))} />
              </div>
            </div>
            <div className="muted small" style={{ marginBottom: 8 }}>
              {form.user_overrides.start_date ? `Start date prefilled: ${form.user_overrides.start_date}` : 'Start date: Not specified'}
              {' | '}
              {form.user_overrides.end_date ? `End date prefilled: ${form.user_overrides.end_date}` : 'No end date specified'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setStep(1)}>Back</button>
              <button className="btn orange" disabled={loading || !form.user_overrides.title} onClick={createContract}>
                {loading ? 'Creating...' : 'Create Contract'}
              </button>
            </div>
          </>
        )}

        {step === 5 && created && (
          <div className="success-banner" style={{ marginTop: 10 }}>
            Contract created: #{created.contract?.id || created.contract_id} ({created.contract?.title || created.title}).
            Track links: {created.links?.tracks_linked ?? created.linked_tracks_count ?? 0}.
          </div>
        )}
      </div>
    </div>
  );
}
