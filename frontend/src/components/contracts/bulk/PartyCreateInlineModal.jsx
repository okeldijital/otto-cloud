import React, { useState } from 'react';

export default function PartyCreateInlineModal({ open, onClose, onCreated, createPartyInline }) {
  const [type, setType] = useState('artist');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async () => {
    setError('');
    try {
      const created = await createPartyInline({
        type,
        display_name: displayName,
        email: email || null,
        country: country || null,
      });
      onCreated?.(created);
      onClose?.();
      setDisplayName('');
      setEmail('');
      setCountry('');
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to create party');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="entity-form-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Create Party</h3>
        {error ? <div className="error-banner">{error}</div> : null}
        <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="artist">artist</option>
          <option value="individual">individual</option>
          <option value="organization">organization</option>
        </select>
        <input className="form-control" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input className="form-control" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="form-control" placeholder="Country (optional)" value={country} onChange={(e) => setCountry(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn orange" onClick={submit}>Create</button>
        </div>
      </div>
    </div>
  );
}

