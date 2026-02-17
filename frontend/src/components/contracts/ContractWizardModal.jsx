import React, { useMemo, useState } from 'react';
import contractWizardClient from '../../api/contractWizardClient';

const STEP_LABELS = [
  'Upload PDF',
  'Extraction Review',
  'Create Contract',
  'Attach Release',
  'Diff & Flags',
  'Apply',
];

function NonDestructiveBanner() {
  return (
    <div className="warning-banner" style={{ marginBottom: 12 }}>
      Non-destructive mode: this workflow stores AI linkage records only until explicit apply.
    </div>
  );
}

export default function ContractWizardModal({ isOpen, onClose, releases = [], onCreated }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [releaseId, setReleaseId] = useState('');
  const [plan, setPlan] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [ack, setAck] = useState(false);
  const [overwriteTerritory, setOverwriteTerritory] = useState(false);

  const [form, setForm] = useState({
    title: '',
    contract_date: '',
    effective_date: '',
    expiration_date: '',
    territory: '',
    notes: '',
  });

  const missingFlags = useMemo(() => plan?.missing_flags || [], [plan]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep(0);
    setFile(null);
    setDraft(null);
    setError('');
    setCreated(null);
    setReleaseId('');
    setPlan(null);
    setApplyResult(null);
    setAck(false);
    setOverwriteTerritory(false);
    onClose?.();
  };

  const runDraft = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await contractWizardClient.createDraft(file);
      setDraft(data);
      setForm((prev) => ({
        ...prev,
        title: data?.suggested_defaults?.title || data?.extraction?.contract_title || '',
        contract_date: data?.extraction?.effective_date || '',
        effective_date: data?.extraction?.effective_date || data?.extraction?.start_date || '',
        expiration_date: data?.extraction?.end_date || '',
        territory: data?.extraction?.territory || '',
      }));
      setStep(1);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Draft extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const createContract = async () => {
    if (!draft?.draft_id) return;
    setLoading(true);
    setError('');
    try {
      const data = await contractWizardClient.createContractFromDraft(draft.draft_id, form);
      setCreated(data);
      setStep(3);
      if (onCreated) onCreated(data);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Contract create failed');
    } finally {
      setLoading(false);
    }
  };

  const runPlan = async () => {
    if (!created?.contract_id || !releaseId) return;
    setLoading(true);
    setError('');
    try {
      const data = await contractWizardClient.planAttach(created.contract_id, releaseId);
      setPlan(data);
      setAck((data?.missing_flags || []).length === 0);
      setStep(4);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Attach plan failed');
    } finally {
      setLoading(false);
    }
  };

  const runApply = async () => {
    if (!created?.contract_id || !releaseId) return;
    setLoading(true);
    setError('');
    try {
      const actions = [
        { type: 'link_release', release_id: Number(releaseId) },
        ...((plan?.diff?.parties?.matches || []).map((m) => ({
          type: 'link_party',
          party_display_name: m.contract,
          entity_id: null,
        }))),
        ...((plan?.diff?.parties?.unmatched || []).map((m) => ({
          type: 'ignore_party',
          party_display_name: m.contract,
        }))),
      ];
      const data = await contractWizardClient.applyAttach(created.contract_id, {
        release_id: Number(releaseId),
        confirm: true,
        overwrite: { territory: overwriteTerritory, splits: false },
        actions,
      });
      setApplyResult(data);
      setStep(5);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Attach apply failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <div className="entity-form-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div className="entity-form-header">
          <h2>Add New Contract Wizard</h2>
          <button className="btn ghost" onClick={resetAndClose}>Close</button>
        </div>
        <div className="muted" style={{ marginBottom: 8 }}>
          Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
        </div>
        <NonDestructiveBanner />
        {error && <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>}

        {step === 0 && (
          <div>
            <div className="form-group">
              <label>Contract PDF</label>
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <button className="btn orange" disabled={!file || loading} onClick={runDraft}>
              {loading ? 'Extracting...' : 'Extract Draft'}
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="form-group"><label>Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>Contract Date</label><input type="date" className="input" value={form.contract_date || ''} onChange={(e) => setForm({ ...form, contract_date: e.target.value })} /></div>
              <div className="form-group"><label>Effective Date</label><input type="date" className="input" value={form.effective_date || ''} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Expiration Date</label><input type="date" className="input" value={form.expiration_date || ''} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} /></div>
              <div className="form-group"><label>Territory</label><input className="input" value={form.territory || ''} onChange={(e) => setForm({ ...form, territory: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Notes</label><textarea className="input" rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <button className="btn orange" onClick={() => setStep(2)}>Continue</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="muted">Create core Contract row using extracted defaults and your overrides.</p>
            <button className="btn orange" disabled={loading || !form.title} onClick={createContract}>
              {loading ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="success-banner" style={{ marginBottom: 10 }}>
              Contract created: #{created?.contract_id} {created?.title ? `(${created.title})` : ''}
            </div>
            <div className="form-group">
              <label>Select Release (optional)</label>
              <select className="input" value={releaseId} onChange={(e) => setReleaseId(e.target.value)}>
                <option value="">Select a release</option>
                {releases.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={resetAndClose}>Finish</button>
              <button className="btn orange" disabled={!releaseId || loading} onClick={runPlan}>Generate Attach Diff</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            {!!missingFlags.length && (
              <div className="warning-banner" style={{ marginBottom: 8 }}>
                <strong>Missing flags</strong>
                <ul>
                  {missingFlags.map((f, idx) => <li key={idx}>{f.message || f.code}</li>)}
                </ul>
              </div>
            )}
            <div className="panel" style={{ marginBottom: 10 }}>
              <div><strong>Territory Diff:</strong> {plan?.diff?.territory?.current || '—'} -> {plan?.diff?.territory?.contract || '—'}</div>
              <div><strong>Party Matches:</strong> {(plan?.diff?.parties?.matches || []).length}</div>
              <div><strong>Party Unmatched:</strong> {(plan?.diff?.parties?.unmatched || []).length}</div>
            </div>
            <label style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={overwriteTerritory} onChange={(e) => setOverwriteTerritory(e.target.checked)} />
              Allow territory overwrite (default off)
            </label>
            <label style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              I acknowledge missing flags and continue
            </label>
            <button className="btn orange" disabled={!ack || loading} onClick={runApply}>
              {loading ? 'Applying...' : 'Apply Attach'}
            </button>
          </div>
        )}

        {step === 5 && (
          <div>
            <div className="success-banner" style={{ marginBottom: 10 }}>Attach applied successfully.</div>
            <div>Run ID: <strong>{applyResult?.run_id}</strong></div>
            <div>Idempotent hit: <strong>{String(!!applyResult?.idempotent_hit)}</strong></div>
            <div>AI attach runs created: <strong>{applyResult?.ai_tables?.attach_runs ?? 0}</strong></div>
            <div>AI attach links created: <strong>{applyResult?.ai_tables?.attach_links ?? 0}</strong></div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="btn" onClick={resetAndClose}>Close</button>
              {created?.contract_id ? (
                <a className="btn orange" href={`/contracts/${created.contract_id}`}>View Contract</a>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
