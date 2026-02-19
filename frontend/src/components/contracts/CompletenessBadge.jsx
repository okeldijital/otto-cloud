import React from 'react';

function normalizeStatus(completeness) {
  if (!completeness) return 'red';
  if (completeness.status) return String(completeness.status).toLowerCase();
  if (completeness.status_quo) return String(completeness.status_quo).toLowerCase();
  return 'red';
}

function labelFor(status) {
  if (status === 'green') return 'GREEN';
  if (status === 'amber') return 'AMBER';
  return 'RED';
}

function reasonsToHuman(missing = []) {
  const map = {
    parties_missing: 'Missing parties',
    missing_parties: 'Missing parties',
    tracks_missing: 'Missing track links',
    missing_tracks: 'Missing track links',
    document_missing: 'Missing document',
    missing_document: 'Missing document',
    dates_missing: 'Missing dates',
    missing_dates_optional: 'Missing dates',
    overview_missing: 'Missing overview metadata',
    missing_terms_optional: 'Missing terms',
    missing_splits_optional: 'Missing splits',
  };
  return missing.map((k) => map[k] || k);
}

export default function CompletenessBadge({ completeness }) {
  if (!completeness) return null;

  const status = normalizeStatus(completeness);
  const score = Number(completeness.score || 0);
  const missing = Array.isArray(completeness.missing)
    ? completeness.missing
    : Array.isArray(completeness.reasons)
      ? completeness.reasons
      : [];

  const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 12,
    fontWeight: 600,
  };

  const dotStyle = {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: status === 'green' ? '#22c55e' : status === 'amber' ? '#f59e0b' : '#ef4444',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={pillStyle} title={reasonsToHuman(missing).join(' • ')}>
        <span style={dotStyle} />
        <span>{labelFor(status)}</span>
        <span style={{ opacity: 0.7 }}>{score}%</span>
      </div>

      {missing.length > 0 && (
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {reasonsToHuman(missing).slice(0, 3).join(' • ')}
          {missing.length > 3 ? ' • …' : ''}
        </div>
      )}
    </div>
  );
}
