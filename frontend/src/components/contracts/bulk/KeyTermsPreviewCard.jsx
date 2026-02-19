import React from 'react';

export default function KeyTermsPreviewCard({ extract }) {
  const terms = extract?.data?.key_terms || {};
  return (
    <div className="panel" style={{ padding: 10, marginBottom: 10 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Key Terms</div>
      <div className="small">Territory: {terms.territory || '—'}</div>
      <div className="small">Term: {terms.term_text || '—'}</div>
      <div className="small">Exclusivity: {terms.exclusivity || '—'}</div>
      <div className="small">Governing law: {terms.governing_law || '—'}</div>
      <div className="small">Grant: {terms.grant_of_rights || '—'}</div>
    </div>
  );
}
