import React from 'react';

const TYPES = ['Recording', 'Publishing', 'Remix', 'Master', 'Other'];
const STATUSES = ['Draft', 'Active', 'Expired'];

export default function ContractCreateReviewForm({ form, setForm }) {
  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <h4 style={{ marginTop: 0 }}>Review & Edit</h4>
      <div className="form-group">
        <label>Title</label>
        <input className="input" value={form.user_overrides.title || ''} onChange={(e) => setForm({ ...form, user_overrides: { ...form.user_overrides, title: e.target.value } })} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Type</label>
          <select className="input" value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Start Date</label>
          <input type="date" className="input" value={form.user_overrides.start_date || ''} onChange={(e) => setForm({ ...form, user_overrides: { ...form.user_overrides, start_date: e.target.value || null } })} />
        </div>
        <div className="form-group">
          <label>End Date</label>
          <input type="date" className="input" value={form.user_overrides.end_date || ''} onChange={(e) => setForm({ ...form, user_overrides: { ...form.user_overrides, end_date: e.target.value || null } })} />
        </div>
      </div>
    </div>
  );
}
