import React, { useState } from 'react';
import contractsWizardClient from '../../api/contractsWizardClient';
import ContractExtractPreview from './ContractExtractPreview';
import ContractCreateReviewForm from './ContractCreateReviewForm';

export default function AddContractWizard({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorId, setErrorId] = useState('');
  const [extraction, setExtraction] = useState(null);
  const [created, setCreated] = useState(null);
  const [form, setForm] = useState({
    contract_type: 'Other',
    status: 'Draft',
    user_overrides: { title: '', start_date: null, end_date: null },
  });

  if (!isOpen) return null;

  const reset = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setError('');
    setErrorId('');
    setExtraction(null);
    setCreated(null);
    setForm({ contract_type: 'Other', status: 'Draft', user_overrides: { title: '', start_date: null, end_date: null } });
    onClose?.();
  };

  const runExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await contractsWizardClient.extract(file);
      setExtraction(data);
      setForm((prev) => ({
        ...prev,
        user_overrides: {
          ...prev.user_overrides,
          title: data.contract_title || file.name.replace(/\.pdf$/i, ''),
          start_date: data.contract_date || data.effective_date || data.start_date || null,
          end_date: data.expiration_date || data.end_date || null,
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
      <div className="entity-form-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860 }}>
        <div className="entity-form-header">
          <h2>Add Contract Wizard</h2>
          <button className="btn ghost" onClick={reset}>Close</button>
        </div>
        <div className="warning-banner" style={{ marginBottom: 10 }}>
          Non-destructive mode: this step creates a new contract + attached PDF only.
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
            <ContractExtractPreview extraction={extraction} />
            <ContractCreateReviewForm form={form} setForm={setForm} />
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
