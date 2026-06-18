import React from 'react';
import { ArrowRight } from 'lucide-react';

const STATUS_LABELS = {
  planning: 'Planning',
  writing: 'Writing',
  recording: 'Recording',
  production: 'Production',
  mixing: 'Mixing',
  mastering: 'Mastering',
  artwork: 'Artwork',
  marketing: 'Marketing',
  distribution: 'Distribution',
  released: 'Released',
  archived: 'Archived',
  active: 'Active',
  on_hold: 'On Hold',
  inactive: 'Inactive',
  concept: 'Concept',
  pre_production: 'Pre-Production',
  post_production: 'Post-Production',
  premiered: 'Premiered',
  reviewing: 'Reviewing',
  completed: 'Completed',
  booking: 'Booking',
  on_tour: 'On Tour',
  negotiation: 'Negotiation',
  editing: 'Editing',
  published: 'Published',
  delivered: 'Delivered',
  'mixing-mastering': 'Mixing/Mastering',
};

const StatusKanban = ({ currentStatus, statuses = [], onStatusChange }) => {
  const allStatuses = statuses.length > 0
    ? statuses
    : Object.entries(STATUS_LABELS).map(([slug, name]) => ({ slug, name }));

  const currentIndex = allStatuses.findIndex((s) => s.slug === currentStatus);

  return (
    <div className="bg-premium-glass border border-white/5 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Progress</h3>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {allStatuses.map((status, index) => {
          const isActive = index === currentIndex;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;

          return (
            <React.Fragment key={status.slug}>
              {index > 0 && (
                <div className={`shrink-0 ${isPast ? 'text-accent' : 'text-white/10'}`}>
                  <ArrowRight size={14} />
                </div>
              )}
              <button
                onClick={() => onStatusChange?.(status.slug)}
                disabled={isFuture}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-accent text-white shadow-glow'
                    : isPast
                    ? 'bg-accent/20 text-accent cursor-pointer hover:bg-accent/30'
                    : 'bg-white/5 text-text-secondary cursor-not-allowed opacity-40'
                }`}
                title={`Move to ${status.name}`}
              >
                {status.name}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StatusKanban;
