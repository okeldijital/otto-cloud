import React from 'react';
import { Layout, Clock, Users, FileText, Activity, MoreHorizontal } from 'lucide-react';

const STATUS_COLORS = {
  planning: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  writing: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  recording: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  production: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  mixing: { bg: 'bg-green-500/20', text: 'text-green-400' },
  mastering: { bg: 'bg-lime-500/20', text: 'text-lime-400' },
  artwork: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  marketing: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  distribution: { bg: 'bg-red-500/20', text: 'text-red-400' },
  released: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  archived: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  on_hold: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  inactive: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

const WorkspaceCard = ({ workspace, onClick }) => {
  const statusStyle = STATUS_COLORS[workspace.status] || STATUS_COLORS.planning;
  const templateColor = workspace.template?.color || '#6366f1';
  const TemplateIcon = workspace.template?.icon || 'Layout';

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className="bg-premium-glass border border-white/5 rounded-2xl p-6 cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${templateColor}20`, color: templateColor }}
        >
          <Layout size={20} />
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}>
          {workspace.status}
        </div>
      </div>

      <h3 className="text-base font-bold text-white mb-1.5 truncate group-hover:text-accent transition-colors">
        {workspace.name}
      </h3>

      {workspace.description && (
        <p className="text-sm text-text-secondary line-clamp-2 mb-4">{workspace.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-text-secondary mt-auto">
        {workspace.members && (
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span>{workspace.members.length}</span>
          </div>
        )}
        {workspace._count && (
          <>
            <div className="flex items-center gap-1.5">
              <FileText size={14} />
              <span>{workspace._count.files}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity size={14} />
              <span>{workspace._count.timeline_events}</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <Clock size={14} />
          <span>{formatDate(workspace.updated_at || workspace.created_at)}</span>
        </div>
      </div>

      {workspace.template && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
            {workspace.template.name}
          </span>
        </div>
      )}
    </div>
  );
};

export default WorkspaceCard;
