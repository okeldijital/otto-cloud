import React, { useEffect, useState } from 'react';
import contractsWizardClient from '../../api/contractsWizardClient';
import aiReleaseMappingClient from '../../api/aiReleaseMappingClient';
import { CatalogService } from '../../services/catalog';
import ContractExtractPreview from './ContractExtractPreview';
import ContractCreateReviewForm from './ContractCreateReviewForm';
import ReleasePickerInline from './ReleasePickerInline';
import ContractReleaseMapper from './ContractReleaseMapper';

export default function AddContractWizard({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorId, setErrorId] = useState('');
  const [extraction, setExtraction] = useState(null);
  const [created, setCreated] = useState(null);
  const [releases, setReleases] = useState([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState('');
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
    CatalogService.getAll('releases', { limit: 2000 })
      .then((rows) => {
        if (!alive) return;
        setReleases(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!alive) return;
        setReleases([]);
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
    setSelectedReleaseId('');
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

  const runMapPlan = async () => {
    if (!selectedReleaseId || !extraction) return;
    setMapLoading(true);
    setMapError('');
    try {
      const extractV2 = {
        contract_title: extraction.contract_title || null,
        effective_date: extraction.effective_date || extraction?.dates?.effective_date || null,
        expiration_date: extraction.expiration_date || extraction?.dates?.expiration_date || extraction.end_date || null,
        expiration_label:
          extraction.expiration_date || extraction?.dates?.expiration_date || extraction.end_date
            ? 'date_specified'
            : 'no_end_date_specified',
        parties: (extraction.parties || []).map((p) => ({
          display_name: p.display_name || p.name || '',
          role: p.role || null,
          confidence: Number(p.confidence || 0),
        })),
        splits: (extraction.splits || []).map((s) => ({
          split_type: s.split_type || s.scope || 'OTHER',
          party_display_name: s.party_display_name || s.party_name || null,
          percent: Number(s.percent || 0),
          basis: s.basis || null,
          notes: s.notes || null,
        })),
        terms: Array.isArray(extraction.terms)
          ? extraction.terms.map((t) => ({ term_type: t.term_type || 'other', text: t.text || t.summary || '' }))
          : Object.entries(extraction.terms || {})
              .filter(([, v]) => !!v)
              .map(([k, v]) => ({ term_type: k, text: String(v) })),
        tracks: Array.isArray(extraction.tracks_mentioned)
          ? extraction.tracks_mentioned.map((t) => ({ title: t.title || '', artist: null, confidence: Number(t.confidence || 0) }))
          : (extraction.tracks || []).map((title) => ({ title, artist: null, confidence: 0.6 })),
        warnings: extraction.warnings || [],
        raw_confidence: Number(extraction.raw_confidence || 0),
        parser_version: extraction.parser_version || null,
      };

      const result = await aiReleaseMappingClient.mapPlan(Number(selectedReleaseId), extractV2);
      if (result?.featureDisabled) {
        setMapError('Release mapping is disabled by feature flags.');
        setMapResult(null);
      } else {
        setMapResult(result);
      }
    } catch (e) {
      setMapError(e?.response?.data?.detail || e?.message || 'Release map plan failed');
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
      const result = await contractsWizardClient.createFromExtract(file, form);
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
            <ContractExtractPreview extraction={extraction} />

            <ReleasePickerInline
              releases={releases}
              value={selectedReleaseId}
              onChange={(value) => {
                setSelectedReleaseId(value);
                setMapResult(null);
                setMapError('');
              }}
            />

            <div style={{ marginBottom: 10 }}>
              <button className="btn" disabled={!selectedReleaseId || mapLoading} onClick={runMapPlan}>
                {mapLoading ? 'Mapping...' : 'Map to Release'}
              </button>
            </div>

            <ContractReleaseMapper result={mapResult} loading={mapLoading} error={mapError} />

            <ContractCreateReviewForm form={form} setForm={setForm} />
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
            Contract created: #{created.contract_id} ({created.title}). PDF asset #{created.pdf_asset_id} attached.
          </div>
        )}
      </div>
    </div>
  );
}
