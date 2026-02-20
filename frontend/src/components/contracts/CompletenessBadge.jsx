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
  };
  return missing
    .filter(k => map[k])
    .map((k) => map[k]);
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

  const colors = {
    green: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#15803d', dot: '#22c55e' },
    amber: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#b45309', dot: '#f59e0b' },
    red: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#b91c1c', dot: '#ef4444' },
  };

  const theme = colors[status] || colors.red;

  const pillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 12px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 11,
    letterSpacing: '0.05em',
    fontWeight: 800,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  };

  const dotStyle = {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: theme.dot,
    boxShadow: `0 0 6px ${theme.dot}`,
  };

  const missingDisplay = reasonsToHuman(missing);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <div style={pillStyle} title={missingDisplay.join(' • ')}>
        <span style={dotStyle} />
        <span>{labelFor(status)}</span>
        <span style={{ borderLeft: `1px solid ${theme.border}`, marginLeft: 4, paddingLeft: 8 }}>{score}%</span>
      </div>

      {missingDisplay.length > 0 && (
        <div className="small muted" style={{ fontSize: 10, textAlign: 'right' }}>
          {missingDisplay.slice(0, 2).join(' • ')}
          {missingDisplay.length > 2 ? ` +${missingDisplay.length - 2}` : ''}
        </div>
      )}
    </div>
  );
}
