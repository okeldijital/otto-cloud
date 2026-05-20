import React, { useState } from 'react';
import TrackMultiSelect from './TrackMultiSelect';
import CompletenessBadge from './CompletenessBadge';
import PartyMultiAssign from './PartyMultiAssign';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import CreatePartyModal from './CreatePartyModal';
import { ExternalLink, Trash2, FileText, Users, Music, AlertCircle } from 'lucide-react';

export default function BulkContractCard({
  item,
  onUpdateTracks,
  onUpdateParties,
  onUpdateTerms,
  onCreateDraft,
  onSaveTracks,
  onSaveParties,
  onSaveTerms,
  onRemove,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialName, setModalInitialName] = useState('');

  if (!item) return null;

  const data = item.extract?.data || {};
  let title = data.title || data.contract_title;
  if (!title) title = item.filename;
  const extractedParties = Array.isArray(data.parties) ? data.parties : [];
  const isCreated = Boolean(item.contractId);
  const isBusy = item.status === 'extracting' || item.status === 'creating';

  const trackMatches = Array.isArray(data.suggested_track_matches) ? data.suggested_track_matches : [];
  const matchedCount = trackMatches.filter(m => m.track_id).length;
  const unmatchedCount = trackMatches.filter(m => !m.track_id).length;

  const handleCreateGroup = (name) => {
    setModalInitialName(name);
    setIsModalOpen(true);
  };

  return (
    <div className="panel p-xl flex flex-col gap-xl bg-surface border border-border rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-normal">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex justify-between items-start gap-md">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-accent" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Contract Document</span>
          </div>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight leading-tight">{title}</h2>
          <div className="text-xs text-text-secondary mt-1 font-mono opacity-60">{item.filename}</div>
          {isCreated && (
            <div className="flex items-center gap-2 mt-3 text-success font-bold text-xs bg-success/10 px-3 py-1.5 rounded-full w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              Draft Created · Contract #{item.contractId}
            </div>
          )}
        </div>
        {item.completeness && <CompletenessBadge completeness={item.completeness} />}
      </div>

      {/* ── Error ─────────────────────────────────────── */}
      {item.error && (
        <div className="p-md bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-bold mb-1 text-xs uppercase tracking-wider">Processing Error</div>
            {typeof item.error === 'string' ? item.error : item.error.message || JSON.stringify(item.error)}
          </div>
        </div>
      )}

      {/* ── Status: idle ──────────────────────────────── */}
      {item.status === 'idle' && (
        <div className="flex flex-col items-center justify-center p-2xl border-2 border-dashed border-border rounded-2xl bg-surface-elevated/5 text-center">
          <div className="w-12 h-12 bg-surface-elevated rounded-full flex items-center justify-center mb-md text-text-secondary/30">
            <Users size={24} />
          </div>
          <div className="text-sm font-semibold text-text-primary mb-1">Ready for Extraction</div>
          <p className="text-xs text-text-secondary">Click "Extract All" to let AI analyze this document.</p>
        </div>
      )}

      {/* ── Status: extracting ────────────────────────── */}
      {item.status === 'extracting' && (
        <div className="flex flex-col items-center justify-center p-2xl text-center">
          <div className="w-12 h-12 flex items-center justify-center mb-md">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-sm font-bold text-accent mb-1 animate-pulse">Analyzing Document...</div>
          <p className="text-xs text-text-secondary">AI is reading terms and matching artists.</p>
        </div>
      )}

      {/* ── Extraction result ─────────────────────────── */}
      {(item.status === 'extracted' || item.status === 'created' || item.status === 'creating') && item.extract && (
        <div className="flex flex-col gap-xl">
          {/* Auto-match summary */}
          {trackMatches.length > 0 && (
            <div className={`p-md rounded-xl border flex items-center gap-4 ${matchedCount > 0 ? 'bg-success/5 border-success/10' : 'bg-warning/5 border-warning/10'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${matchedCount > 0 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                <Music size={20} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-text-primary uppercase tracking-wider mb-0.5">AI Auto-Match Results</div>
                <div className="text-sm">
                  {matchedCount > 0 && <span className="font-bold text-success">{matchedCount} tracks found</span>}
                  {matchedCount > 0 && unmatchedCount > 0 && <span className="mx-2 text-text-secondary opacity-30">|</span>}
                  {unmatchedCount > 0 && <span className="font-bold text-warning">{unmatchedCount} unmatched</span>}
                </div>
              </div>
            </div>
          )}

          {/* Terms */}
          <section className="bg-surface-elevated/10 border border-border rounded-2xl overflow-hidden shadow-inner">
            <div className="px-md py-3 border-b border-border bg-surface-elevated/20 flex items-center justify-between">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Contract Terms</div>
              {isCreated && <Badge variant="neutral" size="sm">Draft Active</Badge>}
            </div>
            <div className="p-md">
              <textarea
                className="w-full bg-surface-elevated border border-border rounded-xl p-md text-sm text-text-primary focus:ring-2 focus:ring-accent/50 outline-none transition-all placeholder:text-text-secondary/30 font-mono"
                rows={4}
                defaultValue={item.terms?.term_text || ''}
                placeholder="Contract terms text..."
                onBlur={e => onUpdateTerms({ ...item.terms, term_text: e.target.value })}
              />
              {isCreated && (
                <div className="mt-md flex justify-end">
                  <Button variant="secondary" size="sm" onClick={onSaveTerms}>Update Terms</Button>
                </div>
              )}
            </div>
          </section>

          {/* Tracks */}
          <section className="bg-surface-elevated/10 border border-border rounded-2xl overflow-hidden shadow-inner">
             <div className="px-md py-3 border-b border-border bg-surface-elevated/20 flex items-center justify-between">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Track Mapping</div>
              <div className="text-[10px] font-bold text-accent">{item.trackIds?.length || 0} Tracks</div>
            </div>
            <div className="p-md">
              <TrackMultiSelect
                selectedIds={item.trackIds || []}
                onChange={onUpdateTracks}
              />
              {isCreated && (
                <div className="mt-md flex justify-end">
                  <Button variant="secondary" size="sm" onClick={onSaveTracks}>Update Tracks</Button>
                </div>
              )}
            </div>
          </section>

          {/* Parties */}
          <section className="bg-surface-elevated/10 border border-border rounded-2xl overflow-hidden shadow-inner">
            <div className="px-md py-3 border-b border-border bg-surface-elevated/20 flex items-center justify-between">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Party Assignment</div>
              <div className="flex gap-2">
                 {/* Create Group Helper Suggestion */}
                 {extractedParties.filter(p => p.is_group_suggestion && !p.suggested_entity_id).map((p, idx) => (
                   <button
                    key={idx}
                    type="button"
                    onClick={() => handleCreateGroup(p.extracted_name)}
                    className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 hover:bg-accent/20 px-2 py-0.5 rounded transition-colors uppercase"
                   >
                     <Users size={10} /> Create Group: {p.extracted_name}
                   </button>
                 ))}
              </div>
            </div>
            <div className="p-md">
              <PartyMultiAssign
                rows={item.parties || []}
                onChangeRows={onUpdateParties}
                onPersist={onSaveParties}
                canPersist={isCreated}
                isPersisting={false}
              />
            </div>
          </section>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex items-center justify-between pt-xl border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isBusy}
          icon={Trash2}
          className="text-danger hover:text-danger hover:bg-danger/10"
        >
          Discard
        </Button>

        <div className="flex items-center gap-md">
          {!isCreated && item.status === 'extracted' && (
            <Button
              variant="primary"
              disabled={isBusy}
              onClick={onCreateDraft}
              className="min-w-[180px] bg-accent"
            >
              Commit to Database
            </Button>
          )}

          {isCreated && (
            <a
              href={`#/contracts/${item.contractId}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm"
            >
              Open Contract Record <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CreatePartyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={(entity) => {
             // Logic to add the newly created entity to the parties list
             const newParty = {
                entity_type: entity.entity_type,
                entity_id: entity.id,
                display_name: entity.display_name || entity.name,
                role: 'artist',
                kind: entity.artist_kind || entity.kind,
             };
             onUpdateParties([...(item.parties || []), newParty]);
          }}
          initialName={modalInitialName}
        />
      )}
    </div>
  );
}
