import React from 'react';
import { Clock, Upload, UserPlus, CheckCircle, MessageSquare, Activity, GitMerge, AlertCircle } from 'lucide-react';

const EVENT_ICONS = {
  status_change: { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  file_upload: { icon: Upload, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  member_added: { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-500/10' },
  task_completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  approval: { icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  comment: { icon: MessageSquare, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  milestone: { icon: GitMerge, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  system: { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

const TimelineFeed = ({ events = [], loading = false }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2 bg-white/5 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock size={32} className="mx-auto mb-3 text-text-secondary opacity-30" />
        <p className="text-sm text-text-secondary">No activity yet</p>
      </div>
    );
  }

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const grouped = events.reduce((acc, event) => {
    const dateKey = new Date(event.created_at).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateKey, dateEvents]) => (
        <div key={dateKey}>
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            {formatDate(dateKey)}
          </div>
          <div className="space-y-3">
            {dateEvents.map((event) => {
              const eventIcon = EVENT_ICONS[event.event_type] || EVENT_ICONS.system;
              const Icon = eventIcon.icon;
              return (
                <div key={event.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${eventIcon.bg}`}>
                    <Icon size={14} className={eventIcon.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-white font-medium truncate">
                        {event.user?.name && (
                          <span className="font-bold text-accent">{event.user.name}</span>
                        )}{' '}
                        {event.summary}
                      </p>
                      <span className="text-[10px] text-text-secondary shrink-0">
                        {formatTime(event.created_at)}
                      </span>
                    </div>
                    {event.details && (
                      <p className="text-xs text-text-secondary mt-0.5">{event.details}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineFeed;
